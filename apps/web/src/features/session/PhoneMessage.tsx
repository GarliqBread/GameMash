import { buttonVariants, Heading, Logo, PhoneShell } from "@gamemash/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export type PhoneMessageProps = {
  title: ReactNode;
  body: ReactNode;
  actionLabel: ReactNode;
  roomCode?: string | undefined;
};

export const PhoneMessage = ({ title, body, actionLabel, roomCode }: PhoneMessageProps) => (
  <PhoneShell
    theme="paper"
    mainClassName="gap-4"
    header={<Logo />}
    bottomAction={
      roomCode ? (
        <Link to="/join/$code" params={{ code: roomCode }} className={buttonVariants({ size: "lg" })}>
          {actionLabel}
        </Link>
      ) : (
        <Link to="/" className={buttonVariants({ size: "lg" })}>
          {actionLabel}
        </Link>
      )
    }
  >
    <Heading>{title}</Heading>
    <p className="text-xl text-fg-muted">{body}</p>
  </PhoneShell>
);
