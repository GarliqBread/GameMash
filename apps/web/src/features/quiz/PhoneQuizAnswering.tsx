import type { QuizAnswerKey, QuizPlayerView } from "@gamemash/games/config";
import { AnswerButtonGroup, Heading, TimerPill } from "@gamemash/ui";
import { useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useErrorMessage } from "../../lib/errors";
import { type LobbyStatus, submitInput } from "../../lib/lobby";
import { useSecondsLeft } from "../game/useSecondsLeft";
import { useSocketAction } from "../game/useSocketAction";
import { type PlayerIdentity, PlayFrame } from "../play/PlayFrame";
import { PhoneQuizProgress, useAnswerOptions } from "./quiz-display";

type AnsweringView = Extract<QuizPlayerView, { kind: "answering" }>;

export type PhoneQuizAnsweringProps = {
  me: PlayerIdentity;
  view: AnsweringView;
  phaseId: number;
  phaseEndsAt: number | null;
  status: LobbyStatus;
};

export const PhoneQuizAnswering = ({ me, view, phaseId, phaseEndsAt, status }: PhoneQuizAnsweringProps) => {
  const intl = useIntl();

  const answer = useSocketAction(submitInput);
  const toOptions = useAnswerOptions();
  const errorMessage = useErrorMessage();
  const seconds = useSecondsLeft(phaseEndsAt);

  const [picked, setPicked] = useState<QuizAnswerKey | null>(null);
  const selected = view.mine ?? picked ?? undefined;
  const isTimeUp = seconds === 0;
  const error = answer.error && answer.error.code !== "already_submitted" ? answer.error : null;

  const onAnswer = async (shape: QuizAnswerKey) => {
    setPicked(shape);
    const result = await answer.run(phaseId, shape);
    if (!result.ok && result.error.code !== "already_submitted") setPicked(null);
  };

  const header = (
    <>
      <PhoneQuizProgress progress={view} />
      <TimerPill
        seconds={seconds}
        label={intl.formatMessage({ id: "quiz.secondsLeft" }, { seconds })}
        tone={selected || isTimeUp || !view.isParticipant ? "idle" : "active"}
      />
    </>
  );

  if (!view.isParticipant) {
    return (
      <PlayFrame
        me={me}
        total={view.total}
        status={status}
        header={header}
        mainClassName="items-center justify-center gap-3 text-center"
      >
        <Heading>
          <FormattedMessage id="play.lookUp" />
        </Heading>
        <p className="text-xl text-fg-muted">
          <FormattedMessage id="play.notThisRound" />
        </p>
      </PlayFrame>
    );
  }

  return (
    <PlayFrame me={me} total={view.total} status={status} mainClassName="gap-3.5" header={header}>
      <p role="status" className="text-fg-subtle">
        {selected && <FormattedMessage id="play.lockedIn" />}
        {!selected && isTimeUp && <FormattedMessage id="play.timeUp" />}
        {!selected && !isTimeUp && <FormattedMessage id="play.tapShape" />}
      </p>
      {error && (
        <p role="alert" className="text-caption font-bold text-danger">
          {errorMessage(error)}
        </p>
      )}
      <AnswerButtonGroup
        aria-label={intl.formatMessage({ id: "quiz.answerOptions" })}
        options={toOptions(view.answers)}
        selected={selected}
        locked={isTimeUp || answer.isPending}
        onAnswer={(shape) => void onAnswer(shape)}
      />
    </PlayFrame>
  );
};
