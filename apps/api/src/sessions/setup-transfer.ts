import { randomBytes } from "node:crypto";
import {
  isSetupValid,
  MAX_GAMES,
  mapImages,
  SETUP_FILE_ENTRY,
  SETUP_FILE_FORMAT,
  SETUP_FILE_VERSION,
  type SessionSetup,
  type SetupFile,
  type SetupImportResponse,
  setupImageIds,
  withNewIds,
  withoutImages,
} from "@gamemash/games/config";
import { SetupFileSchema } from "@gamemash/games/schemas";
import {
  type ErrorCode,
  hasHiddenCharacters,
  QUESTION_IMAGE_MAX_BYTES,
  type QuestionImage,
  type QuestionImageContentType,
  SETUP_IMPORT_MAX_BYTES,
} from "@gamemash/shared";
import { strFromU8, strToU8, type UnzipFileInfo, unzipSync, type Zippable, zipSync } from "fflate";
import { Value } from "typebox/value";
import type { StoredImage } from "../media/image-store.js";
import { fail, type Result } from "./result.js";
import type { SessionRecord } from "./store.js";

const SETUP_ENTRY_MAX_BYTES = 2 * 1024 * 1024;
const STORED = 0;
const ITEM_ID_BYTES = 9;
const UPLOAD_BATCH_SIZE = 4;
const IMAGE_ENTRY = /^images\/([A-Za-z0-9_-]{1,64})\.(webp|jpg)$/;

const EXTENSIONS: Record<QuestionImageContentType, string> = { "image/webp": "webp", "image/jpeg": "jpg" };
const CONTENT_TYPES: Record<string, QuestionImageContentType> = { webp: "image/webp", jpg: "image/jpeg" };

export type UploadOptions = { checkRoom: boolean };

export type SetupTransferDeps = {
  imagesEnabled: boolean;
  getSetup: (session: SessionRecord) => Promise<SessionSetup>;
  saveSetup: (session: SessionRecord, setup: SessionSetup) => Promise<Result<null>>;
  readImage: (sessionId: string, imageId: string) => Promise<StoredImage | null>;
  hasImageRoom: () => Promise<boolean>;
  uploadImage: (
    session: SessionRecord,
    bytes: Buffer,
    contentType: QuestionImageContentType,
    options: UploadOptions,
  ) => Promise<Result<QuestionImage>>;
  discardImages: (sessionId: string, imageIds: string[]) => Promise<void>;
};

type Archive = { file: SetupFile; images: Map<string, StoredImage> };

type Upload = { from: string; to: string };

class ImportFailure extends Error {
  constructor(public code: ErrorCode) {
    super(code);
  }
}

const newItemId = () => randomBytes(ITEM_ID_BYTES).toString("base64url");

const asBuffer = (bytes: Uint8Array) => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);

const imageEntryName = (imageId: string, image: StoredImage) => `images/${imageId}.${EXTENSIONS[image.contentType]}`;

const isStoredWithin = (entry: UnzipFileInfo, maxBytes: number) =>
  entry.compression === STORED && entry.size <= maxBytes;

const toImage = (name: string, bytes: Uint8Array): [string, StoredImage] | null => {
  const [, imageId, extension] = IMAGE_ENTRY.exec(name) ?? [];
  const contentType = extension ? CONTENT_TYPES[extension] : undefined;
  return imageId && contentType ? [imageId, { bytes: asBuffer(bytes), contentType }] : null;
};

const readSetupFile = (zip: Uint8Array): SetupFile | null => {
  const entries = unzipSync(zip, {
    filter: (entry) => entry.name === SETUP_FILE_ENTRY && isStoredWithin(entry, SETUP_ENTRY_MAX_BYTES),
  });
  const json = entries[SETUP_FILE_ENTRY];
  if (!json) return null;
  const file: unknown = JSON.parse(strFromU8(json));
  return Value.Check(SetupFileSchema, file) ? file : null;
};

const readImages = (zip: Uint8Array, imageIds: Set<string>) => {
  const isWanted = (entry: UnzipFileInfo) => {
    const imageId = IMAGE_ENTRY.exec(entry.name)?.[1];
    return imageId !== undefined && imageIds.has(imageId) && isStoredWithin(entry, QUESTION_IMAGE_MAX_BYTES);
  };
  const entries = unzipSync(zip, { filter: isWanted });
  return new Map(
    Object.entries(entries).flatMap(([name, data]) => {
      const image = toImage(name, data);
      return image ? [image] : [];
    }),
  );
};

const readArchive = (bytes: Buffer, imagesEnabled: boolean): Archive | null => {
  try {
    const zip = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const parsed = readSetupFile(zip);
    if (!parsed) return null;
    const file = imagesEnabled ? parsed : { ...parsed, setup: withoutImages(parsed.setup) };
    return { file, images: readImages(zip, new Set(setupImageIds(file.setup))) };
  } catch {
    return null;
  }
};

const isImportable = (setup: SessionSetup) => isSetupValid(setup) && !hasHiddenCharacters(setup.name);

