import type { AddressInfo } from "node:net";
import type {
  ClientToServerEvents,
  CreateSessionResponse,
  HandshakeAuth,
  JoinSessionResponse,
  LobbyState,
  ServerToClientEvents,
  SocketAck,
} from "@gamemash/shared";
import { io as connect, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import type { RedisHealth } from "../redis.js";
import { createMemorySessionStore } from "../sessions/memory-store.js";
import { createSessionService, type SessionService } from "../sessions/service.js";
import { readySetup } from "../sessions/test-setup.js";
import { createLobbyNotifier } from "./notifier.js";
import { attachLobby } from "./socket.js";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const WAIT_MS = 2000;
const redis = { ping: async () => "PONG", isReady: true } as unknown as RedisHealth;
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

type ServerOptions = {
  now?: () => number;
  lobbyNow?: () => number;
  keepAliveMs?: number;
  authenticateHost?: (original: SessionService["authenticateHost"]) => SessionService["authenticateHost"];
};

const startServer = async ({ now, lobbyNow = now, keepAliveMs, authenticateHost }: ServerOptions = {}) => {
  const notifier = createLobbyNotifier();
  const sessions = createSessionService({ store: createMemorySessionStore(now), notifier, now });
  const app = buildApp({ redis, sessions, rateLimit: false });
  const lobbySessions = authenticateHost
    ? { ...sessions, authenticateHost: authenticateHost(sessions.authenticateHost) }
    : sessions;
  const lobby = attachLobby(app.server, {
    log: app.log,
    sessions: lobbySessions,
    notifier,
    keepAliveMs,
    now: lobbyNow,
  });
  await app.listen({ host: "127.0.0.1", port: 0 });
  const { port } = app.server.address() as AddressInfo;
  const url = `http://127.0.0.1:${port}`;
  cleanups.push(async () => {
    await lobby.close();
    await app.close();
  });

  const post = async <T>(path: string, body?: unknown) => {
    const response = await fetch(`${url}${path}`, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : null,
    });
    return (await response.json()) as T;
  };

  const client = (auth: HandshakeAuth | Record<string, string>): Client => {
    const socket: Client = connect(url, { auth, transports: ["websocket"], reconnection: false, forceNew: true });
    cleanups.push(async () => {
      socket.disconnect();
    });
    return socket;
  };

  return { post, client, url };
};

const nextState = (socket: Client, predicate: (state: LobbyState) => boolean) =>
  new Promise<LobbyState>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out waiting for lobby state")), WAIT_MS);
    const handler = (state: LobbyState) => {
      if (!predicate(state)) return;
      clearTimeout(timer);
      socket.off("lobby:state", handler);
      resolve(state);
    };
    socket.on("lobby:state", handler);
  });

const connectError = (socket: Client) =>
  new Promise<string>((resolve) => socket.on("connect_error", (error) => resolve(error.message)));

const hostAuth = (session: CreateSessionResponse): HandshakeAuth => ({
  role: "host",
  sessionId: session.sessionId,
  hostToken: session.hostToken,
});

const playerAuth = (session: CreateSessionResponse, player: JoinSessionResponse): HandshakeAuth => ({
  role: "player",
  sessionId: session.sessionId,
  playerId: player.playerId,
  playerToken: player.playerToken,
});

