const EMOJI_PART = "\\p{Extended_Pictographic}[\\uFE0F\\p{EMod}]?";
const EMOJI_SEQUENCE = `${EMOJI_PART}(?:\\u200D${EMOJI_PART})+|\\u{1F3F4}[\\u{E0030}-\\u{E0039}\\u{E0061}-\\u{E007A}]+\\u{E007F}`;
const HIDDEN_CHARACTER = "[\\p{Cc}\\p{Cf}]";

export const hasHiddenCharacters = (text: string) =>
  new RegExp(HIDDEN_CHARACTER, "u").test(text.replace(new RegExp(EMOJI_SEQUENCE, "gu"), ""));

export const stripHiddenCharacters = (text: string) =>
  text.replace(new RegExp(`(${EMOJI_SEQUENCE})|${HIDDEN_CHARACTER}`, "gu"), (_, emoji?: string) => emoji ?? "");
