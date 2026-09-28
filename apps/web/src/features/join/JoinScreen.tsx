import {
  type ApiError,
  type ErrorCode,
  normalizePlayerName,
  normalizeRoomCode,
  PLAYER_NAME_MAX_LENGTH,
  ROOM_CODE_LENGTH,
} from "@gamemash/shared";
import {
  Button,
  Heading,
  Logo,
  PhoneShell,
  PhotoPickerButton,
  RoomCodeInput,
  TextField,
  TrustNote,
} from "@gamemash/ui";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { saveCredentials } from "../../lib/credentials";
import { toApiError, useErrorMessage } from "../../lib/errors";
import { joinWithPhoto } from "./join-session";
import { usePhotoPicker } from "./usePhotoPicker";

type FieldErrors = {
  code?: string | undefined;
  name?: string | undefined;
  form?: string | undefined;
};

const CODE_ERRORS: ErrorCode[] = ["room_not_found"];
const NAME_ERRORS: ErrorCode[] = ["invalid_name", "name_taken"];

const fieldFor = (error: ApiError): keyof FieldErrors => {
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
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const { photo, select } = usePhotoPicker();

  const join = useMutation({
    mutationFn: joinWithPhoto,
    onSuccess: ({ credentials, isPhotoFailed }) => {
      saveCredentials(credentials);
      void navigate({
        to: "/play/$sessionId",
        params: { sessionId: credentials.sessionId },
        search: isPhotoFailed ? { photo: "failed" } : {},
      });
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
    const nextErrors: FieldErrors = {
      code:
        roomCode.length === ROOM_CODE_LENGTH
          ? undefined
          : intl.formatMessage({ id: "join.codeIncomplete" }, { length: ROOM_CODE_LENGTH }),
      name: playerName ? undefined : formatError({ code: "invalid_name", params: { max: PLAYER_NAME_MAX_LENGTH } }),
    };
    setErrors(nextErrors);
    if (nextErrors.code || nextErrors.name || photo.status === "processing") return;
    join.mutate({ roomCode, name: playerName, avatar: photo.status === "ready" ? photo.blob : null });
  };

  const isBusy = join.isPending || photo.status === "processing";

  return (
    <PhoneShell
      theme="paper"
      mainClassName="gap-7"
      header={<Logo />}
      footer={
        <div className="flex flex-col gap-4">
          <TrustNote>
            <FormattedMessage id="join.trust" />
          </TrustNote>
          <Link to="/host" className="focus-ring self-start text-caption text-fg-subtle underline">
            <FormattedMessage id="join.hostLink" />
          </Link>
        </div>
      }
      bottomAction={
        <Button size="lg" type="submit" form="join" disabled={isBusy}>
          <FormattedMessage id={join.isPending ? "join.submitting" : "join.submit"} />
        </Button>
      }
    >
      <Heading>
        <FormattedMessage id="join.title" />
      </Heading>
      <form id="join" noValidate className="flex flex-col gap-[22px]" onSubmit={handleSubmit}>
        <RoomCodeInput
          label={<FormattedMessage id="join.codeLabel" />}
          description={<FormattedMessage id="join.codeDescription" />}
          value={code}
          onValueChange={(value) => {
            setCode(value);
            setErrors((current) => ({ ...current, code: undefined }));
          }}
          error={errors.code}
          length={ROOM_CODE_LENGTH}
        />
        <TextField
          label={<FormattedMessage id="join.nameLabel" />}
          placeholder={intl.formatMessage({ id: "join.namePlaceholder" })}
          autoComplete="nickname"
          maxLength={PLAYER_NAME_MAX_LENGTH}
          value={name}
          onValueChange={(value) => {
            setName(value);
            setErrors((current) => ({ ...current, name: undefined }));
          }}
          error={errors.name}
        />
        <div className="flex flex-col gap-2">
          <PhotoPickerButton
            label={
              <>
                <FormattedMessage id="join.photoLabel" />{" "}
                <span className="font-normal text-fg-subtle">
                  <FormattedMessage id="join.photoOptional" />
                </span>
              </>
            }
            hint={<FormattedMessage id={photo.status === "processing" ? "join.photoProcessing" : "join.photoHint"} />}
            previewSrc={photo.status === "ready" ? photo.previewUrl : undefined}
            onFileSelect={(file) => void select(file)}
            disabled={join.isPending}
          />
          {photo.status === "failed" && (
            <p role="alert" className="text-caption font-bold text-danger">
              <FormattedMessage id="join.photoFailed" />
            </p>
          )}
        </div>
        {errors.form && (
          <p role="alert" className="text-body font-bold text-danger">
            {errors.form}
          </p>
        )}
      </form>
    </PhoneShell>
  );
};