describe("lobby socket", () => {
  it("rejects connections without valid credentials", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");

    expect(await connectError(server.client({ ...hostAuth(session), hostToken: "wrong" }))).toBe("unauthorized");
    expect(await connectError(server.client({ role: "spectator" }))).toBe("unauthorized");
  });

  it("shows players joining, connecting, dropping and resuming", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const host = server.client(hostAuth(session));
    await nextState(host, (state) => state.players.length === 0);

    const joined = nextState(host, (state) => state.players.length === 1);
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Priya",
    });
    expect((await joined).players[0]).toMatchObject({ name: "Priya", isConnected: false });

    const connected = nextState(host, (state) => state.players[0]?.isConnected === true);
    const phone = server.client(playerAuth(session, priya));
    expect((await connected).players[0]?.id).toBe(priya.playerId);

    const dropped = nextState(host, (state) => state.players[0]?.isConnected === false);
    phone.disconnect();
    await dropped;

    const resumed = nextState(host, (state) => state.players[0]?.isConnected === true);
    server.client(playerAuth(session, priya));
    expect((await resumed).players).toHaveLength(1);
  });

  it("never sends tokens to anyone", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Priya",
    });
    const phone = server.client(playerAuth(session, priya));

    const state = await nextState(phone, (lobby) => lobby.players.length === 1);

    const payload = JSON.stringify(state);
    expect(payload).not.toContain(session.hostToken);
    expect(payload).not.toContain(priya.playerToken);
    expect(payload).not.toContain("Hash");
  });

  it("lets only the host start the session, and late joiners still get in", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Priya",
    });
    await fetch(`${server.url}/api/sessions/${session.sessionId}/setup`, {
      method: "PUT",
      headers: { authorization: `Bearer ${session.hostToken}`, "content-type": "application/json" },
      body: JSON.stringify(readySetup()),
    });
    const phone = server.client(playerAuth(session, priya));
    const host = server.client(hostAuth(session));
    await nextState(host, () => true);

    const playerAttempt = await new Promise<SocketAck>((resolve) => phone.emit("session:start", resolve));
    expect(playerAttempt).toEqual({ ok: false, error: { code: "unauthorized" } });

    const playing = nextState(phone, (state) => state.status === "playing");
    const hostAttempt = await new Promise<SocketAck>((resolve) => host.emit("session:start", resolve));
    expect(hostAttempt).toEqual({ ok: true });
    await playing;

    const lateJoined = nextState(host, (state) => state.players.some((player) => player.name === "Late Lars"));
    await server.post(`/api/sessions/${session.sessionId}/players`, { name: "Late Lars" });
    expect((await lateJoined).status).toBe("playing");
  });

  it("rejects a wrong player token and credentials from another session", async () => {
    const server = await startServer();
    const first = await server.post<CreateSessionResponse>("/api/sessions");
    const second = await server.post<CreateSessionResponse>("/api/sessions");
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${first.sessionId}/players`, { name: "Priya" });

    expect(await connectError(server.client({ ...playerAuth(first, priya), playerToken: "wrong" }))).toBe(
      "unauthorized",
    );
    expect(await connectError(server.client(playerAuth(second, priya)))).toBe("unauthorized");
  });

  it("caps how many connections one player can open", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Priya",
    });
    const connected = (socket: Client) => new Promise<void>((resolve) => socket.on("connect", () => resolve()));

    await Promise.all([1, 2, 3].map(() => connected(server.client(playerAuth(session, priya)))));

    expect(await connectError(server.client(playerAuth(session, priya)))).toBe("rate_limited");
  });

  it("enforces the connection cap when many sockets connect at once", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Priya",
    });
    const outcome = (socket: Client) =>
      new Promise<string>((resolve) => {
        socket.on("connect", () => resolve("connected"));
        socket.on("connect_error", (error) => resolve(error.message));
      });

    const results = await Promise.all([1, 2, 3, 4, 5].map(() => outcome(server.client(playerAuth(session, priya)))));

    expect(results.filter((result) => result === "connected")).toHaveLength(3);
    expect(results.filter((result) => result === "rate_limited")).toHaveLength(2);
  });

  it("frees the connection slot when a screen drops during the handshake", async () => {
    const slowAuth =
      (original: SessionService["authenticateHost"]): SessionService["authenticateHost"] =>
      async (...args) => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return original(...args);
      };
    const server = await startServer({ authenticateHost: slowAuth });
    const session = await server.post<CreateSessionResponse>("/api/sessions");

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const dropped = server.client(hostAuth(session));
      await new Promise((resolve) => setTimeout(resolve, 30));
      dropped.disconnect();
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
    const outcome = (socket: Client) =>
      new Promise<string>((resolve) => {
        socket.on("connect", () => resolve("connected"));
        socket.on("connect_error", (error) => resolve(error.message));
      });

    const results = await Promise.all([1, 2, 3, 4, 5].map(() => outcome(server.client(hostAuth(session)))));

    expect(results).toEqual(["connected", "connected", "connected", "connected", "connected"]);
  });

  it("reports server errors during the handshake as internal errors, not as ended sessions", async () => {
    const failingAuth = (): SessionService["authenticateHost"] => async () => {
      throw new Error("redis is down");
    };
    const server = await startServer({ authenticateHost: failingAuth });
    const session = await server.post<CreateSessionResponse>("/api/sessions");

    expect(await connectError(server.client(hostAuth(session)))).toBe("internal_error");
  });

  it("ends the session at its maximum age even while screens keep it alive", async () => {
    const almostSixHoursLater = () => Date.now() + 6 * 60 * 60 * 1000 - 100;
    const server = await startServer({ lobbyNow: almostSixHoursLater, keepAliveMs: 60_000 });
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const host = server.client(hostAuth(session));
    const ended = new Promise<void>((resolve) => host.on("session:ended", () => resolve()));

    await ended;
  });

  it("tells everyone and disconnects them when the session expires", async () => {
    let now = Date.now();
    const server = await startServer({ now: () => now, keepAliveMs: 50 });
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const host = server.client(hostAuth(session));
    await nextState(host, () => true);
    const ended = new Promise<void>((resolve) => host.on("session:ended", () => resolve()));
    const disconnected = new Promise<void>((resolve) => host.on("disconnect", () => resolve()));

    now += 7 * 60 * 60 * 1000;

    await ended;
    await disconnected;
  });

  it("keeps the session alive while screens stay connected", async () => {
    let now = Date.now();
    const server = await startServer({ now: () => now, keepAliveMs: 50 });
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const host = server.client(hostAuth(session));
    await nextState(host, () => true);

    for (let step = 0; step < 3; step += 1) {
      now += 20 * 60 * 1000;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    expect(host.connected).toBe(true);
    const lookup = await fetch(`${server.url}/api/sessions/by-code/${session.roomCode}`);
    expect(lookup.status).toBe(200);
  });
});
