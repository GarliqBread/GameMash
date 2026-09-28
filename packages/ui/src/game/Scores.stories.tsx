import { useCopy } from "../../.ladle/pseudo";
import { LONG_NAMES, PLAYER_NAMES, StageFrame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { Leaderboard, type LeaderboardEntry } from "./Leaderboard";
import { Podium, RankChipList, type RankedPlayer } from "./Podium";

export default { title: "Game / Scores" } satisfies StoryDefault;

const BOARD: LeaderboardEntry[] = [
  { id: "p", rank: 1, name: "Priya", total: 3480, gain: 920, movement: { direction: "up", amount: 2 } },
  { id: "d", rank: 2, name: "Daan", total: 3210, gain: 780, movement: { direction: "down", amount: 1 } },
  { id: "s", rank: 3, name: "Sophie", total: 3050, movement: { direction: "down", amount: 1 } },
  { id: "b", rank: 4, name: "Bram", total: 2890, gain: 860, movement: { direction: "up", amount: 1 } },
  { id: "a", rank: 5, name: "Anouk", total: 2640, gain: 0, movement: { direction: "same" } },
  { id: "l", rank: 6, name: "Lars", total: 2100 },
  { id: "f", rank: 7, name: "Fatima", total: 1900 },
  { id: "j", rank: 8, name: "Jeroen", total: 1200 },
  { id: "m", rank: 9, name: "Mei", total: 800 },
];

const LONG_BOARD: LeaderboardEntry[] = LONG_NAMES.map((name, index) => ({
  id: name,
  rank: index + 1,
  name,
  total: 1_234_560 - index * 98_765,
  gain: 12_340,
  movement: { direction: index % 2 === 0 ? "up" : "down", amount: 12 },
}));

const useMovementLabels = () => {
  const t = useCopy();
  return {
    up: (amount: number) => t(`up ${amount}`),
    down: (amount: number) => t(`down ${amount}`),
    same: () => t("no change"),
  };
};

export const Leaderboards: Story = () => {
  const t = useCopy();
  const movementLabels = useMovementLabels();
  return (
    <StageFrame width={1500}>
      <div className="grid grid-cols-2 gap-12">
        <Leaderboard
          title={t("Leaderboard")}
          subtitle={t("after question 4")}
          entries={BOARD}
          limit={5}
          moreLabel={(count) => t(`+ ${count} more players`)}
          movementLabels={movementLabels}
          formatNumber={(value) => new Intl.NumberFormat("en").format(value)}
        />
        <Leaderboard
          title="Rangliste"
          subtitle="nach Frage 4"
          entries={LONG_BOARD}
          movementLabels={movementLabels}
          formatNumber={(value) => new Intl.NumberFormat("de").format(value)}
        />
      </div>
    </StageFrame>
  );
};

const RANKED: RankedPlayer[] = [
  { id: "p", rank: 1, name: "Priya", score: 7940 },
  { id: "d", rank: 2, name: "Daan", score: 7510 },
  { id: "b", rank: 3, name: "Bram", score: 7120 },
  ...["Sophie", "Anouk", "Lars", "Fatima", "Jeroen", "Mei"].map((name, index) => ({
    id: name,
    rank: index + 4,
    name,
    score: 6880 - index * 540,
  })),
];

export const FinalPodium: Story = () => {
  const t = useCopy();
  const format = (value: number) => new Intl.NumberFormat("en").format(value);
  return (
    <StageFrame>
      <Podium
        players={RANKED}
        formatNumber={format}
        rankLabel={(rank) => t(`Place ${rank}`)}
        aria-label={t("Top three")}
      />
      <RankChipList players={RANKED.slice(3)} formatNumber={format} aria-label={t("Other players")} />
    </StageFrame>
  );
};

export const PodiumLongNames: Story = () => {
  const players: RankedPlayer[] = [...LONG_NAMES, ...PLAYER_NAMES].map((name, index) => ({
    id: name,
    rank: index + 1,
    name,
    score: 1_000_000 - index * 45_000,
  }));
  const format = (value: number) => new Intl.NumberFormat("de").format(value);
  return (
    <StageFrame>
      <Podium players={players} formatNumber={format} rankLabel={(rank) => `Platz ${rank}`} />
      <RankChipList players={players.slice(3)} formatNumber={format} />
    </StageFrame>
  );
};
