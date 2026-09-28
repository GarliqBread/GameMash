import { defaultPopQuizConfig, type SessionSetup } from "@gamemash/games/config";

export const readySetup = (): SessionSetup => ({
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
            id: "q1",
            text: "Which planet has the most known moons?",
            answers: { triangle: "Jupiter", diamond: "Saturn", circle: "Uranus", square: "Neptune" },
            correct: "diamond",
          },
        ],
      },
    },
  ],
});
