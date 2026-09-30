import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@gamemash/shared";

const SECRET_BYTES = 32;

export const createSecret = () => randomBytes(SECRET_BYTES).toString("base64url");

export const hashSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");

export const matchesSecretHash = (secret: string, expectedHash: string) => {
  const actual = Buffer.from(hashSecret(secret), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const createId = () => randomUUID();

export const createRoomCode = () =>
  Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join("");
