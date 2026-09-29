import type {
  Avatar,
  AvatarChangeResult,
  GameRecord,
  PlayerRecord,
  SessionImage,
  SessionRecord,
  SessionStore,
} from "./store.js";

type SessionEntry = {
  session: SessionRecord;
  players: PlayerRecord[];
  nameKeys: Map<string, string>;
  avatars: Map<string, Avatar>;
  setup: string | null;
  summary: string | null;
  images: SessionImage[];
  game: GameRecord | null;
  inputs: Map<string, string>;
  uploads: Map<string, string>;
  expiresAt: number;
};

const withoutAvatar = (entry: SessionEntry, playerId: string) =>
  new Map([...entry.avatars].filter(([id]) => id !== playerId));

export const createMemorySessionStore = (now: () => number = Date.now): SessionStore => {
  const sessions = new Map<string, SessionEntry>();
  const rooms = new Map<string, string>();
  const activeImages = new Map<string, number>();

  const activeImageCount = () => {
    for (const [member, leaseUntil] of activeImages) if (leaseUntil <= now()) activeImages.delete(member);
    return activeImages.size;
  };

  const live = (sessionId: string | undefined) => {
    if (!sessionId) return undefined;
    const entry = sessions.get(sessionId);
    if (!entry) return undefined;
    if (entry.expiresAt > now()) return entry;
    sessions.delete(sessionId);
    rooms.delete(entry.session.roomCode);
    return undefined;
  };

  const changeAvatar = (
    sessionId: string,
    playerId: string,
    change: (entry: SessionEntry) => SessionEntry,
  ): AvatarChangeResult => {
    const entry = live(sessionId);
    if (!entry) return "session_not_found";
    if (entry.session.status !== "lobby") return "locked";
    if (!entry.players.some((player) => player.id === playerId)) return "player_not_found";
    sessions.set(sessionId, change(entry));
    return "saved";
  };

  const update = (sessionId: string, change: (entry: SessionEntry) => SessionEntry) => {
    const entry = live(sessionId);
    if (!entry) return false;
    sessions.set(sessionId, change(entry));
    return true;
  };

  return {
    create: async (session, expiresAt) => {
      if (live(rooms.get(session.roomCode))) return "room_code_taken";
      rooms.set(session.roomCode, session.id);
      sessions.set(session.id, {
        session,
        players: [],
        nameKeys: new Map(),
        avatars: new Map(),
        setup: null,
        summary: null,
        images: [],
        game: null,
        inputs: new Map(),
        uploads: new Map(),
        expiresAt,
      });
      return "created";
    },
    findByRoomCode: async (roomCode) => live(rooms.get(roomCode))?.session ?? null,
    findById: async (sessionId) => live(sessionId)?.session ?? null,
    addPlayer: async (sessionId, player, { nameKey, maxPlayers, expiresAt }) => {
      const entry = live(sessionId);
      if (!entry) return "session_not_found";
      if (entry.players.length >= maxPlayers) return "session_full";
      if (entry.nameKeys.has(nameKey)) return "name_taken";
      sessions.set(sessionId, {
        ...entry,
        players: [...entry.players, player],
        nameKeys: new Map(entry.nameKeys).set(nameKey, player.id),
        expiresAt,
      });
      return "added";
    },
    findPlayer: async (sessionId, playerId) =>
      live(sessionId)?.players.find((player) => player.id === playerId) ?? null,
    listPlayers: async (sessionId) => (live(sessionId)?.players ?? []).toSorted((a, b) => a.joinedAt - b.joinedAt),
    removePlayer: async (sessionId, playerId, nameKey, expiresAt) => {
      const entry = live(sessionId);
      if (!entry) return "session_not_found";
      if (entry.session.status !== "lobby") return "locked";
      if (!entry.players.some((player) => player.id === playerId)) return "player_not_found";
      const nameKeys = new Map(entry.nameKeys);
      if (nameKeys.get(nameKey) === playerId) nameKeys.delete(nameKey);
      sessions.set(sessionId, {
        ...entry,
        players: entry.players.filter((player) => player.id !== playerId),
        nameKeys,
        avatars: withoutAvatar(entry, playerId),
        expiresAt,
      });
      return "removed";
    },
    setStatus: async (sessionId, status) =>
      update(sessionId, (entry) => ({ ...entry, session: { ...entry.session, status } })),
    setAvatar: async (sessionId, playerId, avatar, expiresAt) =>
      changeAvatar(sessionId, playerId, (entry) => ({
        ...entry,
        avatars: new Map(entry.avatars).set(playerId, avatar),
        expiresAt,
      })),
    removeAvatar: async (sessionId, playerId, expiresAt) =>
      changeAvatar(sessionId, playerId, (entry) => ({ ...entry, avatars: withoutAvatar(entry, playerId), expiresAt })),
    setCharacter: async (sessionId, changed, expiresAt) =>
      changeAvatar(sessionId, changed.id, (entry) => ({
        ...entry,
        players: entry.players.map((player) => (player.id === changed.id ? changed : player)),
        avatars: withoutAvatar(entry, changed.id),
        expiresAt,
      })),
    getAvatar: async (sessionId, playerId) => live(sessionId)?.avatars.get(playerId) ?? null,
    avatarVersions: async (sessionId) =>
      new Map([...(live(sessionId)?.avatars ?? new Map<string, Avatar>())].map(([id, avatar]) => [id, avatar.version])),
    getSetup: async (sessionId) => live(sessionId)?.setup ?? null,
    getLobbySummary: async (sessionId) => live(sessionId)?.summary ?? null,
    saveSetup: async (sessionId, setup, summary, expiresAt) => {
      const entry = live(sessionId);
      if (!entry) return "session_not_found";
      if (entry.session.status !== "lobby") return "setup_locked";
      sessions.set(sessionId, { ...entry, setup, summary, expiresAt });
      return entry.summary === summary ? "unchanged" : "changed";
    },
    addImage: async (sessionId, imageId, { maxPerSession, maxActive, expiresAt, leaseUntil, uploadedAt }) => {
      const entry = live(sessionId);
      if (!entry) return "session_not_found";
      if (entry.session.status !== "lobby") return "setup_locked";
      if (entry.images.some((image) => image.id === imageId)) return "added";
      if (entry.images.length >= maxPerSession) return "limit_reached";
      if (activeImageCount() >= maxActive) return "storage_full";
      activeImages.set(`${sessionId}/${imageId}`, leaseUntil);
      sessions.set(sessionId, { ...entry, images: [...entry.images, { id: imageId, uploadedAt }], expiresAt });
      return "added";
    },
    removeImages: async (sessionId, imageIds) => {
      const removed = new Set(imageIds);
      for (const id of removed) activeImages.delete(`${sessionId}/${id}`);
      update(sessionId, (entry) => ({ ...entry, images: entry.images.filter((image) => !removed.has(image.id)) }));
    },
    releaseImages: async (sessionId) => {
      for (const member of [...activeImages.keys()])
        if (member.startsWith(`${sessionId}/`)) activeImages.delete(member);
      update(sessionId, (entry) => ({ ...entry, images: [] }));
    },
    listImages: async (sessionId) => (live(sessionId)?.images ?? []).map((image) => ({ ...image })),
    getGame: async (sessionId) => live(sessionId)?.game ?? null,
    saveGame: async (sessionId, expectedVersion, state, _expiresAt, clearUploads) => {
      const entry = live(sessionId);
      if (!entry) return "session_not_found";
      if ((entry.game?.version ?? null) !== expectedVersion) return "conflict";
      sessions.set(sessionId, {
        ...entry,
        game: { version: (expectedVersion ?? 0) + 1, state },
        inputs: new Map(),
        uploads: clearUploads ? new Map() : entry.uploads,
      });
      return "saved";
    },
    submitInput: async (sessionId, version, playerId, input, _expiresAt, replace) => {
      const entry = live(sessionId);
      if (!entry || entry.game?.version !== version) return "closed";
      if (!replace && entry.inputs.has(playerId)) return "duplicate";
      sessions.set(sessionId, { ...entry, inputs: new Map(entry.inputs).set(playerId, input) });
      return "accepted";
    },
    listInputs: async (sessionId) => new Map(live(sessionId)?.inputs),
    saveUpload: async (sessionId, version, playerId, payload) => {
      const entry = live(sessionId);
      if (!entry || entry.game?.version !== version) return "closed";
      sessions.set(sessionId, { ...entry, uploads: new Map(entry.uploads).set(playerId, payload) });
      return "saved";
    },
    getUpload: async (sessionId, playerId) => live(sessionId)?.uploads.get(playerId) ?? null,
    touch: async (session, expiresAt) => {
      update(session.id, (entry) => ({ ...entry, expiresAt }));
    },
  };
};
