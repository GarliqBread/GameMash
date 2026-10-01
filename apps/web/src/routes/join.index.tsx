import { createFileRoute, redirect } from "@tanstack/react-router";
import { toRoomCodeInput } from "../features/join/room-code";

type JoinSearch = {
  code?: string | undefined;
};

export const Route = createFileRoute("/join/")({
  validateSearch: (search: Record<string, unknown>): JoinSearch => ({
    code: typeof search.code === "string" ? toRoomCodeInput(search.code) || undefined : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.code) throw redirect({ to: "/join/$code", params: { code: search.code }, replace: true });
    throw redirect({ to: "/", replace: true });
  },
});
