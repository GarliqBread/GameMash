import {
  IMAGE_SESSIONS_PREFIX,
  type ImageStore,
  imageKey,
  PRESIGNED_URL_TTL_SECONDS,
  type StoredImage,
  sessionImagesPrefix,
} from "./image-store.js";

export type { StoredImage };

const MEMORY_ORIGIN = "https://images.memory.test";

export type MemoryImageStore = ImageStore & {
  read: (url: string) => StoredImage | null;
  keys: () => string[];
};

export const createMemoryImageStore = (now: () => number = Date.now): MemoryImageStore => {
  const objects = new Map<string, StoredImage>();

  return {
    put: async (sessionId, imageId, bytes, contentType) => {
      objects.set(imageKey(sessionId, imageId), { bytes: Buffer.from(bytes), contentType });
    },
    get: async (sessionId, imageId) => objects.get(imageKey(sessionId, imageId)) ?? null,
    presignedUrl: async (sessionId, imageId) => {
      const url = new URL(imageKey(sessionId, imageId), MEMORY_ORIGIN);
      url.searchParams.set("expires", String(now() + PRESIGNED_URL_TTL_SECONDS * 1000));
      return url.toString();
    },
    deleteImages: async (sessionId, imageIds) => {
      for (const imageId of imageIds) objects.delete(imageKey(sessionId, imageId));
    },
    deleteSession: async (sessionId) => {
      const prefix = sessionImagesPrefix(sessionId);
      for (const key of [...objects.keys()]) if (key.startsWith(prefix)) objects.delete(key);
    },
    listSessionIds: async () => [
      ...new Set([...objects.keys()].map((key) => key.slice(IMAGE_SESSIONS_PREFIX.length).split("/")[0] ?? "")),
    ],
    hasRoom: async () => true,
    read: (url) => {
      const parsed = URL.parse(url);
      if (!parsed || parsed.origin !== MEMORY_ORIGIN) return null;
      if (Number(parsed.searchParams.get("expires")) <= now()) return null;
      return objects.get(parsed.pathname.slice(1)) ?? null;
    },
    keys: () => [...objects.keys()],
  };
};
