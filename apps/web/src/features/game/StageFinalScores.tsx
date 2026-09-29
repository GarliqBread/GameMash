import { rankOf } from "@gamemash/games/config";
import type { GameStanding, LobbyPlayer } from "@gamemash/shared";
import {
  DecorativeShapes,
  Heading,
  Logo,
  Podium,
  RankChipList,
  type RankedPlayer,
  StageLayout,
  StageViewport,
} from "@gamemash/ui";
import type { ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { avatarSrc } from "../../lib/players";

const PODIUM_SIZE = 3;

const rankPlayers = (sessionId: string, standings: GameStanding[], players: Map<string, LobbyPlayer>) => {
  const totals = Object.fromEntries(standings.map((standing) => [standing.playerId, standing.points]));
  return [...players.values()]
    .map(
      (player): RankedPlayer => ({
        id: player.id,
        rank: rankOf(totals, player.id),
        name: player.name,
        score: totals[player.id] ?? 0,
        colorKey: player.id,
        avatarSrc: avatarSrc(sessionId, player),
      }),
    )
    .toSorted((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
};

export type StageFinalScoresProps = {
  sessionId: string;
  sessionName: string;
  standings: GameStanding[];
  players: Map<string, LobbyPlayer>;
  actions?: ReactNode;
};

export const StageFinalScores = ({ sessionId, sessionName, standings, players, actions }: StageFinalScoresProps) => {
  const intl = useIntl();
  const ranked = rankPlayers(sessionId, standings, players);
  const formatNumber = (value: number) => intl.formatNumber(value);
  return (
    <StageViewport>
      <StageLayout
        className="gap-6 py-12"
        mainClassName="gap-6"
        backdrop={<DecorativeShapes />}
        header={<Logo size="lg" />}
        footer={actions}
      >
        <div className="flex flex-col items-center gap-1">
          <Heading size="stage-hero">
            <FormattedMessage id="final.title" />
          </Heading>
          {sessionName && <span className="text-stage-lg text-fg-muted">{sessionName}</span>}
        </div>
        <Podium
          className="flex-1"
          players={ranked}
          formatNumber={formatNumber}
          rankLabel={(rank) => intl.formatMessage({ id: "final.rank" }, { rank })}
          aria-label={intl.formatMessage({ id: "final.topThree" })}
        />
        <RankChipList
          players={ranked.filter((player) => player.rank > PODIUM_SIZE)}
          formatNumber={formatNumber}
          aria-label={intl.formatMessage({ id: "final.otherPlayers" })}
        />
      </StageLayout>
    </StageViewport>
  );
};
