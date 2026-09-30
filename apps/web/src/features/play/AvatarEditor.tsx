import { CHARACTER_PART_COUNTS, type Character, type CharacterPart, randomCharacter } from "@gamemash/shared";
import {
  Avatar,
  type AvatarPartOption,
  AvatarPartPicker,
  Button,
  Heading,
  Logo,
  PhoneShell,
  ShuffleIcon,
} from "@gamemash/ui";
import { useMutation } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { saveCharacter } from "../../lib/avatar";
import { CHARACTER_CREDIT, characterSrc } from "../../lib/character";
import type { PlayerCredentials } from "../../lib/credentials";
import { toApiError, useErrorMessage } from "../../lib/errors";
import { showPlayerLook } from "../../lib/lobby";

const PARTS: CharacterPart[] = ["top", "topColor", "eyes", "mouth", "nose", "head", "beard", "mustache"];
const OPTIONAL_PARTS: CharacterPart[] = ["beard", "mustache"];
const NONE = "none";

const choices = (part: CharacterPart) => {
  const indexes = Array.from({ length: CHARACTER_PART_COUNTS[part] }, (_, index) => index);
  return OPTIONAL_PARTS.includes(part) ? [null, ...indexes] : indexes;
};

const toValue = (choice: number | null) => (choice === null ? NONE : String(choice));

const fromValue = (value: string) => (value === NONE ? null : Number(value));

const withPart = (character: Character, part: CharacterPart, choice: number | null): Character => ({
  ...character,
  [part]: choice,
});

const CreditLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="focus-ring underline">
    {children}
  </a>
);

export type AvatarEditorProps = {
  credentials: PlayerCredentials;
  name: string;
  character: Character;
  onClose: () => void;
};

export const AvatarEditor = ({ credentials, name, character, onClose }: AvatarEditorProps) => {
  const intl = useIntl();
  const formatError = useErrorMessage();
  const [draft, setDraft] = useState(character);
  const [part, setPart] = useState<CharacterPart>("top");
  const save = useMutation({
    mutationFn: (next: Character) => saveCharacter(credentials, next),
    onSuccess: (_result, next) => {
      showPlayerLook(credentials.playerId, { character: next, avatarVersion: null });
      onClose();
    },
  });

  const options: AvatarPartOption[] = choices(part).map((choice) => ({
    value: toValue(choice),
    src: characterSrc(withPart(draft, part, choice)),
    label:
      choice === null
        ? intl.formatMessage({ id: "avatar.none" })
        : intl.formatMessage({ id: "avatar.option" }, { number: choice + 1 }),
    caption: choice === null ? <FormattedMessage id="avatar.none" /> : undefined,
  }));

  return (
    <PhoneShell
      theme="paper"
      mainClassName="gap-5"
      isBottomActionSticky
      header={<Logo />}
      footer={
        <p className="text-caption text-fg-subtle">
          <FormattedMessage
            id="avatar.credit"
            values={{
              creator: CHARACTER_CREDIT.creator,
              licenseName: CHARACTER_CREDIT.license,
              source: (chunks) => <CreditLink href={CHARACTER_CREDIT.sourceUrl}>{chunks}</CreditLink>,
              license: (chunks) => <CreditLink href={CHARACTER_CREDIT.licenseUrl}>{chunks}</CreditLink>,
            }}
          />
        </p>
      }
      bottomAction={
        <>
          {save.isError && (
            <p role="alert" className="text-body font-bold text-danger">
              {formatError(toApiError(save.error))}
            </p>
          )}
          <Button size="lg" onClick={() => save.mutate(draft)} disabled={save.isPending}>
            <FormattedMessage id={save.isPending ? "avatar.saving" : "avatar.save"} />
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            <FormattedMessage id="avatar.cancel" />
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-5">
        <Avatar name={name} colorKey={credentials.playerId} src={characterSrc(draft)} size={112} />
        <div className="flex min-w-0 flex-col items-start gap-3">
          <Heading size="phone-sm">
            <FormattedMessage id="avatar.title" />
          </Heading>
          <Button
            variant="secondary"
            size="sm"
            icon={<ShuffleIcon size={18} />}
            onClick={() => setDraft(randomCharacter())}
            disabled={save.isPending}
          >
            <FormattedMessage id="avatar.shuffle" />
          </Button>
        </div>
      </div>
      <AvatarPartPicker
        tabs={PARTS.map((value) => ({ value, label: <FormattedMessage id={`avatar.part.${value}`} /> }))}
        tab={part}
        onTabChange={setPart}
        tabsLabel={intl.formatMessage({ id: "avatar.parts" })}
        options={options}
        value={toValue(draft[part])}
        onValueChange={(value) => setDraft(withPart(draft, part, fromValue(value)))}
        disabled={save.isPending}
      />
    </PhoneShell>
  );
};
