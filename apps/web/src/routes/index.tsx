import { createFileRoute } from "@tanstack/react-router";
import { JoinScreen } from "../features/join/JoinScreen";

const JoinPage = () => <JoinScreen initialCode="" />;

export const Route = createFileRoute("/")({
  component: JoinPage,
});
