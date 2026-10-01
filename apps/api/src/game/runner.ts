import type { GameRules, SessionSetup, Submission, UploadViewer } from "@gamemash/games/config";
import type { GameSnapshot, GameStanding } from "@gamemash/shared";
import { Type } from "typebox";
import { parseJson } from "../json.js";
import { createNotifier } from "../lobby/notifier.js";
import { sessionExpiresAt } from "../sessions/expiry.js";
import type { SessionRecord, SessionStore, SubmitInputResult } from "../sessions/store.js";
import {
  advanceState,
  type EngineState,
  EngineStateSchema,
  enterGame,
  type PlayingState,
  participantsOf,
  type RulesRegistry,
  rulesFor,
  type TransitionContext,
} from "./engine.js";

type GameLogger = {
  error: (details: Record<string, unknown>, message: string) => void;
};

export type GameRunnerDeps = {
  store: SessionStore;
  readSetup: (sessionId: string) => Promise<SessionSetup>;
  rules: GameRules[];
  log: GameLogger;
  now?: (() => number) | undefined;
  random?: (() => number) | undefined;
};

export type UploadResult = "accepted" | "closed" | "invalid";

export type UploadRead = { access: "denied" } | { access: "allowed"; payload: string | null };

const DENIED: UploadRead = { access: "denied" };

export type GameSnapshots = {
  host: GameSnapshot;
  players: Map<string, GameSnapshot>;
};

type StoredGame = { version: number; state: EngineState };

type Loaded = { session: SessionRecord; setup: SessionSetup; game: StoredGame | null };

type PlayingGame = { version: number; state: PlayingState };

type ActiveGame = { rules: GameRules; config: unknown; state: PlayingState };

const StoredSubmissionSchema = Type.Object({ input: Type.Unknown(), at: Type.Number() });

const parseState = (json: string) => parseJson(EngineStateSchema, json);

const parseInput = ({ rules, config, state }: ActiveGame, playerId: string, input: unknown) =>
  rules.parseInput({ config, state: state.game, phase: state.phase, playerId, input });

const parseSubmission = (json: string, active: ActiveGame, playerId: string): Submission<unknown> | null => {
  const stored = parseJson(StoredSubmissionSchema, json);
  if (!stored) return null;
  try {
    const input = parseInput(active, playerId, stored.input);
    return input === null ? null : { input, at: stored.at };
  } catch {
    return null;
  }
};

const standingsOf = (state: EngineState): GameStanding[] =>
  Object.entries(state.totals)
    .map(([playerId, points]) => ({ playerId, points }))
    .toSorted((a, b) => b.points - a.points);

