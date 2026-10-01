import {
  buttonVariants,
  EntryHero,
  EntryShell,
  Heading,
  HowItWorksSteps,
  Logo,
  MonitorIcon,
  Sticker,
} from "@gamemash/ui";
import { Link } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";
import type { EntryLayoutProps } from "../entry/useEntryLayout";

export const JoinDesktop = ({ formId, steps, fields, submit, onSubmit }: EntryLayoutProps) => (
  <EntryShell
    logo={<Logo size="md" hasOutline={false} />}
    action={
      <Link to="/host" className={buttonVariants({ variant: "secondary", size: "md" })}>
        <MonitorIcon size={20} strokeWidth={2.2} />
        <FormattedMessage id="join.hostSession" />
      </Link>
    }
    mainClassName="max-[1099px]:flex-col min-[1100px]:flex-row-reverse"
  >
    <section className="flex w-full max-w-[500px] shrink-0 flex-col justify-center gap-[18px] self-center min-[1100px]:self-stretch">
      <form
        id={formId}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-3 rounded-tile border-3 border-ink-950 bg-paper-white p-8 shadow-brutal-xl"
      >
        <Heading size="host" className="mb-1.5">
          <FormattedMessage id="join.title" />
        </Heading>
        {fields}
        <div className="mt-3 flex flex-col">{submit}</div>
      </form>
      <div className="flex justify-end px-1">
        <Link to="/host" className="focus-ring shrink-0 text-caption font-bold underline underline-offset-3">
          <FormattedMessage id="join.hostLinkShort" />
        </Link>
      </div>
    </section>
    <section className="relative flex min-w-0 flex-1 flex-col gap-[22px] overflow-hidden rounded-panel border-3 border-ink-950 bg-brand-violet px-[52px] py-12 text-cream shadow-brutal-xl">
      <Sticker tone="sun" rotate={-2} className="self-start px-2.5 py-[5px] text-sm">
        <FormattedMessage id="join.tag" />
      </Sticker>
      <Heading as="h2" size="display" className="max-w-[560px]">
        <FormattedMessage id="join.tagline" />
      </Heading>
      <HowItWorksSteps variant="violet" className="mt-2" steps={steps} />
      <EntryHero variant="desktop" className="absolute -right-[18px] -bottom-[22px] max-[1199px]:hidden" />
    </section>
  </EntryShell>
);
