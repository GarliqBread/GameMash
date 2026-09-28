import { describe, expect, it } from "vitest";
import { sessionExpiresAt } from "./expiry.js";
import { createMemorySessionStore } from "./memory-store.js";
import { hashSecret } from "./secrets.js";
import { createSessionService, RoomCodesExhaustedError } from "./service.js";

const MINUTE = 60_000;

describe("createSessionService", () => {
  it("creates a lobby session and stores only a hash of the host token", async () => {
    const store = createMemorySessionStore();
    const service = createSessionService({ store, roomCode: () => "KWPX" });

    const created = await service.create();
    const stored = await store.findByRoomCode("KWPX");

    expect(created.roomCode).toBe("KWPX");
    expect(created.hostToken.length).toBeGreaterThanOrEqual(43);
    expect(stored?.status).toBe("lobby");
    expect(stored?.hostTokenHash).toBe(hashSecret(created.hostToken));
    expect(JSON.stringify(stored)).not.toContain(created.hostToken);
  });

  it("tries another room code when one is taken", async () => {
    const codes = ["KWPX", "KWPX", "ABCD"];
    const service = createSessionService({
      store: createMemorySessionStore(),
      roomCode: () => codes.shift() ?? "ZZZZ",
    });

    await service.create();
    const second = await service.create();

    expect(second.roomCode).toBe("ABCD");
  });

  it("gives up when no free room code can be found", async () => {
    const service = createSessionService({ store: createMemorySessionStore(), roomCode: () => "KWPX" });
    await service.create();

    await expect(service.create()).rejects.toBeInstanceOf(RoomCodesExhaustedError);
  });
});

describe("sessionExpiresAt", () => {
  it("expires 30 minutes after the last activity", () => {
    expect(sessionExpiresAt(0, 10 * MINUTE)).toBe(40 * MINUTE);
  });

  it("never lets a session live longer than 6 hours", () => {
    expect(sessionExpiresAt(0, 6 * 60 * MINUTE - 5 * MINUTE)).toBe(6 * 60 * MINUTE);
  });
});
