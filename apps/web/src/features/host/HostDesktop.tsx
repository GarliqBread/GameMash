import {
  buttonVariants,
  EntryShell,
  Heading,
  HowItWorksSteps,
  Logo,
  PhoneIcon,
  Sticker,
  TrustNote,
} from "@gamemash/ui";
import { Link } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";
import type { EntryLayoutProps } from "../entry/entry-layout";
import { HOST_FORM_ID, HOST_STEPS } from "./host-layout";

export const HostDesktop = ({ fields, submit, onSubmit }: EntryLayoutProps) => (
  <EntryShell
    logo={<Logo size="md" hasOutline={false} />}
    action={
      <Link to="/" className={buttonVariants({ variant: "secondary", size: "md" })}>
        <PhoneIcon size={20} strokeWidth={2.2} />
        <FormattedMessage id="host.joinGame" />
      </Link>
    }
    mainClassName="flex-col items-center gap-10"
  >
    <section className="flex w-full max-w-[520px] flex-1 flex-col justify-center gap-[18px]">
      <form
        id={HOST_FORM_ID}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-3.5 rounded-tile border-3 border-ink-950 bg-paper-white p-9 shadow-brutal-xl"
      >
        <Sticker tone="sky" rotate={-2} className="self-start text-label">
          <FormattedMessage id="host.tag" />
        </Sticker>
        <Heading size="display">
          <FormattedMessage id="host.title" />
        </Heading>
        <p className="mb-2 text-lg/[1.45] text-fg-muted">
          <FormattedMessage id="host.body" />
        </p>
        {fields}
        <div className="mt-2.5 flex flex-col">{submit}</div>
      </form>
      <div className="flex items-center justify-between gap-4 px-1">
        <TrustNote size="inline">
          <FormattedMessage id="host.trust" />
        </TrustNote>
        <Link to="/" className="focus-ring shrink-0 text-caption font-bold underline underline-offset-3">
          <FormattedMessage id="host.joinLink" />
        </Link>
      </div>
    </section>
    <HowItWorksSteps
      variant="cards"
      className="max-w-[880px]"
      steps={HOST_STEPS.map((id) => <FormattedMessage key={id} id={id} />)}
    />
  </EntryShell>
);
