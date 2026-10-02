import {
  type AiDifficulty,
  type AiReplyError,
  aiCounts,
  aiPrompt,
  type GameSetup,
  type GameType,
  parseAiReply,
} from "@gamemash/games/config";
import { useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { newIdsOf } from "../games/workshop-games";

export type CopyStatus = "idle" | "copied" | "failed";

export type AiChoice = GameType | "both";

const BOTH: GameType[] = ["pop-quiz", "draw-it"];

const gameTypesOf = (choice: AiChoice): GameType[] => (choice === "both" ? BOTH : [choice]);

const languageName = (locale: string) => {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;
  } catch {
    return locale;
  }
};

const clampCount = (value: string, type: GameType) => {
  const { defaultCount, maxCount } = aiCounts(type);
  const count = Number.parseInt(value, 10);
  return Number.isNaN(count) ? defaultCount : Math.min(Math.max(count, 1), maxCount);
};

const defaultCounts = (): Record<GameType, string> => ({
  "pop-quiz": String(aiCounts("pop-quiz").defaultCount),
  "draw-it": String(aiCounts("draw-it").defaultCount),
});

export type UseAiCreateOptions = {
  imagesEnabled: boolean;
  freeSlots: number;
  onCreate: (games: GameSetup[]) => void;
};

export const useAiCreate = ({ imagesEnabled, freeSlots, onCreate }: UseAiCreateOptions) => {
  const intl = useIntl();
  const [chosen, setChosen] = useState<AiChoice>("pop-quiz");
  const [topic, setTopic] = useState("");
  const [counts, setCounts] = useState(defaultCounts);
  const [difficulty, setDifficulty] = useState<AiDifficulty>("medium");
  const [reply, setReply] = useState("");
  const [errors, setErrors] = useState<AiReplyError[]>([]);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [isTopicMissing, setIsTopicMissing] = useState(false);
  const canFit = (next: AiChoice) => gameTypesOf(next).length <= freeSlots;
  const choice = canFit(chosen) ? chosen : "pop-quiz";
  const types = gameTypesOf(choice);

  const prompt = useMemo(
    () =>
      aiPrompt(
        gameTypesOf(choice).map((type) => ({ type, count: clampCount(counts[type], type) })),
        { topic: topic.trim(), difficulty, language: languageName(intl.locale), withImageIdeas: imagesEnabled },
      ),
    [choice, counts, topic, difficulty, intl.locale, imagesEnabled],
  );

  const changeChoice = (next: AiChoice) => {
    if (!canFit(next)) return;
    setChosen(next);
    setErrors([]);
    setCopyStatus("idle");
  };

  const changeCount = (type: GameType, value: string) => {
    setCounts((current) => ({ ...current, [type]: value }));
    setCopyStatus("idle");
  };

  const normalizeCount = (type: GameType) => changeCount(type, String(clampCount(counts[type], type)));

  const changeDifficulty = (next: AiDifficulty) => {
    setDifficulty(next);
    setCopyStatus("idle");
  };

  const changeTopic = (next: string) => {
    setTopic(next);
    setIsTopicMissing(false);
    setCopyStatus("idle");
  };

  const changeReply = (next: string) => {
    setReply(next);
    setErrors([]);
  };

  const copyPrompt = async () => {
    if (topic.trim().length === 0) {
      setIsTopicMissing(true);
      return false;
    }
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    return true;
  };

  const reset = () => {
    setTopic("");
    setReply("");
    setErrors([]);
    setCopyStatus("idle");
    setIsTopicMissing(false);
  };

  const create = () => {
    const result = parseAiReply(reply, types, { idsOf: newIdsOf, withImageIdeas: imagesEnabled });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onCreate(result.value);
    reset();
  };

  return {
    choice,
    changeChoice,
    canFit,
    freeSlots,
    types,
    topic,
    changeTopic,
    isTopicMissing,
    counts,
    changeCount,
    normalizeCount,
    difficulty,
    changeDifficulty,
    prompt,
    copyPrompt,
    copyStatus,
    reply,
    changeReply,
    errors,
    create,
  };
};
