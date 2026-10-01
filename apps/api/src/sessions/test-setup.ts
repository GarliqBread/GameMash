import { defaultPopQuizConfig, emptyQuestion, type GameSetup, type SessionSetup } from "@gamemash/games/config";

type QuizGameSetup = Extract<GameSetup, { type: "pop-quiz" }>;

type QuizSessionSetup = Omit<SessionSetup, "games"> & { games: QuizGameSetup[] };

export const readySetup = (): QuizSessionSetup => ({
  name: "Friday team mash",
  games: [
    {
      id: "quiz-1",
      type: "pop-quiz",
      config: {
        ...defaultPopQuizConfig("q1"),
        timeLimitSeconds: 30,
        questions: [
          {
            ...emptyQuestion("q1"),
            text: [{ text: "Which planet has the most known moons?" }],
            answers: { squircle: "Jupiter", triangle: "Saturn", plus: "Uranus", dome: "Neptune" },
            correct: "triangle",
          },
        ],
      },
    },
  ],
});
