export type PhaseInput = {
  from: string[];
  endsWhenAllSubmitted: boolean;
};

export type Phase = {
  name: string;
  durationMs: number | null;
  input: PhaseInput | null;
};

export type Submission<Input> = {
  input: Input;
  at: number;
};

export type Points = Record<string, number>;

export type PhaseChange<State> = { phase: Phase; state: State; points?: Points } | { phase: null; points?: Points };

export type BeginContext<Config> = {
  config: Config;
  playerIds: string[];
  random: () => number;
};

export type AdvanceContext<Config, State, Input> = {
  config: Config;
  state: State;
  phase: Phase;
  phaseStartedAt: number;
  submissions: Map<string, Submission<Input>>;
  playerIds: string[];
  random: () => number;
};

export type InputContext<Config, State> = {
  config: Config;
  state: State;
  phase: Phase;
  playerId: string;
  input: unknown;
};

export type ViewContext<Config, State, Input> = {
  config: Config;
  state: State;
  phase: Phase;
  phaseStartedAt: number;
  submissions: Map<string, Submission<Input>>;
  totals: Points;
};

export type PlayerViewContext<Config, State, Input> = ViewContext<Config, State, Input> & {
  playerId: string;
  isParticipant: boolean;
};

export type GameRules<Config = unknown, State = unknown, Input = unknown> = {
  type: string;
  parseInput(context: InputContext<Config, State>): Input | null;
  begin(context: BeginContext<Config>): { phase: Phase; state: State };
  advance(context: AdvanceContext<Config, State, Input>): PhaseChange<State>;
  stageView(context: ViewContext<Config, State, Input>): unknown;
  playerView(context: PlayerViewContext<Config, State, Input>): unknown;
};
