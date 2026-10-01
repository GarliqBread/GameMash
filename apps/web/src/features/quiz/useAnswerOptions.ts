import type { QuizAnswerOption } from "@gamemash/games/config";
import type { AnswerOption } from "@gamemash/ui";
import { useIntl } from "react-intl";

export const useAnswerOptions = () => {
  const intl = useIntl();
  return (answers: QuizAnswerOption[]): AnswerOption[] =>
    answers.map(({ shape, text }) => ({
      shape,
      label: text,
      shapeLabel: intl.formatMessage({ id: "setup.shapeName" }, { shape }),
    }));
};
