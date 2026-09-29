export type PhaseInput = {
  from: string[];
  endsWhenAllSubmitted: boolean;
  replaceable?: boolean;
  via?: "upload";
};

export type Phase = {
  name: string;
  durationMs: number | null;
  input: PhaseInput | null;
  skippable?: boolean;
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

export type DoneContext<Config, State, Input> = {
  config: Config;
  state: State;
  phase: Phase;
  playerId: string;
  input: Input;
};

export type UploadContext<Config, State> = InputContext<Config, State>;

export type ParsedUpload<Input> = { input: Input; payload: unknown };

export type UploadViewer = { kind: "host" } | { kind: "player"; playerId: string };

export type UploadAccessContext<Config, State> = {
  config: Config;
  state: State;
  phase: Phase;
  viewer: UploadViewer;
  id: string;
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
  isInputDone?(context: DoneContext<Config, State, Input>): boolean;
  parseUpload?(context: UploadContext<Config, State>): ParsedUpload<Input> | null;
  uploadOwner?(context: UploadAccessContext<Config, State>): string | null;
  begin(context: BeginContext<Config>): { phase: Phase; state: State };
  advance(context: AdvanceContext<Config, State, Input>): PhaseChange<State>;
  stageView(context: ViewContext<Config, State, Input>): unknown;
  playerView(context: PlayerViewContext<Config, State, Input>): unknown;
};
