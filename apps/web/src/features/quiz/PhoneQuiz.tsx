import type { QuizPlayerView } from "@gamemash/games/config";
import type { PhoneGameProps } from "../games/game-views";
import { PhoneQuizAnswering } from "./PhoneQuizAnswering";
import { PhoneQuizQuestion, PhoneQuizReveal } from "./PhoneQuizStatus";

export const PhoneQuiz = ({ me, snapshot, view, status }: PhoneGameProps<QuizPlayerView>) => {
  if (view.kind === "question") return <PhoneQuizQuestion me={me} view={view} status={status} />;
  if (view.kind === "reveal") return <PhoneQuizReveal me={me} view={view} status={status} />;
  return (
    <PhoneQuizAnswering
      key={snapshot.phaseId}
      me={me}
      view={view}
      phaseId={snapshot.phaseId}
      phaseEndsAt={snapshot.phaseEndsAt}
      status={status}
    />
  );
};
