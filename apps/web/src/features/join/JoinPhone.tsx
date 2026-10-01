import { EntryHero, Heading, Logo, PhoneShell } from "@gamemash/ui";
import { Link } from "@tanstack/react-router";
import { FormattedMessage } from "react-intl";
import type { EntryLayoutProps } from "../entry/useEntryLayout";

export const JoinPhone = ({ formId, fields, submit, onSubmit }: EntryLayoutProps) => (
  <PhoneShell
    theme="workshop"
    isBottomActionSticky
    contentClassName="px-5 pt-[calc(env(safe-area-inset-top)+20px)]"
    header={<Logo hasOutline={false} />}
    bottomAction={
      <>
        {submit}
        <Link
          to="/host"
          className="focus-ring self-center text-center text-caption font-bold underline underline-offset-3"
        >
          <FormattedMessage id="join.hostLink" />
        </Link>
      </>
    }
  >
    <EntryHero variant="phone" />
    <Heading size="host" className="-mt-1.5">
      <FormattedMessage id="join.title" />
    </Heading>
    <form
      id={formId}
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-2.5 rounded-card border-3 border-ink-950 bg-paper-white p-[18px] shadow-brutal-md"
    >
      {fields}
    </form>
  </PhoneShell>
);
