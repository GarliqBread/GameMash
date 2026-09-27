import { Button } from "@base-ui/react/button";
import type { HealthResponse } from "@gamemash/shared";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { FormattedMessage } from "react-intl";
import { fetchJson } from "../lib/api";
import { socket, useSocketStore } from "../lib/socket";

const HomePage = () => {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => fetchJson<HealthResponse>("/api/health"),
  });
  const socketStatus = useSocketStore((state) => state.status);

  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, []);

  const serverStatus = health.isError ? "down" : (health.data?.redis ?? "pending");

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-16">
      <h1 className="text-5xl font-bold tracking-tight">
        <FormattedMessage id="app.title" />
      </h1>
      <p className="text-lg text-neutral-300">
        <FormattedMessage id="home.tagline" />
      </p>
      <ul className="flex flex-col gap-1 text-sm text-neutral-400">
        <li>
          <FormattedMessage id="home.serverStatus" values={{ status: serverStatus }} />
        </li>
        <li>
          <FormattedMessage id="home.socketStatus" values={{ status: socketStatus }} />
        </li>
      </ul>
      <Button
        className="self-start rounded-md bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-50 data-[disabled]:opacity-50"
        disabled={health.isFetching}
        onClick={() => health.refetch()}
      >
        <FormattedMessage id="home.recheck" />
      </Button>
    </main>
  );
};

export const Route = createFileRoute("/")({
  component: HomePage,
});
