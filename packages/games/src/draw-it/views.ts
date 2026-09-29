export type DrawItProgress = {
  roundIndex: number;
  roundCount: number;
  word: string;
};

export type DrawItResultEntry = {
  drawingId: string;
  playerId: string;
  rank: number;
  average: number | null;
  ratingCount: number;
  points: number;
};

export type DrawItStageView =
  | (DrawItProgress & { kind: "draw"; participantIds: string[]; doneIds: string[]; drawSeconds: number })
  | (DrawItProgress & {
      kind: "rate";
      drawingIds: string[];
      finishedCount: number;
      participantCount: number;
      rateSeconds: number;
    })
  | (DrawItProgress & { kind: "results"; entries: DrawItResultEntry[]; ratingCount: number });

export type DrawItPlayerResult = {
  rank: number;
  average: number | null;
  points: number;
};

export type DrawItPlayerView =
  | (DrawItProgress & { kind: "draw"; isParticipant: boolean; isDone: boolean; drawSeconds: number; total: number })
  | (DrawItProgress & {
      kind: "rate";
      isParticipant: boolean;
      toRate: string[];
      mine: Record<string, number>;
      total: number;
    })
  | (DrawItProgress & { kind: "results"; result: DrawItPlayerResult | null; total: number; rank: number });
