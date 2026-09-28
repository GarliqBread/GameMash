export const HOST_MEMBER = "host";

export const createPresence = () => {
  const connections = new Map<string, Map<string, number>>();

  const countsFor = (sessionId: string) => connections.get(sessionId) ?? new Map<string, number>();

  return {
    connect: (sessionId: string, member: string) => {
      const counts = countsFor(sessionId);
      connections.set(sessionId, new Map(counts).set(member, (counts.get(member) ?? 0) + 1));
    },
    disconnect: (sessionId: string, member: string) => {
      const counts = new Map(countsFor(sessionId));
      const remaining = (counts.get(member) ?? 0) - 1;
      if (remaining > 0) counts.set(member, remaining);
      else counts.delete(member);
      if (counts.size > 0) connections.set(sessionId, counts);
      else connections.delete(sessionId);
    },
    count: (sessionId: string, member: string) => countsFor(sessionId).get(member) ?? 0,
    connectedPlayers: (sessionId: string) =>
      new Set([...countsFor(sessionId).keys()].filter((member) => member !== HOST_MEMBER)),
    has: (sessionId: string) => connections.has(sessionId),
    sessions: () => [...connections.keys()],
    forget: (sessionId: string) => {
      connections.delete(sessionId);
    },
  };
};

export type Presence = ReturnType<typeof createPresence>;
