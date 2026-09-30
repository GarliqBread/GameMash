import { createFileRoute } from "@tanstack/react-router";
import { HostScreen } from "../features/host/HostScreen";

export const Route = createFileRoute("/host/")({
  component: HostScreen,
});
