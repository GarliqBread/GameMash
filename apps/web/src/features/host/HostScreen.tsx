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
import { DESKTOP_QUERY, useMediaQuery } from "../../lib/use-media-query";
import { HostDesktop } from "./HostDesktop";
import { HostPhone } from "./HostPhone";
import { HOST_FORM_ID } from "./host-layout";

export const HostScreen = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const formatError = useErrorMessage();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
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
      form={HOST_FORM_ID}
      disabled={create.isPending}
      icon={isDesktop ? <PlayIcon size={22} /> : undefined}
      className="workshop:h-16 workshop:text-2xl workshop:shadow-brutal-md"
    >
      <FormattedMessage id={create.isPending ? "host.creating" : "host.create"} />
    </Button>
  );

  const Layout = isDesktop ? HostDesktop : HostPhone;
  return <Layout fields={fields} submit={submit} onSubmit={handleSubmit} />;
};
