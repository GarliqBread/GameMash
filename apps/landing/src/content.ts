import { PUBLIC_PLAY_URL } from "astro:env/client";
import { POP_QUIZ_MAX_QUESTIONS } from "@gamemash/games/config";
import { MAX_PLAYERS, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, SESSION_IDLE_TTL_SECONDS } from "@gamemash/shared";
import type { AnswerShapeName } from "@gamemash/ui/answers";

export const PLAY_URL = PUBLIC_PLAY_URL.replace(/\/+$/, "");
export const PLAY_HOST = new URL(PLAY_URL).host;
export const HOST_URL = `${PLAY_URL}/host`;
export const JOIN_URL = `${PLAY_URL}/join`;
export const REPO_URL = "https://github.com/GarliqBread/GameMash";
export const SELF_HOSTING_URL = `${REPO_URL}#readme`;
export const LICENSE_NAME = "AGPL-3.0";
export const CODE_PATTERN = `[${ROOM_CODE_ALPHABET}${ROOM_CODE_ALPHABET.toLowerCase()}]{${ROOM_CODE_LENGTH}}`;
export const CODE_LENGTH = ROOM_CODE_LENGTH;

const idleMinutes = SESSION_IDLE_TTL_SECONDS / 60;

export const site = {
  title: "GameMash: quiz and drawing games for team meetings",
  description:
    "Free, open source quiz and drawing games for teams. The questions go up on the meeting-room TV and everyone answers on their own phone. Players join with a short code, no sign-up.",
};

export type ShapeColor = "coral" | "violet" | "lavender" | "lime" | "sky" | "sun";

export const SHAPE_BG: Record<ShapeColor, string> = {
  coral: "bg-brand-coral",
  violet: "bg-brand-violet",
  lavender: "bg-answer-triangle",
  lime: "bg-brand-lime",
  sky: "bg-brand-sky",
  sun: "bg-sun",
};

export const SHAPE_TEXT: Record<ShapeColor, string> = {
  coral: "text-brand-coral",
  violet: "text-brand-violet",
  lavender: "text-answer-triangle",
  lime: "text-brand-lime",
  sky: "text-brand-sky",
  sun: "text-sun",
};

export const nav = [
  { href: "/#how", label: "How it works" },
  { href: "/#games", label: "Games" },
  { href: "/#privacy", label: "Privacy" },
  { href: "/#oss", label: "Open source" },
];

export const hero = {
  badge: "Free & open source",
  titleStart: "Turn the meeting-room TV into a",
  titleHighlight: "game show.",
  lead: "Quiz and drawing games for teams. The questions go up on the TV, everyone answers on their own phone, and nobody has to sign up for anything.",
  hostLabel: "Running it?",
  joinLabel: "Got a code?",
  joinLabelPhone: "Got a code? Join the game",
  joinButton: "Join",
  joinButtonLabel: "Join game",
  codeHint: `The ${ROOM_CODE_LENGTH}-letter code on the TV, like KWPX`,
  codePlaceholder: "KWPX",
  remote: "Works in the room, or share your screen on Teams, Meet or Zoom.",
};

export const cta = {
  host: "Host a session",
  github: "GitHub",
  viewOnGithub: "View on GitHub",
  selfHosting: "Self-hosting guide",
  menu: "Menu",
  menuOpen: "Open menu",
  menuClose: "Close menu",
  skip: "Skip to content",
};

export const quiz = {
  question: "What disappears first from the office kitchen?",
  timer: 12,
  answers: [
    { shape: "squircle", label: "Stroopwafels", color: "coral" },
    { shape: "triangle", label: "The fruit bowl", color: "lavender" },
    { shape: "plus", label: "Cheese cubes", color: "lime" },
    { shape: "dome", label: "Oat milk", color: "sky" },
  ] satisfies { shape: AnswerShapeName; label: string; color: ShapeColor }[],
};

export const stage = {
  bigScreen: "Big screen",
  yourPhone: "Your phone",
  tapAnswer: "Tap your answer",
  lockedIn: "Locked in",
  waiting: "Waiting for 3 more",
  correct: "Correct",
  points: "+740",
  rank: "You're 2nd",
};

export const band: { text: string; short?: string; shape: AnswerShapeName; color: ShapeColor }[] = [
  { text: "No sign-up", shape: "squircle", color: "coral" },
  { text: "Runs in the browser", short: "No app", shape: "triangle", color: "lavender" },
  { text: "Deleted when you're done", short: "Nothing kept", shape: "plus", color: "lime" },
  { text: "Open source", shape: "dome", color: "sky" },
  { text: `Up to ${MAX_PLAYERS} players`, shape: "squircle", color: "sun" },
];

export type StepId = "lobby" | "quiz" | "draw" | "podium";

