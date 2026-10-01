import { SESSION_NAME_MAX_LENGTH } from "@gamemash/games/config";
import { stripHiddenCharacters } from "@gamemash/shared";
import { Button, PlayIcon, TextField } from "@gamemash/ui";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { saveCredentials } from "../../lib/credentials";
import { toApiError, useErrorMessage } from "../../lib/errors";
import { createSession } from "../../lib/sessions";
import { useEntryLayout } from "../entry/useEntryLayout";
import { HostDesktop } from "./HostDesktop";
import { HostPhone } from "./HostPhone";

const FORM_ID = "host";
const STEP_IDS = ["host.step1", "host.step2", "host.step3"];
const LAYOUTS = { desktop: HostDesktop, phone: HostPhone };

export const HostScreen = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const formatError = useErrorMessage();
  const { isDesktop, Layout } = useEntryLayout(LAYOUTS);
  const [name, setName] = useState("");
  const create = useMutation({
    mutationFn: createSession,
    onSuccess: ({ sessionId, roomCode, hostToken }) => {
      saveCredentials({ role: "host", sessionId, roomCode, hostToken });
      void navigate({ to: "/host/$sessionId/setup", params: { sessionId } });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    create.mutate(name);
  };

  const fields = (
    <>
      <TextField
        label={
          <FormattedMessage
            id="host.nameLabel"
            values={{ muted: (chunks) => <span className="font-normal text-fg-subtle">{chunks}</span> }}
          />
        }
        placeholder={intl.formatMessage({ id: "host.namePlaceholder" })}
        maxLength={SESSION_NAME_MAX_LENGTH}
        value={name}
        onValueChange={(value: string) => setName(stripHiddenCharacters(value))}
        controlClassName="workshop:h-14 workshop:rounded-control workshop:shadow-brutal-sm"
      />
      {create.isError && (
        <p role="alert" className="text-body font-bold text-danger">
          {formatError(toApiError(create.error))}
        </p>
      )}
    </>
  );

  const submit = (
    <Button
      size="lg"
      type="submit"
      form={FORM_ID}
      disabled={create.isPending}
      icon={isDesktop ? <PlayIcon size={22} /> : undefined}
      className="workshop:h-16 workshop:text-2xl workshop:shadow-brutal-md"
    >
      <FormattedMessage id={create.isPending ? "host.creating" : "host.create"} />
    </Button>
  );

  return (
    <Layout
      formId={FORM_ID}
      steps={STEP_IDS.map((id) => <FormattedMessage key={id} id={id} />)}
      fields={fields}
      submit={submit}
      onSubmit={handleSubmit}
    />
  );
};
