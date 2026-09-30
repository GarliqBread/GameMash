import type { LobbyPlayer } from "@gamemash/shared";
import {
  Avatar,
  Button,
  CameraIcon,
  FileButton,
  Heading,
  Logo,
  PencilIcon,
  PhoneShell,
  Pill,
  TrashIcon,
  TrustNote,
} from "@gamemash/ui";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import type { PlayerCredentials } from "../../lib/credentials";
import type { LobbyStatus } from "../../lib/lobby";
import { avatarSrc } from "../../lib/players";
import { AvatarEditor } from "./AvatarEditor";
import { usePhotoActions } from "./usePhotoActions";

export type WaitingScreenProps = {
  credentials: PlayerCredentials;
  me: LobbyPlayer | undefined;
  playerCount: number | undefined;
  status: LobbyStatus;
};

export const WaitingScreen = ({ credentials, me, playerCount, status }: WaitingScreenProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const photo = usePhotoActions(credentials);
  const name = me?.name ?? credentials.name;

  if (isEditing && me) {
    return (
      <AvatarEditor
        credentials={credentials}
        name={name}
        character={me.character}
        onClose={() => setIsEditing(false)}
      />
    );
  }

  const hasPhoto = me?.avatarVersion != null;
  return (
    <PhoneShell
      theme="paper"
      mainClassName="items-center justify-center gap-6 text-center"
      header={<Logo />}
      footer={
        <TrustNote>
          <FormattedMessage id="join.trust" />
        </TrustNote>
      }
    >
      <Avatar
        name={name}
        colorKey={credentials.playerId}
        src={me ? avatarSrc(credentials.sessionId, me) : undefined}
        size={140}
      />
      <div className="flex min-w-0 max-w-full flex-col gap-2">
        <Heading>
          <FormattedMessage id="waiting.title" />
        </Heading>
        <p className="truncate font-display text-3xl font-extrabold">{name}</p>
      </div>
      {me && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            icon={<PencilIcon size={20} />}
            onClick={() => setIsEditing(true)}
            disabled={photo.isBusy}
          >
            <FormattedMessage id="waiting.changeLook" />
          </Button>
          {hasPhoto ? (
            <Button variant="secondary" icon={<TrashIcon size={20} />} onClick={photo.remove} disabled={photo.isBusy}>
              <FormattedMessage id="waiting.removePhoto" />
            </Button>
          ) : (
            <FileButton
              variant="secondary"
              icon={<CameraIcon size={20} />}
              onFileSelect={photo.upload}
              disabled={photo.isBusy}
            >
              <FormattedMessage id="waiting.usePhoto" />
            </FileButton>
          )}
        </div>
      )}
      {photo.isUploading && (
        <p role="status" className="text-caption text-fg-subtle">
          <FormattedMessage id="waiting.photoProcessing" />
        </p>
      )}
      {photo.errorMessage && (
        <p role="alert" className="text-caption font-bold text-danger">
          {photo.errorMessage}
        </p>
      )}
      <p className="text-xl text-fg-muted">
        <FormattedMessage id="waiting.body" />
      </p>
      {playerCount !== undefined && (
        <Pill variant="surface" size="phone">
          <FormattedMessage id="waiting.playerCount" values={{ count: playerCount }} />
        </Pill>
      )}
      {status === "reconnecting" && (
        <p role="status" className="text-caption text-fg-subtle">
          <FormattedMessage id="connection.reconnecting" />
        </p>
      )}
    </PhoneShell>
  );
};
