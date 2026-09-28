import type { GameRules, SessionSetup, Submission } from "@gamemash/games/config";
import type { GameSnapshot, GameStanding } from "@gamemash/shared";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { createLobbyNotifier } from "../lobby/notifier.js";
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

export type GameLogger = {
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

export type GameSnapshots = {
  host: GameSnapshot;
  players: Map<string, GameSnapshot>;
};

type StoredGame = { version: number; state: EngineState };

type Loaded = { session: SessionRecord; setup: SessionSetup; game: StoredGame | null };

type PlayingGame = { version: number; state: PlayingState };

type ActiveGame = { rules: GameRules; config: unknown; state: PlayingState };

const StoredSubmissionSchema = Type.Object({ input: Type.Unknown(), at: Type.Number() });

const parseState = (json: string): EngineState | null => {
  try {
    const value: unknown = JSON.parse(json);
    return Value.Check(EngineStateSchema, value) ? value : null;
  } catch {
    return null;
  }
};

const parseInput = ({ rules, config, state }: ActiveGame, playerId: string, input: unknown) =>
  rules.parseInput({ config, state: state.game, phase: state.phase, playerId, input });

const parseSubmission = (json: string, active: ActiveGame, playerId: string): Submission<unknown> | null => {
  try {
    const value: unknown = JSON.parse(json);
    if (!Value.Check(StoredSubmissionSchema, value)) return null;
    const input = parseInput(active, playerId, value.input);
    return input === null ? null : { input, at: value.at };
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
  const notifier = createLobbyNotifier();
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
    );
    if (result !== "saved") return false;
    schedule(session.id, { version: (expected ?? 0) + 1, state });
    notifier.notify(session.id);
    return true;
  };

  const beginLoaded = async ({ session, setup }: Loaded) =>
    commit(session, null, enterGame(0, {}, await transitionContext(session.id, setup)));

  const advanceLoaded = async ({ session, setup }: Loaded, { version, state }: PlayingGame) => {
    const submissions = await readSubmissions(session.id, activeGame(setup, state));
    const next = advanceState(state, submissions, await transitionContext(session.id, setup));
    return commit(session, version, next);
  };

  const withPlaying = async (
    sessionId: string,
    version: number,
    action: (loaded: Loaded, game: PlayingGame) => Promise<boolean>,
  ) => {
    const loaded = await load(sessionId);
    const game = loaded?.game;
    if (!loaded || !game || game.version !== version || game.state.status !== "playing") return false;
    return action(loaded, { version: game.version, state: game.state });
  };

  const loadPlaying = async (sessionId: string) => {
    const loaded = await load(sessionId);
    const game = loaded?.game;
    if (!loaded || !game || game.state.status !== "playing") return null;
    return { loaded, game: { version: game.version, state: game.state } };
  };

  const advance = (sessionId: string, version: number) =>
    serialize(sessionId, () => withPlaying(sessionId, version, advanceLoaded));

  const begin = (sessionId: string) =>
    serialize(sessionId, async () => {
      const loaded = await load(sessionId);
      if (!loaded) return false;
      running.add(sessionId);
      return loaded.game !== null || beginLoaded(loaded);
    });

  const resume = (sessionId: string) =>
    serialize(sessionId, async () => {
      if (running.has(sessionId)) return;
      const loaded = await load(sessionId);
      if (!loaded) return;
      running.add(sessionId);
      if (loaded.game) schedule(sessionId, loaded.game);
      else await beginLoaded(loaded);
    });

  const next = (sessionId: string, phaseId: number) =>
    serialize(sessionId, () =>
      withPlaying(sessionId, phaseId, (loaded, game) =>
        game.state.phase.durationMs === null ? advanceLoaded(loaded, game) : Promise.resolve(false),
      ),
    );

  const isEveryoneDone = async (sessionId: string, state: PlayingState, connected: Set<string>) => {
    if (state.phase.input?.endsWhenAllSubmitted !== true) return false;
    const present = participantsOf(state).filter((playerId) => connected.has(playerId));
    if (present.length === 0) return false;
    const inputs = await store.listInputs(sessionId);
    return present.every((playerId) => inputs.has(playerId));
  };

  const endEarlyIfDone = async (loaded: Loaded, game: PlayingGame, connected: Set<string>) =>
    (await isEveryoneDone(loaded.session.id, game.state, connected)) && advanceLoaded(loaded, game);

  const submit = (
    sessionId: string,
    playerId: string,
    phaseId: number,
    input: unknown,
    connected: Set<string>,
  ): Promise<SubmitInputResult> =>
    serialize(sessionId, async () => {
      const current = await loadPlaying(sessionId);
      if (!current || current.game.version !== phaseId) return "closed";
      const { loaded, game } = current;
      const at = now();
      const { phaseEndsAt } = game.state;
      const isOpen = participantsOf(game.state).includes(playerId) && (phaseEndsAt === null || at <= phaseEndsAt);
      const active = activeGame(loaded.setup, game.state);
      const parsed = isOpen && active ? parseInput(active, playerId, input) : null;
      if (parsed === null) return "closed";

      const result = await store.submitInput(
        sessionId,
        phaseId,
        playerId,
        JSON.stringify({ input: parsed, at }),
        sessionExpiresAt(loaded.session.createdAt, at),
      );
      if (result !== "accepted") return result;
      notifier.notify(sessionId);
      await endEarlyIfDone(loaded, game, connected);
      return result;
    });

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

  return { begin, resume, next, submit, settle, snapshots, forget, close, subscribe: notifier.subscribe };
};

export type GameRunner = ReturnType<typeof createGameRunner>;
