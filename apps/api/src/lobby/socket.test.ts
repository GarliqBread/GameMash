import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import type {
  ClientToServerEvents,
  CreateSessionResponse,
  GameSnapshot,
  HandshakeAuth,
  JoinSessionResponse,
  LobbyState,
  ServerToClientEvents,
  SocketAck,
} from "@gamemash/shared";
import { io as connect, type Socket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import { createGameRunner } from "../game/runner.js";
import { testRules } from "../game/test-rules.js";
import { createMemoryImageStore, type MemoryImageStore } from "../media/memory-image-store.js";
import { createMemorySessionStore } from "../sessions/memory-store.js";
import { createSessionService, type SessionService } from "../sessions/service.js";
import { readySetup } from "../sessions/test-setup.js";
import { healthyRedis } from "../test-app.js";
import { createNotifier } from "./notifier.js";
import { attachLobby } from "./socket.js";

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

const WAIT_MS = 2000;
const cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

type ServerOptions = {
  now?: () => number;
  lobbyNow?: () => number;
  keepAliveMs?: number;
  authenticateHost?: (original: SessionService["authenticateHost"]) => SessionService["authenticateHost"];
  authenticatePlayer?: (original: SessionService["authenticatePlayer"]) => SessionService["authenticatePlayer"];
  images?: MemoryImageStore;
};

const startServer = async ({
  now,
  lobbyNow = now,
  keepAliveMs,
  authenticateHost,
  authenticatePlayer,
  images,
}: ServerOptions = {}) => {
  const notifier = createNotifier();
  const store = createMemorySessionStore(now);
  const sessions = createSessionService({ store, notifier, now, images });
  const app = buildApp({ redis: healthyRedis, sessions, rateLimit: false });
  const game = createGameRunner({ store, readSetup: sessions.readSetup, rules: [testRules], log: app.log, now });
  const lobbySessions = {
    ...sessions,
    ...(authenticateHost && { authenticateHost: authenticateHost(sessions.authenticateHost) }),
    ...(authenticatePlayer && { authenticatePlayer: authenticatePlayer(sessions.authenticatePlayer) }),
  };
  const lobby = attachLobby(app.server, {
    log: app.log,
    sessions: lobbySessions,
    notifier,
    game,
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

const nextGame = (socket: Client, predicate: (snapshot: GameSnapshot) => boolean) =>
  new Promise<GameSnapshot>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out waiting for game state")), WAIT_MS);
    const handler = (snapshot: GameSnapshot) => {
      if (!predicate(snapshot)) return;
      clearTimeout(timer);
      socket.off("game:state", handler);
      resolve(snapshot);
    };
    socket.on("game:state", handler);
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

  it("lets the host remove a player, who is told, disconnected and can join again", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const join = () =>
      server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, { name: "Priya" });
    const priya = await join();
    const host = server.client(hostAuth(session));
    const phone = server.client(playerAuth(session, priya));
    await nextState(host, (state) => state.players[0]?.isConnected === true);
    const kick = (socket: Client, payload: unknown) =>
      new Promise<SocketAck>((resolve) => socket.emit("player:kick", payload as { playerId: string }, resolve));

    expect(await kick(phone, { playerId: priya.playerId })).toEqual({ ok: false, error: { code: "unauthorized" } });
    expect(await kick(host, { playerId: "not-a-uuid" })).toEqual({ ok: false, error: { code: "bad_request" } });

    const told = new Promise<void>((resolve) => phone.on("player:removed", () => resolve()));
    const disconnected = new Promise<string>((resolve) => phone.on("disconnect", (reason) => resolve(reason)));
    const emptied = nextState(host, (state) => state.players.length === 0);
    expect(await kick(host, { playerId: priya.playerId })).toEqual({ ok: true });
    await told;
    expect(await disconnected).toBe("io server disconnect");
    await emptied;

    expect(await connectError(server.client(playerAuth(session, priya)))).toBe("unauthorized");
    expect(await kick(host, { playerId: priya.playerId })).toEqual({ ok: false, error: { code: "not_found" } });
    const rejoined = nextState(host, (state) => state.players.length === 1);
    expect((await join()).playerId).toEqual(expect.any(String));
    await rejoined;
  });

  it("drops a phone whose player was removed while it was connecting", async () => {
    let kickDuringHandshake = async () => undefined as unknown;
    const server = await startServer({
      authenticatePlayer: (original) => async (sessionId, playerId, playerToken) => {
        const match = await original(sessionId, playerId, playerToken);
        await kickDuringHandshake();
        return match;
      },
    });
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Priya",
    });
    const host = server.client(hostAuth(session));
    await nextState(host, (state) => state.players.length === 1);
    kickDuringHandshake = () =>
      new Promise<SocketAck>((resolve) => host.emit("player:kick", { playerId: priya.playerId }, resolve));

    const phone = server.client(playerAuth(session, priya));
    const told = new Promise<void>((resolve) => phone.on("player:removed", () => resolve()));
    const disconnected = new Promise<string>((resolve) => phone.on("disconnect", (reason) => resolve(reason)));

    await told;
    expect(await disconnected).toBe("io server disconnect");
  });

  it("only removes players while the session is in the lobby", async () => {
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
    const host = server.client(hostAuth(session));
    await nextState(host, () => true);
    await new Promise<SocketAck>((resolve) => host.emit("session:start", resolve));

    const result = await new Promise<SocketAck>((resolve) =>
      host.emit("player:kick", { playerId: priya.playerId }, resolve),
    );

    expect(result).toEqual({ ok: false, error: { code: "kick_locked" } });
  });

  it("runs the game: per-viewer state, one answer per player, host-only Next", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Priya",
    });
    const daan = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Daan",
    });
    await fetch(`${server.url}/api/sessions/${session.sessionId}/setup`, {
      method: "PUT",
      headers: { authorization: `Bearer ${session.hostToken}`, "content-type": "application/json" },
      body: JSON.stringify(readySetup()),
    });
    const priyaPhone = server.client(playerAuth(session, priya));
    const daanPhone = server.client(playerAuth(session, daan));
    const host = server.client(hostAuth(session));
    await nextState(host, (state) => state.players.every((player) => player.isConnected));
    const emit = (socket: Client, event: "game:next" | "game:input", payload: unknown) =>
      new Promise<SocketAck>((resolve) =>
        (socket.emit as (name: string, data: unknown, ack: (result: SocketAck) => void) => void)(
          event,
          payload,
          resolve,
        ),
      );

    const asking = nextGame(host, (snapshot) => snapshot.status === "playing" && snapshot.phase === "ask");
    const priyaAsking = nextGame(priyaPhone, (snapshot) => snapshot.status === "playing");
    await new Promise<SocketAck>((resolve) => host.emit("session:start", resolve));
    expect(await asking).toMatchObject({ phaseId: 1, view: { answered: 0 } });
    expect(await priyaAsking).toMatchObject({ phaseId: 1, view: { mine: null, isParticipant: true } });

    expect(await emit(host, "game:input", { phaseId: 1, input: "right" })).toEqual({
      ok: false,
      error: { code: "unauthorized" },
    });
    expect(await emit(priyaPhone, "game:input", { phaseId: 1 })).toEqual({ ok: false, error: { code: "bad_request" } });
    const priyaLocked = nextGame(priyaPhone, (snapshot) => snapshot.status === "playing" && snapshot.view !== null);
    expect(await emit(priyaPhone, "game:input", { phaseId: 1, input: "right" })).toEqual({ ok: true });
    expect(await emit(priyaPhone, "game:input", { phaseId: 1, input: "wrong" })).toEqual({
      ok: false,
      error: { code: "already_submitted" },
    });
    expect(await priyaLocked).toMatchObject({ view: { mine: "right" } });

    const revealed = nextGame(host, (snapshot) => snapshot.status === "playing" && snapshot.phase === "reveal");
    const daanSeesReveal = nextGame(daanPhone, (snapshot) => snapshot.status === "playing" && snapshot.phaseId === 2);
    expect(await emit(daanPhone, "game:input", { phaseId: 1, input: "wrong" })).toEqual({ ok: true });
    expect(await revealed).toMatchObject({ phaseId: 2, waitsForHost: true });
    expect(await daanSeesReveal).toMatchObject({ view: { mine: null, total: 0 } });

    expect(await emit(daanPhone, "game:next", { phaseId: 2 })).toEqual({ ok: false, error: { code: "unauthorized" } });
    const finished = nextGame(priyaPhone, (snapshot) => snapshot.status === "finished");
    expect(await emit(host, "game:next", { phaseId: 2 })).toEqual({ ok: true });
    expect(await finished).toMatchObject({
      standings: [
        { playerId: priya.playerId, points: 100 },
        { playerId: daan.playerId, points: 0 },
      ],
    });
  });

  it("sends the current game to a screen that reconnects mid-game", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    await fetch(`${server.url}/api/sessions/${session.sessionId}/setup`, {
      method: "PUT",
      headers: { authorization: `Bearer ${session.hostToken}`, "content-type": "application/json" },
      body: JSON.stringify(readySetup()),
    });
    const host = server.client(hostAuth(session));
    await nextState(host, () => true);
    await new Promise<SocketAck>((resolve) => host.emit("session:start", resolve));
    host.disconnect();

    const again = server.client(hostAuth(session));

    expect(await nextGame(again, () => true)).toMatchObject({ status: "playing", phase: "ask", phaseId: 1 });
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

  it("deletes the session's images when the session ends", async () => {
    const images = createMemoryImageStore();
    const almostSixHoursLater = () => Date.now() + 6 * 60 * 60 * 1000 - 100;
    const server = await startServer({ lobbyNow: almostSixHoursLater, keepAliveMs: 60_000, images });
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const upload = await fetch(`${server.url}/api/sessions/${session.sessionId}/images`, {
      method: "PUT",
      headers: { authorization: `Bearer ${session.hostToken}`, "content-type": "image/jpeg" },
      body: readFileSync(new URL("../sessions/fixtures/photo-256.jpg", import.meta.url)),
    });
    expect(upload.status).toBe(200);
    expect(images.keys()).toHaveLength(1);
    const host = server.client(hostAuth(session));
    const ended = new Promise<void>((resolve) => host.on("session:ended", () => resolve()));

    await ended;

    await expect.poll(() => images.keys()).toEqual([]);
  });

  it("lets only the host play again, and only once the last game is over", async () => {
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
    await new Promise<SocketAck>((resolve) => host.emit("session:start", resolve));

    const playerAttempt = await new Promise<SocketAck>((resolve) => phone.emit("session:reset", resolve));
    expect(playerAttempt).toEqual({ ok: false, error: { code: "unauthorized" } });
    const midGame = await new Promise<SocketAck>((resolve) => host.emit("session:reset", resolve));
    expect(midGame).toEqual({ ok: false, error: { code: "game_not_finished" } });
  });

  it("ends the session for everyone when the host asks, and frees the room code", async () => {
    const server = await startServer();
    const session = await server.post<CreateSessionResponse>("/api/sessions");
    const priya = await server.post<JoinSessionResponse>(`/api/sessions/${session.sessionId}/players`, {
      name: "Priya",
    });
    const phone = server.client(playerAuth(session, priya));
    const host = server.client(hostAuth(session));
    await nextState(phone, () => true);
    await nextState(host, () => true);

    const playerAttempt = await new Promise<SocketAck>((resolve) => phone.emit("session:end", resolve));
    expect(playerAttempt).toEqual({ ok: false, error: { code: "unauthorized" } });

    const ended = new Promise<void>((resolve) => phone.on("session:ended", () => resolve()));
    const hostAttempt = await new Promise<SocketAck>((resolve) => host.emit("session:end", resolve));
    expect(hostAttempt).toEqual({ ok: true });
    await ended;

    const lookup = await fetch(`${server.url}/api/sessions/by-code/${session.roomCode}`);
    expect(lookup.status).toBe(404);
    expect(await connectError(server.client(hostAuth(session)))).toBe("unauthorized");
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
