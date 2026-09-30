import { describe, expect, it } from "vitest";
import { createPresence, HOST_MEMBER } from "./presence.js";

describe("presence", () => {
  it("counts connections per member and reports only connected players", () => {
    const presence = createPresence();
    presence.connect("s1", HOST_MEMBER);
    presence.connect("s1", "priya");
    presence.connect("s1", "priya");

    expect(presence.count("s1", "priya")).toBe(2);
    expect(presence.connectedPlayers("s1")).toEqual(new Set(["priya"]));

    presence.disconnect("s1", "priya");
    expect(presence.connectedPlayers("s1")).toEqual(new Set(["priya"]));

    presence.disconnect("s1", "priya");
    expect(presence.connectedPlayers("s1")).toEqual(new Set());
    expect(presence.sessions()).toEqual(["s1"]);
  });

  it("forgets a session once nobody is connected", () => {
    const presence = createPresence();
    presence.connect("s1", "priya");
    presence.disconnect("s1", "priya");

    expect(presence.sessions()).toEqual([]);
  });
});
