import { createFileRoute } from "@tanstack/react-router";
import { JoinScreen } from "../features/join/JoinScreen";
import { toRoomCodeInput } from "../features/join/room-code";

const JoinWithCodePage = () => {
  const { code } = Route.useParams();
  return <JoinScreen initialCode={toRoomCodeInput(code)} />;
};

export const Route = createFileRoute("/join/$code")({
  component: JoinWithCodePage,
});
