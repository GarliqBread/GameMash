import { POP_QUIZ_QUESTION_KINDS, type QuizQuestion, type QuizQuestionKind } from "@gamemash/games/config";
import { SegmentedControl, SettingsField } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";
import { changeQuestionKind } from "./setup-changes";

export type QuestionKindFieldProps = {
  question: QuizQuestion;
  onChange: (update: (current: QuizQuestion) => QuizQuestion) => void;
};

export const QuestionKindField = ({ question, onChange }: QuestionKindFieldProps) => {
  const intl = useIntl();
  return (
    <SettingsField label={<FormattedMessage id="setup.questionKind" />}>
      {(labelId) => (
        <SegmentedControl<QuizQuestionKind>
          aria-labelledby={labelId}
          value={question.kind}
          className="self-start"
          itemClassName="whitespace-nowrap"
          onValueChange={(kind) =>
            onChange((current) =>
              changeQuestionKind(current, kind, {
                true: intl.formatMessage({ id: "setup.trueAnswer" }),
                false: intl.formatMessage({ id: "setup.falseAnswer" }),
              }),
            )
          }
          options={POP_QUIZ_QUESTION_KINDS.map((kind) => ({
            value: kind,
            label: intl.formatMessage({ id: "setup.questionKindOption" }, { kind }),
          }))}
        />
      )}
    </SettingsField>
  );
};
