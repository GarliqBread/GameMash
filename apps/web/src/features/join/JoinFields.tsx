import { PLAYER_NAME_MAX_LENGTH, ROOM_CODE_LENGTH } from "@gamemash/shared";
import { RoomCodeInput, TextField } from "@gamemash/ui";
import { FormattedMessage, useIntl } from "react-intl";

export type JoinFieldErrors = {
  code?: string | undefined;
  name?: string | undefined;
  form?: string | undefined;
};

export type JoinFieldsProps = {
  size: "phone" | "desktop";
  code: string;
  name: string;
  errors: JoinFieldErrors;
  onCodeChange: (code: string) => void;
  onNameChange: (name: string) => void;
};

export const JoinFields = ({ size, code, name, errors, onCodeChange, onNameChange }: JoinFieldsProps) => {
  const intl = useIntl();
  return (
    <>
      <RoomCodeInput
        size={size}
        label={<FormattedMessage id="join.codeLabel" />}
        description={<FormattedMessage id="join.codeDescription" />}
        value={code}
        onValueChange={onCodeChange}
        letterLabel={(position, length) => intl.formatMessage({ id: "join.codeLetter" }, { position, length })}
        error={errors.code}
        length={ROOM_CODE_LENGTH}
      />
      <TextField
        label={<FormattedMessage id="join.nameLabel" />}
        placeholder={intl.formatMessage({ id: "join.namePlaceholder" })}
        autoComplete="nickname"
        maxLength={PLAYER_NAME_MAX_LENGTH}
        value={name}
        onValueChange={onNameChange}
        error={errors.name}
        className={size === "phone" ? "mt-2" : "mt-2.5"}
        controlClassName="workshop:h-14 workshop:rounded-control workshop:shadow-none"
      />
      {errors.form && (
        <p role="alert" className="text-body font-bold text-danger">
          {errors.form}
        </p>
      )}
    </>
  );
};