const byteTotal = (images: StoredImage[]) => images.reduce((sum, image) => sum + image.bytes.byteLength, 0);

export const createSetupTransfer = ({
  imagesEnabled,
  getSetup,
  saveSetup,
  readImage,
  hasImageRoom,
  uploadImage,
  discardImages,
}: SetupTransferDeps) => {
  const exportSetup = async (session: SessionRecord): Promise<Result<Buffer>> => {
    const setup = await getSetup(session);
    const stored = await Promise.all(
      setupImageIds(setup).map(async (imageId) => [imageId, await readImage(session.id, imageId)] as const),
    );
    const found = new Map(stored.flatMap(([imageId, image]) => (image ? [[imageId, image] as const] : [])));
    if (byteTotal([...found.values()]) > SETUP_IMPORT_MAX_BYTES) return fail("export_too_large");
    const file: SetupFile = {
      format: SETUP_FILE_FORMAT,
      version: SETUP_FILE_VERSION,
      setup: mapImages(setup, (imageId) => (found.has(imageId) ? imageId : null)),
    };
    const entries: Zippable = {
      [SETUP_FILE_ENTRY]: [strToU8(JSON.stringify(file)), { level: STORED }],
      ...Object.fromEntries(
        [...found].map(([imageId, image]) => [imageEntryName(imageId, image), [image.bytes, { level: STORED }]]),
      ),
    };
    const zip = asBuffer(zipSync(entries));
    return zip.byteLength > SETUP_IMPORT_MAX_BYTES ? fail("export_too_large") : { ok: true, value: zip };
  };

  const uploadOne = async (session: SessionRecord, images: Map<string, StoredImage>, from: string) => {
    const image = images.get(from);
    if (!image) throw new ImportFailure("import_invalid");
    const result = await uploadImage(session, image.bytes, image.contentType, { checkRoom: false });
    if (!result.ok) throw new ImportFailure(result.error);
    return { from, to: result.value.id };
  };

  const uploadBatch = async (session: SessionRecord, images: Map<string, StoredImage>, imageIds: string[]) => {
    const settled = await Promise.allSettled(imageIds.map((imageId) => uploadOne(session, images, imageId)));
    const done = settled.flatMap((outcome) => (outcome.status === "fulfilled" ? [outcome.value] : []));
    const failed = settled.find((outcome) => outcome.status === "rejected");
    return { done, failure: failed?.status === "rejected" ? (failed.reason as unknown) : undefined };
  };

  const uploadAll = async (session: SessionRecord, images: Map<string, StoredImage>, imageIds: string[]) => {
    const uploads: Upload[] = [];
    for (let start = 0; start < imageIds.length; start += UPLOAD_BATCH_SIZE) {
      const batch = await uploadBatch(session, images, imageIds.slice(start, start + UPLOAD_BATCH_SIZE));
      uploads.push(...batch.done);
      if (batch.failure !== undefined) {
        await discardImages(
          session.id,
          uploads.map((upload) => upload.to),
        );
        throw batch.failure;
      }
    }
    return new Map(uploads.map((upload) => [upload.from, upload.to]));
  };

  const mergeAndSave = async (session: SessionRecord, incoming: SessionSetup) => {
    const current = await getSetup(session);
    if (current.games.length + incoming.games.length > MAX_GAMES) throw new ImportFailure("import_too_many_games");
    const merged: SessionSetup = {
      name: current.name || incoming.name,
      games: [...current.games, ...incoming.games.map((game) => withNewIds(game, newItemId))],
    };
    const saved = await saveSetup(session, merged);
    if (!saved.ok) throw new ImportFailure(saved.error);
    return merged;
  };

  const importArchive = async (session: SessionRecord, { file, images }: Archive) => {
    const imageIds = setupImageIds(file.setup);
    if (imageIds.length > 0 && !(await hasImageRoom())) throw new ImportFailure("image_storage_full");
    const uploaded = await uploadAll(session, images, imageIds);
    try {
      const incoming = mapImages(file.setup, (imageId) => uploaded.get(imageId) ?? null);
      return await mergeAndSave(session, incoming);
    } catch (error) {
      await discardImages(session.id, [...uploaded.values()]);
      throw error;
    }
  };

  const importSetup = async (session: SessionRecord, bytes: Buffer): Promise<Result<SetupImportResponse>> => {
    if (session.status !== "lobby") return fail("setup_locked");
    const archive = readArchive(bytes, imagesEnabled);
    if (!archive || !isImportable(archive.file.setup)) return fail("import_invalid");
    if ((await getSetup(session)).games.length + archive.file.setup.games.length > MAX_GAMES) {
      return fail("import_too_many_games");
    }
    try {
      const merged = await importArchive(session, archive);
      return { ok: true, value: { setup: merged, addedGames: archive.file.setup.games.length } };
    } catch (error) {
      if (error instanceof ImportFailure) return fail(error.code);
      throw error;
    }
  };

  return { exportSetup, importSetup };
};
