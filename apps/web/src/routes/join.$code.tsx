import { normalizeRoomCode, ROOM_CODE_LENGTH } from "@gamemash/shared";
import { createFileRoute } from "@tanstack/react-router";
import { JoinScreen } from "../features/join/JoinScreen";

const JoinWithCodePage = () => {
  const { code } = Route.useParams();
  const initialCode = normalizeRoomCode(code)
    .replace(/[^A-Z]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
  return <JoinScreen initialCode={initialCode} />;
};

export const Route = createFileRoute("/join/$code")({
  component: JoinWithCodePage,
});
