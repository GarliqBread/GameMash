import {
  type ApiError,
  type ErrorCode,
  normalizePlayerName,
  normalizeRoomCode,
  PLAYER_NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
} from "@gamemash/shared";
import { Button } from "@gamemash/ui";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { saveCredentials } from "../../lib/credentials";
import { toApiError, useErrorMessage } from "../../lib/errors";
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/useMediaQuery";
import { JoinDesktop } from "./JoinDesktop";
import { type JoinFieldErrors, JoinFields } from "./JoinFields";
import { JoinPhone } from "./JoinPhone";
import { JOIN_FORM_ID } from "./join-layout";
import { joinRoom } from "./join-session";

const CODE_ERRORS: ErrorCode[] = ["room_not_found"];
const NAME_ERRORS: ErrorCode[] = ["invalid_name", "name_taken"];

const fieldFor = (error: ApiError): keyof JoinFieldErrors => {
  if (CODE_ERRORS.includes(error.code)) return "code";
  if (NAME_ERRORS.includes(error.code)) return "name";
  return "form";
};

export type JoinScreenProps = {
  initialCode: string;
};

export const JoinScreen = ({ initialCode }: JoinScreenProps) => {
  const intl = useIntl();
  const formatError = useErrorMessage();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<JoinFieldErrors>({});

  const join = useMutation({
    mutationFn: joinRoom,
    onSuccess: (credentials) => {
      saveCredentials(credentials);
      void navigate({ to: "/play/$sessionId", params: { sessionId: credentials.sessionId } });
    },
    onError: (error) => {
      const apiError = toApiError(error);
      setErrors({ [fieldFor(apiError)]: formatError(apiError) });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const roomCode = normalizeRoomCode(code);
    const playerName = normalizePlayerName(name);
    const nextErrors: JoinFieldErrors = {
      code:
        roomCode.length === ROOM_CODE_LENGTH
          ? undefined
          : intl.formatMessage({ id: "join.codeIncomplete" }, { length: ROOM_CODE_LENGTH }),
      name: playerName ? undefined : formatError({ code: "invalid_name", params: { max: PLAYER_NAME_MAX_LENGTH } }),
    };
    setErrors(nextErrors);
    if (nextErrors.code || nextErrors.name) return;
    join.mutate({ roomCode, name: playerName });
  };

  const fields = (
    <JoinFields
      size={isDesktop ? "desktop" : "phone"}
      code={code}
      name={name}
      errors={errors}
      onCodeChange={(value) => {
        setCode(value);
        setErrors((current) => ({ ...current, code: undefined }));
      }}
      onNameChange={(value) => {
        setName(value);
        setErrors((current) => ({ ...current, name: undefined }));
      }}
    />
  );

  const submit = (
    <Button
      size="lg"
      type="submit"
      form={JOIN_FORM_ID}
      disabled={join.isPending}
      className="workshop:h-16 workshop:text-2xl workshop:shadow-brutal-md"
    >
      <FormattedMessage id={join.isPending ? "join.submitting" : "join.submit"} />
    </Button>
  );

  const Layout = isDesktop ? JoinDesktop : JoinPhone;
  return <Layout fields={fields} submit={submit} onSubmit={handleSubmit} />;
};