export const how = {
  title: "How a session works",
  lead: "You line up a few short games before the meeting. Points carry across all of them, so the quiz champion still has to survive the drawing round.",
  code: "KWPX",
  steps: [
    {
      id: "lobby",
      label: "Lobby",
      color: "sky",
      title: "Everyone joins.",
      text: "Scan the QR code or type the letters on the TV, then pick a name.",
    },
    {
      id: "quiz",
      label: "Pop quiz",
      color: "coral",
      title: "Quiz rounds.",
      text: "The question goes up on the TV and everyone answers on their phone before time runs out.",
    },
    {
      id: "draw",
      label: "Draw it",
      color: "lime",
      title: "Drawing rounds.",
      text: "Everyone draws the same word, then rates a few drawings without knowing whose they are.",
    },
    {
      id: "podium",
      label: "Final scores",
      color: "sun",
      title: "Final scores.",
      text: "One podium covers every game. When the host ends the session, it's deleted.",
    },
  ] satisfies { id: StepId; label: string; color: ShapeColor; title: string; text: string }[],
};

export const games = {
  title: "The games",
  more: "More on the way",
  quiz: {
    title: "Pop quiz",
    text: "You write the questions, multiple choice or true or false, with pictures if you want them. Every answer has a shape as well as a colour, so colour-blind players aren't guessing.",
    chips: ["Your own questions", `Up to ${POP_QUIZ_MAX_QUESTIONS} per quiz`, "A timer you set"],
  },
  draw: {
    title: "Draw it",
    text: "Everyone gets the same word and a timer. The drawings show up on the TV without names, and each player rates a few of them from 1 to 10.",
    word: "Word: coffee machine",
    picked: 8,
  },
  yours: {
    title: "Your game here",
    text: "Each game is a self-contained module with its own big-screen and phone views. Build one for your team, and open a pull request if others might like it too.",
    link: "See how games are built",
  },
};

export const privacy = {
  title: "Your data is gone when the session ends",
  text: `Names, selfies, answers and drawings only exist while the session is running. Ending it deletes them straight away, and a session nobody uses for ${idleMinutes} minutes deletes itself.`,
  receiptTitle: "Session KWPX",
  receipt: [
    { key: "Accounts", value: "none" },
    { key: "Email addresses", value: "never asked" },
    { key: "Names & selfies", value: "until end" },
    { key: "Answers", value: "until end" },
    { key: "Drawings", value: "until end" },
  ],
  wiped: "Session ended · wiped",
};

export const scale = {
  title: "Built for a full room",
  text: `Up to ${MAX_PLAYERS} players can join one session, and the big screen stays readable as it fills up.`,
  bars: [
    { label: "10", color: "coral", height: "h-12" },
    { label: "25", color: "lavender", height: "h-20" },
    { label: "50", color: "lime", height: "h-28" },
    { label: "100", color: "sky", height: "h-40" },
  ] satisfies { label: string; color: ShapeColor; height: string }[],
};

export const openSource = {
  badge: `${LICENSE_NAME} licensed`,
  title: "Use ours or run your own",
  text: "The hosted version is free. If session data shouldn't leave your network, the whole project is on GitHub and runs on a single server.",
  stack: ["TypeScript", "React", "Fastify", "Socket.io", "Redis"],
  terminal: [
    { kind: "command", text: `git clone ${REPO_URL}.git` },
    { kind: "command", text: "cd GameMash && pnpm install" },
    { kind: "command", text: "pnpm services && pnpm dev" },
    { kind: "output", text: "› big screen  localhost:5173" },
    { kind: "output", text: "› phones      <your-lan-ip>:5173" },
  ] satisfies { kind: "command" | "output"; text: string }[],
};

export const faq = {
  title: "Quick answers",
  items: [
    {
      question: "Do players need to install anything?",
      answer: "No, they just open the link or type the code in their phone's browser.",
    },
    {
      question: "Do players need an account?",
      answer: "No. They pick a name, and a selfie is optional. Both are deleted with the session.",
    },
    {
      question: "Can we play remotely?",
      answer:
        "Yes. Share the big screen in your video call and people join from their phones like they would in the room.",
    },
    {
      question: "Can we use our own questions?",
      answer:
        "Yes, you write all of them. Build the lineup before the meeting and export it if you want to reuse it next time.",
    },
  ],
};

export const finale = {
  title: "Try it in your next team meeting",
  joinAt: "or join at",
};

export const footer = {
  tagline: "Quiz and drawing games for the big screen.",
  links: [
    { href: REPO_URL, label: "GitHub" },
    { href: SELF_HOSTING_URL, label: "Self-hosting" },
    { href: "/#privacy", label: "Privacy" },
  ],
};

export const notFound = {
  title: "Page not found · GameMash",
  heading: "That round doesn't exist.",
  text: "The page you're looking for isn't here. Looking for a game? Join with the code on the TV.",
  back: "Back to GameMash",
};
