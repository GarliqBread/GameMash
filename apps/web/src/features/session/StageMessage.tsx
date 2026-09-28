import { buttonVariants, Heading, Logo, StageLayout, StageViewport } from "@gamemash/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

export const NewSessionLink = () => (
  <Link to="/host" className={buttonVariants({ size: "stage" })}>
    <FormattedMessage id="ended.hostAction" />
  </Link>
);

export type StageMessageProps = {
  title: ReactNode;
  body: ReactNode;
  action: ReactNode;
};

export const StageMessage = ({ title, body, action }: StageMessageProps) => (
  <StageViewport>
    <StageLayout
      className="py-16"
      mainClassName="items-start justify-center gap-10"
      header={<Logo tone="stage" size="lg" />}
    >
      <Heading size="stage-title">{title}</Heading>
      <p className="max-w-[1200px] text-stage-body text-fg-subtle">{body}</p>
      {action}
    </StageLayout>
  </StageViewport>
);
