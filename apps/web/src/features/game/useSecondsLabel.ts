import { useIntl } from "react-intl";

export const useSecondsLabel = () => {
  const intl = useIntl();
  return (seconds: number) => intl.formatMessage({ id: "quiz.secondsLeft" }, { seconds });
};