export const createGameRunner = ({
  store,
  readSetup,
  rules,
  log,
  now = Date.now,
  random = Math.random,
}: GameRunnerDeps) => {
  const registry: RulesRegistry = new Map(rules.map((entry) => [entry.type, entry]));
  const notifier = createNotifier();
  const timers = new Map<string, NodeJS.Timeout>();
  const queues = new Map<string, Promise<unknown>>();
  const setups = new Map<string, SessionSetup>();
  const running = new Set<string>();

  const serialize = <T>(sessionId: string, task: () => Promise<T>): Promise<T> => {
    const run = (queues.get(sessionId) ?? Promise.resolve()).then(task);
    const tail = run.catch(() => undefined);
    queues.set(sessionId, tail);
    void tail.then(() => {
      if (queues.get(sessionId) === tail) queues.delete(sessionId);
    });
    return run;
  };

  const setupOf = async (sessionId: string) => {
    const cached = setups.get(sessionId);
    if (cached) return cached;
    const setup = await readSetup(sessionId);
    if (running.has(sessionId)) setups.set(sessionId, setup);
    return setup;
  };

  const load = async (sessionId: string): Promise<Loaded | null> => {
    const [session, record] = await Promise.all([store.findById(sessionId), store.getGame(sessionId)]);
    if (session?.status !== "playing") return null;
    const setup = await setupOf(sessionId);
    if (!record) return { session, setup, game: null };
    const state = parseState(record.state);
    if (!state) {
      log.error({ sessionId }, "stored game state failed validation");
      return null;
    }
    return { session, setup, game: { version: record.version, state } };
  };

  const activeGame = (setup: SessionSetup, state: PlayingState): ActiveGame | null => {
    const found = rulesFor(setup, registry, state.gameIndex);
    return found ? { ...found, state } : null;
  };

  const readSubmissions = async (sessionId: string, active: ActiveGame | null) => {
    const inputs = await store.listInputs(sessionId);
    if (!active) return new Map<string, Submission<unknown>>();
    return new Map(
      [...inputs].flatMap(([playerId, json]) => {
        const submission = parseSubmission(json, active, playerId);
        return submission ? [[playerId, submission] as [string, Submission<unknown>]] : [];
      }),
    );
  };

  const clearTimer = (sessionId: string) => {
    clearTimeout(timers.get(sessionId));
    timers.delete(sessionId);
  };

  const transitionContext = async (sessionId: string, setup: SessionSetup): Promise<TransitionContext> => ({
    setup,
    registry,
    playerIds: (await store.listPlayers(sessionId)).map((player) => player.id),
    now: now(),
    random,
  });

  const schedule = (sessionId: string, { version, state }: StoredGame) => {
    clearTimer(sessionId);
    if (!running.has(sessionId) || state.status !== "playing" || state.phaseEndsAt === null) return;
    const timer = setTimeout(
      () => {
        timers.delete(sessionId);
        void advance(sessionId, version).catch((error: unknown) =>
          log.error({ err: error, sessionId }, "failed to advance game on timer"),
        );
      },
      Math.max(0, state.phaseEndsAt - now()),
    );
    timer.unref();
    timers.set(sessionId, timer);
  };

  const commit = async (session: SessionRecord, expected: number | null, state: EngineState) => {
    const result = await store.saveGame(
      session.id,
      expected,
      JSON.stringify(state),
      sessionExpiresAt(session.createdAt, now()),
      state.status === "playing" && state.phase.input?.via === "upload",
    );
    if (result !== "saved") return false;
    schedule(session.id, { version: (expected ?? 0) + 1, state });
    notifier.notify(session.id);
    return true;
  };

  const beginLoaded = async ({ session, setup }: Loaded, expected: number | null) =>
    commit(session, expected, enterGame(0, {}, await transitionContext(session.id, setup)));

  const advanceLoaded = async ({ session, setup }: Loaded, { version, state }: PlayingGame) => {
    const submissions = await readSubmissions(session.id, activeGame(setup, state));
    const next = advanceState(state, submissions, await transitionContext(session.id, setup));
    return commit(session, version, next);
  };

  const loadPlaying = async (sessionId: string) => {
    const loaded = await load(sessionId);
    const game = loaded?.game;
    if (!loaded || !game || game.state.status !== "playing") return null;
    return { loaded, game: { version: game.version, state: game.state } };
  };

  const withPlaying = async (
    sessionId: string,
    version: number,
    action: (loaded: Loaded, game: PlayingGame) => Promise<boolean>,
  ) => {
    const current = await loadPlaying(sessionId);
    if (!current || current.game.version !== version) return false;
    return action(current.loaded, current.game);
  };

  const advance = (sessionId: string, version: number) =>
    serialize(sessionId, () => withPlaying(sessionId, version, advanceLoaded));

  const begin = (sessionId: string, restart = false) =>
    serialize(sessionId, async () => {
      const loaded = await load(sessionId);
      if (!loaded) return false;
      running.add(sessionId);
      const { game } = loaded;
      if (!game) return beginLoaded(loaded, null);
      if (restart && game.state.status === "finished") return beginLoaded(loaded, game.version);
      return true;
    });

  const reset = (sessionId: string) =>
    serialize(sessionId, async () => {
      const record = await store.getGame(sessionId);
      if (!record || parseState(record.state)?.status !== "finished") return false;
      if (!(await store.resetGame(sessionId, record.version))) return false;
      forget(sessionId);
      return true;
    });

  const resume = (sessionId: string) =>
    serialize(sessionId, async () => {
      if (running.has(sessionId)) return;
      const loaded = await load(sessionId);
      if (!loaded) return;
      running.add(sessionId);
      if (loaded.game) schedule(sessionId, loaded.game);
      else await beginLoaded(loaded, null);
    });

  const canHostAdvance = (phase: PlayingState["phase"]) => phase.durationMs === null || phase.skippable === true;

  const next = (sessionId: string, phaseId: number) =>
    serialize(sessionId, () =>
      withPlaying(sessionId, phaseId, (loaded, game) =>
        canHostAdvance(game.state.phase) ? advanceLoaded(loaded, game) : Promise.resolve(false),
      ),
    );

  const isDone = (active: ActiveGame, playerId: string, submission: Submission<unknown> | undefined) => {
    if (!submission) return false;
    const { rules: gameRules, config, state } = active;
    return (
      gameRules.isInputDone?.({ config, state: state.game, phase: state.phase, playerId, input: submission.input }) ??
      true
    );
  };

  const isEveryoneDone = async (loaded: Loaded, state: PlayingState, connected: Set<string>) => {
    if (state.phase.input?.endsWhenAllSubmitted !== true) return false;
    const present = participantsOf(state).filter((playerId) => connected.has(playerId));
    const active = activeGame(loaded.setup, state);
    if (present.length === 0 || !active) return false;
    const submissions = await readSubmissions(loaded.session.id, active);
    return present.every((playerId) => isDone(active, playerId, submissions.get(playerId)));
  };

  const endEarlyIfDone = async (loaded: Loaded, game: PlayingGame, connected: Set<string>) =>
    (await isEveryoneDone(loaded, game.state, connected)) && advanceLoaded(loaded, game);

  const openPhase = async (sessionId: string, playerId: string, phaseId: number, at: number) => {
    const current = await loadPlaying(sessionId);
    if (!current || current.game.version !== phaseId) return null;
    const { phaseEndsAt } = current.game.state;
    const isOpen = participantsOf(current.game.state).includes(playerId) && (phaseEndsAt === null || at <= phaseEndsAt);
    const active = activeGame(current.loaded.setup, current.game.state);
    return isOpen && active ? { ...current, active } : null;
  };

  type OpenPhase = NonNullable<Awaited<ReturnType<typeof openPhase>>>;

  const previousSubmission = async (sessionId: string, active: ActiveGame, playerId: string) => {
    const json = (await store.listInputs(sessionId)).get(playerId);
    return json === undefined ? undefined : (parseSubmission(json, active, playerId) ?? undefined);
  };

  const record = async (
    { loaded, game, active }: OpenPhase,
    playerId: string,
    input: unknown,
    at: number,
    connected: Set<string>,
  ) => {
    const previous = await previousSubmission(loaded.session.id, active, playerId);
    const result = await store.submitInput(
      loaded.session.id,
      game.version,
      playerId,
      JSON.stringify({ input, at }),
      sessionExpiresAt(loaded.session.createdAt, at),
      game.state.phase.input?.replaceable === true,
    );
    if (result !== "accepted") return result;
    const isChange = !previous || isDone(active, playerId, previous) !== isDone(active, playerId, { input, at });
    if (!isChange) return result;
    notifier.notify(loaded.session.id);
    await endEarlyIfDone(loaded, game, connected);
    return result;
  };

  const submit = (
    sessionId: string,
    playerId: string,
    phaseId: number,
    input: unknown,
    connected: Set<string>,
  ): Promise<SubmitInputResult> =>
    serialize(sessionId, async () => {
      const at = now();
      const open = await openPhase(sessionId, playerId, phaseId, at);
      if (!open || open.game.state.phase.input?.via === "upload") return "closed";
      const parsed = parseInput(open.active, playerId, input);
      if (parsed === null) return "closed";
      return record(open, playerId, parsed, at, connected);
    });

  const upload = (
    sessionId: string,
    playerId: string,
    phaseId: number,
    body: unknown,
    connected: Set<string>,
  ): Promise<UploadResult> =>
    serialize(sessionId, async () => {
      const at = now();
      const open = await openPhase(sessionId, playerId, phaseId, at);
      if (open?.game.state.phase.input?.via !== "upload") return "closed";
      const { rules: gameRules, config, state } = open.active;
      const parsed = gameRules.parseUpload?.({
        config,
        state: state.game,
        phase: state.phase,
        playerId,
        input: body,
      });
      if (!parsed) return "invalid";
      const expiresAt = sessionExpiresAt(open.loaded.session.createdAt, at);
      const saved = await store.saveUpload(sessionId, phaseId, playerId, JSON.stringify(parsed.payload), expiresAt);
      if (saved !== "saved") return "closed";
      const result = await record(open, playerId, parsed.input, at, connected);
      return result === "accepted" ? "accepted" : "closed";
    });

  const readUpload = async (sessionId: string, viewer: UploadViewer, id: string): Promise<UploadRead> => {
    const current = await loadPlaying(sessionId);
    const active = current && activeGame(current.loaded.setup, current.game.state);
    if (!active) return DENIED;
    const owner = active.rules.uploadOwner?.({
      config: active.config,
      state: active.state.game,
      phase: active.state.phase,
      viewer,
      id,
    });
    return owner ? { access: "allowed", payload: await store.getUpload(sessionId, owner) } : DENIED;
  };

  const settle = (sessionId: string, connected: Set<string>) =>
    serialize(sessionId, async () => {
      const current = await loadPlaying(sessionId);
      return current ? endEarlyIfDone(current.loaded, current.game, connected) : false;
    });

  const snapshots = async (sessionId: string, playerIds: string[]): Promise<GameSnapshots | null> => {
    const loaded = await load(sessionId);
    const game = loaded?.game;
    if (!loaded || !game) return null;
    const { version, state } = game;
    const serverNow = now();

    if (state.status === "finished") {
      const finished: GameSnapshot = { status: "finished", phaseId: version, serverNow, standings: standingsOf(state) };
      return { host: finished, players: new Map(playerIds.map((playerId) => [playerId, finished])) };
    }

    const active = activeGame(loaded.setup, state);
    if (!active) return null;
    const { rules: gameRules, config } = active;
    const participants = participantsOf(state);
    const context = {
      config,
      state: state.game,
      phase: state.phase,
      phaseStartedAt: state.phaseStartedAt,
      submissions: await readSubmissions(sessionId, active),
      totals: state.totals,
    };
    const envelope = {
      status: "playing" as const,
      phaseId: version,
      gameIndex: state.gameIndex,
      gameCount: loaded.setup.games.length,
      gameType: gameRules.type,
      phase: state.phase.name,
      phaseEndsAt: state.phaseEndsAt,
      waitsForHost: state.phase.durationMs === null,
      canSkip: state.phase.durationMs !== null && state.phase.skippable === true,
      serverNow,
    };
    return {
      host: { ...envelope, view: gameRules.stageView(context) },
      players: new Map(
        playerIds.map((playerId) => [
          playerId,
          {
            ...envelope,
            view: gameRules.playerView({
              ...context,
              playerId,
              isParticipant: participants.includes(playerId),
            }),
          },
        ]),
      ),
    };
  };

  const forget = (sessionId: string) => {
    running.delete(sessionId);
    clearTimer(sessionId);
    setups.delete(sessionId);
  };

  const close = () => {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    setups.clear();
    running.clear();
  };

  return {
    begin,
    reset,
    resume,
    next,
    submit,
    upload,
    readUpload,
    settle,
    snapshots,
    forget,
    close,
    subscribe: notifier.subscribe,
  };
};

export type GameRunner = ReturnType<typeof createGameRunner>;
