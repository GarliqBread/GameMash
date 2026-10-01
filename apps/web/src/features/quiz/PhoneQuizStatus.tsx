import type { QuizPlayerView } from "@gamemash/games/config";
import { ANSWERS, AnswerShape, cn, Heading, Pill } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { type PlayerIdentity, PlayFrame } from "../play/PlayFrame";
import { PhoneQuizProgress } from "./PhoneQuizProgress";

type QuestionView = Extract<QuizPlayerView, { kind: "question" }>;
type RevealView = Extract<QuizPlayerView, { kind: "reveal" }>;

type StatusProps<View> = { me: PlayerIdentity; view: View; status: LobbyStatus };

export const PhoneQuizQuestion = ({ me, view, status }: StatusProps<QuestionView>) => (
  <PlayFrame
    me={me}
    total={view.total}
    status={status}
    header={<PhoneQuizProgress progress={view} />}
    mainClassName="items-center justify-center gap-3 text-center"
  >
    <Heading>
      <FormattedMessage id="play.lookUp" />
    </Heading>
    <p className="text-xl text-fg-muted">
      <FormattedMessage id="quiz.getReady" />
    </p>
  </PlayFrame>
);

const resultId = (view: RevealView) => {
  if (!view.result) return "play.resultMissed";
  return view.result.isCorrect ? "play.resultCorrect" : "play.resultWrong";
};

const resultTone = (view: RevealView) => {
  if (!view.result) return "text-fg-muted";
  return view.result.isCorrect ? "text-success" : "text-danger";
};

export const PhoneQuizReveal = ({ me, view, status }: StatusProps<RevealView>) => {
  const intl = useIntl();
  const { shape, text } = view.correct;
  return (
    <PlayFrame
      me={me}
      total={view.total}
      status={status}
      header={<PhoneQuizProgress progress={view} />}
      mainClassName="items-center justify-center gap-6 text-center"
    >
      <div className="flex flex-col items-center gap-2">
        <Heading className={resultTone(view)}>
          <FormattedMessage id={resultId(view)} />
        </Heading>
        {view.result?.isCorrect && (
          <p className="font-display text-3xl font-extrabold">
            <FormattedMessage id="play.pointsGained" values={{ points: view.result.points }} />
          </p>
        )}
      </div>
      <div className="flex w-full flex-col gap-2">
        <span className="text-fg-subtle">
          <FormattedMessage id="play.theAnswer" />
        </span>
        <div
          className={cn(
            "flex min-w-0 items-center gap-4 rounded-tile px-5 py-4 text-left",
            ANSWERS[shape].bg,
            ANSWERS[shape].fg,
          )}
        >
          <AnswerShape
            shape={shape}
            size={44}
            label={intl.formatMessage({ id: "setup.shapeName" }, { shape })}
            className="shrink-0"
          />
          <span className="min-w-0 font-display text-2xl font-extrabold hyphens-auto wrap-break-word">{text}</span>
        </div>
      </div>
      {view.rank !== null && (
        <Pill variant="surface" size="phone">
          <FormattedMessage id="final.rank" values={{ rank: view.rank }} />
        </Pill>
      )}
    </PlayFrame>
  );
};
