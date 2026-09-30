import { buttonVariants, Heading, HowItWorksSteps, Logo, PhoneShell, TrustNote, TvMock } from "@gamemash/ui";
import { Link } from "@tanstack/react-router";
import { FormattedMessage, useIntl } from "react-intl";
import type { EntryLayoutProps } from "../entry/entry-layout";
import { HOST_FORM_ID, HOST_STEPS } from "./host-layout";

const SAMPLE_ROOM_CODE = "KWPX";

export const HostPhone = ({ fields, submit, onSubmit }: EntryLayoutProps) => {
  const intl = useIntl();
  return (
    <PhoneShell
      theme="workshop"
      isBottomActionSticky
      contentClassName="gap-3.5 px-5 pt-[calc(env(safe-area-inset-top)+20px)]"
      mainClassName="gap-3.5"
      header={
        <>
          <Logo hasOutline={false} />
          <Link
            to="/"
            className={buttonVariants({
              variant: "secondary",
              size: "sm",
              className: "workshop:min-h-9 workshop:rounded-key workshop:px-3 workshop:shadow-brutal-sm",
            })}
          >
            <FormattedMessage id="host.joinInstead" />
          </Link>
        </>
      }
      footer={
        <TrustNote size="note" tone="white">
          <FormattedMessage id="host.trust" />
        </TrustNote>
      }
      bottomAction={
        <>
          {submit}
          <p className="text-center text-sm text-fg-subtle">
            <FormattedMessage id="host.laptopHint" />
          </p>
        </>
      }
    >
      <Heading size="host" className="mt-1">
        <FormattedMessage id="host.title" />
      </Heading>
      <TvMock title={intl.formatMessage({ id: "lobby.title" })} code={SAMPLE_ROOM_CODE} />
      <HowItWorksSteps variant="phone" steps={HOST_STEPS.map((id) => <FormattedMessage key={id} id={id} />)} />
      <form id={HOST_FORM_ID} noValidate onSubmit={onSubmit} className="mt-1 flex flex-col gap-2">
        {fields}
      </form>
    </PhoneShell>
  );
};
