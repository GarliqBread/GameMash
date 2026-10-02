import { GAMES } from "@gamemash/games";
import { AI_DIFFICULTIES, AI_TOPIC_MAX_LENGTH, type AiReplyError, aiCounts } from "@gamemash/games/config";
import type { MessageId } from "@gamemash/messages";
import {
  CopyIcon,
  KeyButton,
  keyButtonClassName,
  SectionTab,
  SegmentedControl,
  SettingsField,
  TextArea,
  TextField,
  WorkshopDialog,
} from "@gamemash/ui";
import type { MouseEvent, RefObject } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { type AiChoice, type UseAiCreateOptions, useAiCreate } from "./useAiCreate";

const MAX_SHOWN_ERRORS = 5;

const CHATBOTS = [
  { name: "ChatGPT", url: (prompt: string) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}` },
  { name: "Claude", url: (prompt: string) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}` },
];

const errorMessageId = (error: AiReplyError): MessageId => `ai.error.${error.code}`;

export type AiCreateDialogProps = UseAiCreateOptions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  finalFocus: RefObject<HTMLElement | null>;
};

export const AiCreateDialog = ({ open, onOpenChange, finalFocus, ...options }: AiCreateDialogProps) => {
  const intl = useIntl();
  const ai = useAiCreate(options);
  const choices: { value: AiChoice; label: string }[] = [
    ...Object.values(GAMES).map((definition) => ({
      value: definition.id,
      label: intl.formatMessage({ id: definition.titleId }),
    })),
    { value: "both", label: intl.formatMessage({ id: "ai.both" }) },
  ];
  const shownErrors = ai.errors.slice(0, MAX_SHOWN_ERRORS);
  const hiddenErrorCount = ai.errors.length - shownErrors.length;

  const handleOpenChatbot = (event: MouseEvent<HTMLAnchorElement>) => {
    if (ai.topic.trim().length === 0) event.preventDefault();
    void ai.copyPrompt();
  };

  return (
    <WorkshopDialog
      open={open}
      onOpenChange={onOpenChange}
      finalFocus={finalFocus}
      title={<FormattedMessage id="ai.title" />}
      description={<FormattedMessage id="ai.intro" />}
      closeLabel={intl.formatMessage({ id: "ai.close" })}
      footer={
        <KeyButton size="md" className="workshop:bg-sun" onClick={ai.create} disabled={ai.reply.trim().length === 0}>
          <FormattedMessage id="ai.add" values={{ count: ai.types.length }} />
        </KeyButton>
      }
    >
      <SectionTab as="h3">
        <FormattedMessage id="ai.step1" />
      </SectionTab>
      <SettingsField label={<FormattedMessage id="ai.gameType" />}>
        {(labelId) => (
          <SegmentedControl
            aria-labelledby={labelId}
            value={ai.choice}
            onValueChange={ai.changeChoice}
            options={choices.map((choice) => ({ ...choice, disabled: !ai.canFit(choice.value) }))}
          />
        )}
      </SettingsField>
      {!ai.canFit("both") && (
        <p className="-mt-2 text-caption text-fg-muted">
          <FormattedMessage id="ai.needsRoom" values={{ needed: 2, free: ai.freeSlots }} />
        </p>
      )}
      <TextField
        size="host"
        label={<FormattedMessage id="ai.topic" />}
        placeholder={intl.formatMessage({ id: "ai.topicPlaceholder" })}
        value={ai.topic}
        onValueChange={ai.changeTopic}
        maxLength={AI_TOPIC_MAX_LENGTH}
        error={ai.isTopicMissing && <FormattedMessage id="ai.needTopic" />}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {ai.types.map((type) => {
          const { list, maxCount } = aiCounts(type);
          return (
            <TextField
              key={type}
              size="host"
              type="number"
              inputMode="numeric"
              min={1}
              max={maxCount}
              label={<FormattedMessage id="ai.count" values={{ list }} />}
              description={<FormattedMessage id="ai.countHint" values={{ min: 1, max: maxCount }} />}
              value={ai.counts[type]}
              onValueChange={(value: string) => ai.changeCount(type, value)}
              onBlur={() => ai.normalizeCount(type)}
            />
          );
        })}
      </div>
      <SettingsField label={<FormattedMessage id="ai.difficulty" />}>
        {(labelId) => (
          <SegmentedControl
            aria-labelledby={labelId}
            value={ai.difficulty}
            onValueChange={ai.changeDifficulty}
            options={AI_DIFFICULTIES.map((level) => ({
              value: level,
              label: intl.formatMessage({ id: "ai.difficultyOption" }, { level }),
            }))}
          />
        )}
      </SettingsField>
      <div className="flex flex-wrap gap-3">
        <KeyButton size="md" className="gap-2" onClick={() => void ai.copyPrompt()}>
          <CopyIcon size={18} strokeWidth={2.2} />
          <FormattedMessage id="ai.copyPrompt" />
        </KeyButton>
        {CHATBOTS.map((chatbot) => (
          <a
            key={chatbot.name}
            href={chatbot.url(ai.prompt)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenChatbot}
            className={keyButtonClassName({ size: "md" })}
          >
            <FormattedMessage id="ai.openIn" values={{ name: chatbot.name }} />
          </a>
        ))}
      </div>
      {ai.copyStatus !== "idle" && (
        <p role="status" className={ai.copyStatus === "failed" ? "font-bold text-danger" : "text-fg-muted"}>
          <FormattedMessage id={ai.copyStatus === "failed" ? "ai.copyFailed" : "ai.copied"} />
        </p>
      )}
      <details className="text-caption">
        <summary className="focus-ring cursor-pointer self-start font-bold">
          <FormattedMessage id="ai.showPrompt" />
        </summary>
        <TextArea
          className="mt-3"
          label={<FormattedMessage id="ai.prompt" />}
          hideLabel
          readOnly
          rows={8}
          value={ai.prompt}
        />
      </details>
      <SectionTab as="h3">
        <FormattedMessage id="ai.step2" />
      </SectionTab>
      <TextArea
        label={<FormattedMessage id="ai.reply" />}
        hideLabel
        placeholder={intl.formatMessage({ id: "ai.replyPlaceholder" })}
        value={ai.reply}
        onChange={(event) => ai.changeReply(event.target.value)}
      />
      {shownErrors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 font-bold text-danger">
          {shownErrors.map((error) => (
            <li key={`${error.list ?? ""}-${error.code}-${error.item ?? 0}`}>
              <FormattedMessage
                id={errorMessageId(error)}
                values={{ item: error.item, max: error.max, list: error.list ?? "" }}
              />
            </li>
          ))}
          {hiddenErrorCount > 0 && (
            <li>
              <FormattedMessage id="ai.moreErrors" values={{ count: hiddenErrorCount }} />
            </li>
          )}
        </ul>
      )}
    </WorkshopDialog>
  );
};
