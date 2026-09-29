import type { GameRules, Phase, PopQuizConfig } from "@gamemash/games/config";

export const ASK_MS = 1000;

type CountState = { round: number; candidates: string[] };
type Vote = { vote: string };
type CountInput = "right" | "wrong" | Vote;

export type TestRulesOptions = {
  skipFirstPlayer?: boolean;
  endsWhenAllSubmitted?: boolean;
  replaceable?: boolean;
  isDone?: (input: CountInput) => boolean;
  revealMs?: number | null;
};

const isVote = (value: unknown): value is Vote =>
  typeof value === "object" && value !== null && "vote" in value && typeof value.vote === "string";

export const createTestRules = ({
  skipFirstPlayer = false,
  endsWhenAllSubmitted = true,
  replaceable = false,
  isDone,
  revealMs = null,
}: TestRulesOptions = {}): GameRules => {
  const ask = (playerIds: string[]): Phase => ({
    name: "ask",
    durationMs: ASK_MS,
    input: { from: skipFirstPlayer ? playerIds.slice(1) : playerIds, endsWhenAllSubmitted, replaceable },
  });
  const reveal: Phase = { name: "reveal", durationMs: revealMs, input: null, skippable: revealMs !== null };

  const rules: GameRules<PopQuizConfig, CountState, CountInput> = {
    type: "pop-quiz",
    parseInput: ({ state, playerId, input }) => {
      if (input === "right" || input === "wrong") return input;
      return isVote(input) && input.vote !== playerId && state.candidates.includes(input.vote) ? input : null;
    },
    ...(isDone ? { isInputDone: ({ input }: { input: CountInput }) => isDone(input) } : {}),
    begin: ({ playerIds }) => ({ phase: ask(playerIds), state: { round: 0, candidates: playerIds } }),
    advance: ({ config, state, phase, submissions, playerIds }) => {
      if (phase.name === "ask") {
        const points = Object.fromEntries(
          [...submissions].map(([playerId, { input }]) => [playerId, input === "right" ? 100 : 0]),
        );
        return { phase: reveal, state, points };
      }
      const round = state.round + 1;
      return round < config.questions.length
        ? { phase: ask(playerIds), state: { round, candidates: playerIds } }
        : { phase: null };
    },
    stageView: ({ state, submissions }) => ({ round: state.round, answered: submissions.size }),
    playerView: ({ state, submissions, playerId, isParticipant, totals }) => ({
      round: state.round,
      mine: submissions.get(playerId)?.input ?? null,
      isParticipant,
      total: totals[playerId] ?? 0,
    }),
  };
  return rules;
};

export const testRules = createTestRules();
