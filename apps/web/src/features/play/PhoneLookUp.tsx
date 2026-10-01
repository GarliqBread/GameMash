import { Heading } from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";
import type { LobbyStatus } from "../../lib/lobby";
import { type PlayerIdentity, PlayFrame } from "./PlayFrame";

export type PhoneLookUpProps = {
  me: PlayerIdentity;
  total: number;
  status: LobbyStatus;
  header: ReactNode;
  titleId?: string;
  bodyId: string;
};

export const PhoneLookUp = ({ me, total, status, header, titleId = "play.lookUp", bodyId }: PhoneLookUpProps) => (
  <PlayFrame
    me={me}
    total={total}
    status={status}
    header={header}
    mainClassName="items-center justify-center gap-3 text-center"
  >
    <Heading>
      <FormattedMessage id={titleId} />
    </Heading>
    <p className="text-xl text-fg-muted">
      <FormattedMessage id={bodyId} />
    </p>
  </PlayFrame>
);
