import { type ApiError, errorMessageId } from "@gamemash/shared";
import { useIntl } from "react-intl";
import { ApiRequestError } from "./api";

export const toApiError = (error: unknown): ApiError =>
  error instanceof ApiRequestError ? error.error : { code: "internal_error" };

export const useErrorMessage = () => {
  const intl = useIntl();
  return (error: ApiError) => intl.formatMessage({ id: errorMessageId(error.code) }, error.params);
};
