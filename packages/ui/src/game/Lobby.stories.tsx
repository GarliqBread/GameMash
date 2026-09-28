import { useEffect, useState } from "react";
import { useCopy } from "../../.ladle/pseudo";
import { Caption, LONG_NAMES, PLAYER_NAMES, StageFrame } from "../../.ladle/story-kit";
import type { Story, StoryDefault } from "../../.ladle/types";
import { JoinSteps } from "./JoinSteps";
import { PlayerChip } from "./PlayerChip";
import { PlayerGrid } from "./PlayerGrid";
import { QrCode } from "./QrCode";
import { RoomCodeDisplay, spellOut } from "./RoomCodeDisplay";

export default { title: "Game / Lobby" } satisfies StoryDefault;

export const JoinPanel: Story = () => {
  const t = useCopy();
  return (
    <StageFrame width={860}>
      <JoinSteps
        steps={[
          <>
            {t("Go to")} <strong className="text-stage-xl text-fg">gamemash.app</strong>
          </>,
          t("Enter the room code"),
        ]}
        qr={<QrCode value="https://gamemash.app/join/KWPX" label={t("QR code to join room KWPX")} />}
        qrCaption={t("Or scan with your phone camera")}
      >
        <RoomCodeDisplay code="KWPX" label={t(`Room code ${spellOut("KWPX")}`)} />
      </JoinSteps>
    </StageFrame>
  );
};

export const PlayersJoining: Story = () => {
  const t = useCopy();
  const [count, setCount] = useState(3);
  useEffect(() => {
    const id = setInterval(() => setCount((current) => (current >= PLAYER_NAMES.length ? 3 : current + 1)), 1200);
    return () => clearInterval(id);
  }, []);
  const waiting = Math.max(0, 12 - count);
  return (
    <StageFrame width={900}>
      <PlayerGrid columns={3}>
        {PLAYER_NAMES.slice(0, count).map((name) => (
          <PlayerChip key={name} state="joined" name={name} />
        ))}
        {Array.from({ length: Math.min(waiting, 3) }, (_, index) => `waiting-${index}`).map((key) => (
          <PlayerChip key={key} state="waiting" name={t("Waiting…")} />
        ))}
      </PlayerGrid>
    </StageFrame>
  );
};

export const ManyPlayersLongNames: Story = () => {
  const names = [
    ...LONG_NAMES,
    ...PLAYER_NAMES,
    ...LONG_NAMES.map((name) => `${name} II`),
    ...PLAYER_NAMES.map((name) => `${name} B.`),
  ];
  return (
    <StageFrame width={1100}>
      <Caption>{names.length} players, 4 columns</Caption>
      <PlayerGrid columns={4}>
        {names.map((name) => (
          <PlayerChip key={name} state="joined" name={name} />
        ))}
      </PlayerGrid>
    </StageFrame>
  );
};

export const DrawingStatus: Story = () => {
  const t = useCopy();
  const finished = new Set(["Anouk", "Bram", "Daan", "Priya", "Fatima", "Mei"]);
  return (
    <StageFrame>
      <Caption>9 players, 9 columns</Caption>
      <PlayerGrid columns={9} className="gap-x-3.5">
        {PLAYER_NAMES.map((name) => (
          <PlayerChip
            key={name}
            state={finished.has(name) ? "done" : "drawing"}
            name={name}
            statusLabel={finished.has(name) ? t("Done") : t("Still drawing")}
          />
        ))}
      </PlayerGrid>
      <Caption>Long names, 6 columns</Caption>
      <PlayerGrid columns={6} className="gap-x-3.5">
        {[...LONG_NAMES, "Mei", "Lars"].map((name, index) => (
          <PlayerChip
            key={name}
            state={index % 2 === 0 ? "done" : "drawing"}
            name={name}
            statusLabel={index % 2 === 0 ? t("Done") : t("Still drawing")}
          />
        ))}
      </PlayerGrid>
    </StageFrame>
  );
};
