import type { GameRules, Phase, Points, SessionSetup, Submission } from "@gamemash/games/config";
import { type Static, Type } from "typebox";

const PhaseSchema = Type.Object({
  name: Type.String(),
  durationMs: Type.Union([Type.Number(), Type.Null()]),
  input: Type.Union([
    Type.Object({
      from: Type.Array(Type.String()),
      endsWhenAllSubmitted: Type.Boolean(),
      replaceable: Type.Optional(Type.Boolean()),
      via: Type.Optional(Type.Literal("upload")),
    }),
    Type.Null(),
  ]),
  skippable: Type.Optional(Type.Boolean()),
});

const PointsSchema = Type.Record(Type.String(), Type.Number());

const PlayingStateSchema = Type.Object({
  status: Type.Literal("playing"),
  gameIndex: Type.Integer({ minimum: 0 }),
  phase: PhaseSchema,
  phaseStartedAt: Type.Number(),
  phaseEndsAt: Type.Union([Type.Number(), Type.Null()]),
  totals: PointsSchema,
  game: Type.Unknown(),
});

const FinishedStateSchema = Type.Object({
  status: Type.Literal("finished"),
  totals: PointsSchema,
});

export const EngineStateSchema = Type.Union([PlayingStateSchema, FinishedStateSchema]);
export type EngineState = Static<typeof EngineStateSchema>;
export type PlayingState = Static<typeof PlayingStateSchema>;

export type RulesRegistry = Map<string, GameRules>;

export type TransitionContext = {
  setup: SessionSetup;
  registry: RulesRegistry;
  playerIds: string[];
  now: number;
  random: () => number;
};

const addPoints = (totals: Points, points: Points = {}): Points => {
  const merged = new Map(Object.entries(totals));
  for (const [playerId, value] of Object.entries(points)) {
    if (Number.isFinite(value)) merged.set(playerId, (merged.get(playerId) ?? 0) + value);
  }
  return Object.fromEntries(merged);
};

const enterPhase = (
  gameIndex: number,
  phase: Phase,
  game: unknown,
  totals: Points,
  { now }: TransitionContext,
): PlayingState => ({
  status: "playing",
  gameIndex,
  phase,
  phaseStartedAt: now,
  phaseEndsAt: phase.durationMs === null ? null : now + phase.durationMs,
  totals,
  game,
});

export const participantsOf = (state: PlayingState) => state.phase.input?.from ?? [];

export const rulesFor = (setup: SessionSetup, registry: RulesRegistry, gameIndex: number) => {
  const game = setup.games[gameIndex];
  const rules = game ? registry.get(game.type) : undefined;
  return game && rules ? { rules, config: game.config } : null;
};

export const enterGame = (fromIndex: number, totals: Points, context: TransitionContext): EngineState => {
  for (let gameIndex = fromIndex; gameIndex < context.setup.games.length; gameIndex += 1) {
    const found = rulesFor(context.setup, context.registry, gameIndex);
    if (!found) continue;
    const { phase, state } = found.rules.begin({
      config: found.config,
      playerIds: context.playerIds,
      random: context.random,
    });
    return enterPhase(gameIndex, phase, state, totals, context);
  }
  return { status: "finished", totals };
};

export const advanceState = (
  current: PlayingState,
  submissions: Map<string, Submission<unknown>>,
  context: TransitionContext,
): EngineState => {
  const found = rulesFor(context.setup, context.registry, current.gameIndex);
  if (!found) return enterGame(current.gameIndex + 1, current.totals, context);
  const change = found.rules.advance({
    config: found.config,
    state: current.game,
    phase: current.phase,
    phaseStartedAt: current.phaseStartedAt,
    submissions,
    playerIds: context.playerIds,
    random: context.random,
  });
  const totals = addPoints(current.totals, change.points);
  if (change.phase === null) return enterGame(current.gameIndex + 1, totals, context);
  return enterPhase(current.gameIndex, change.phase, change.state, totals, context);
};
