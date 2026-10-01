import { mkdir, readdir, readFile, rename, rm, statfs, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { QUESTION_IMAGE_CONTENT_TYPES, type QuestionImageContentType } from "@gamemash/shared";
import { IMAGE_EXTENSIONS, IMAGE_SESSIONS_PREFIX, type ImageStore, isSafeImagePathId } from "./image-store.js";

export const DISK_IMAGE_PATH = "/api/images";

export type DiskImageStoreOptions = {
  directory: string;
  minFreeBytes: number;
};

const isMissing = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";

const assertSafe = (...ids: string[]) => {
  if (!ids.every(isSafeImagePathId)) throw new Error("unsafe image path id");
};

export const createDiskImageStore = ({ directory, minFreeBytes }: DiskImageStoreOptions): ImageStore => {
  const sessionsDir = join(directory, IMAGE_SESSIONS_PREFIX);
  const sessionDir = (sessionId: string) => join(sessionsDir, sessionId);
  const imagePath = (sessionId: string, imageId: string, contentType: QuestionImageContentType) =>
    join(sessionDir(sessionId), `${imageId}.${IMAGE_EXTENSIONS[contentType]}`);

  const readVariant = async (sessionId: string, imageId: string, contentType: QuestionImageContentType) => {
    try {
      return { bytes: await readFile(imagePath(sessionId, imageId, contentType)), contentType };
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  };

  return {
    put: async (sessionId, imageId, bytes, contentType) => {
      assertSafe(sessionId, imageId);
      await mkdir(sessionDir(sessionId), { recursive: true });
      const target = imagePath(sessionId, imageId, contentType);
      const partial = `${target}.partial`;
      await writeFile(partial, bytes);
      await rename(partial, target);
    },
    presignedUrl: async (sessionId, imageId) => `${DISK_IMAGE_PATH}/${sessionId}/${imageId}`,
    get: async (sessionId, imageId) => {
      if (!isSafeImagePathId(sessionId) || !isSafeImagePathId(imageId)) return null;
      for (const contentType of QUESTION_IMAGE_CONTENT_TYPES) {
        const image = await readVariant(sessionId, imageId, contentType);
        if (image) return image;
      }
      return null;
    },
    deleteImages: async (sessionId, imageIds) => {
      assertSafe(sessionId, ...imageIds);
      await Promise.all(
        imageIds.flatMap((imageId) =>
          QUESTION_IMAGE_CONTENT_TYPES.map((contentType) =>
            rm(imagePath(sessionId, imageId, contentType), { force: true }),
          ),
        ),
      );
    },
    deleteSession: async (sessionId) => {
      assertSafe(sessionId);
      await rm(sessionDir(sessionId), { recursive: true, force: true });
    },
    listSessionIds: async () => {
      try {
        return (await readdir(sessionsDir, { withFileTypes: true }))
          .filter((entry) => entry.isDirectory() && isSafeImagePathId(entry.name))
          .map((entry) => entry.name);
      } catch (error) {
        if (isMissing(error)) return [];
        throw error;
      }
    },
    hasRoom: async () => {
      await mkdir(directory, { recursive: true });
      const stats = await statfs(directory);
      return stats.bavail * stats.bsize >= minFreeBytes;
    },
  };
};
