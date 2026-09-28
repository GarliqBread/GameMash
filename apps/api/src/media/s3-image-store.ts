import { createHash } from "node:crypto";
import { AwsClient } from "aws4fetch";
import type { S3Config } from "../config.js";
import {
  IMAGE_CACHE_CONTROL,
  IMAGE_SESSIONS_PREFIX,
  type ImageStore,
  imageKey,
  PRESIGNED_URL_TTL_SECONDS,
  sessionImagesPrefix,
} from "./image-store.js";

const MAX_PAGE_SIZE = 1000;
const RETRIES = 2;
const SIGNING_WINDOW_MS = 10 * 60 * 1000;
const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export type S3ImageStoreOptions = {
  pageSize?: number | undefined;
  now?: (() => number) | undefined;
};

export class S3RequestError extends Error {
  constructor(action: string, status: number, body: string) {
    super(`S3 ${action} failed with status ${status}: ${body.slice(0, 500)}`);
  }
}

const unescapeXml = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|apos);/g, (_match, entity: string) => XML_ENTITIES[entity] ?? "");

const XML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };

const escapeXml = (text: string) => text.replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? "");

const xmlValues = (xml: string, tag: string) =>
  [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map((match) => unescapeXml(match[1] ?? ""));

const amzDate = (time: number) => new Date(time).toISOString().replace(/[:-]|\.\d{3}/g, "");

export const createS3ImageStore = (
  config: S3Config,
  { pageSize = MAX_PAGE_SIZE, now = Date.now }: S3ImageStoreOptions = {},
): ImageStore => {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: config.region,
    retries: RETRIES,
  });
  const bucketUrl = `${config.endpoint}/${encodeURIComponent(config.bucket)}`;
  const objectUrl = (key: string) => `${bucketUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;

  const send = async (action: string, url: string, init: RequestInit) => {
    const response = await client.fetch(url, init);
    if (!response.ok) throw new S3RequestError(action, response.status, await response.text());
    return response;
  };

  const listPage = async (prefix: string, continuationToken: string | undefined, delimiter?: string) => {
    const url = new URL(bucketUrl);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    if (delimiter) url.searchParams.set("delimiter", delimiter);
    url.searchParams.set("max-keys", String(pageSize));
    if (continuationToken) url.searchParams.set("continuation-token", continuationToken);
    const xml = await (await send("list", url.toString(), { method: "GET" })).text();
    return {
      keys: xmlValues(xml, "Key"),
      prefixes: xmlValues(xml, "Prefix").filter((value) => value !== prefix),
      nextToken: xmlValues(xml, "IsTruncated")[0] === "true" ? xmlValues(xml, "NextContinuationToken")[0] : undefined,
    };
  };

  const deleteKeys = async (keys: string[]) => {
    const objects = keys.map((key) => `<Object><Key>${escapeXml(key)}</Key></Object>`).join("");
    const body = `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>true</Quiet>${objects}</Delete>`;
    const response = await send("delete", `${bucketUrl}?delete`, {
      method: "POST",
      headers: {
        "content-type": "application/xml",
        "content-md5": createHash("md5").update(body).digest("base64"),
      },
      body,
    });
    const xml = await response.text();
    if (xml.includes("<Error>")) throw new S3RequestError("delete", response.status, xml);
  };

  return {
    put: async (sessionId, imageId, bytes, contentType) => {
      await send("put", objectUrl(imageKey(sessionId, imageId)), {
        method: "PUT",
        headers: { "content-type": contentType, "cache-control": IMAGE_CACHE_CONTROL },
        body: new Uint8Array(bytes),
      });
    },
    presignedUrl: async (sessionId, imageId) => {
      const signedAt = Math.floor(now() / SIGNING_WINDOW_MS) * SIGNING_WINDOW_MS;
      const url = new URL(objectUrl(imageKey(sessionId, imageId)));
      url.searchParams.set("X-Amz-Expires", String(PRESIGNED_URL_TTL_SECONDS + SIGNING_WINDOW_MS / 1000));
      const signed = await client.sign(url.toString(), {
        method: "GET",
        aws: { signQuery: true, datetime: amzDate(signedAt) },
      });
      return signed.url;
    },
    deleteImages: async (sessionId, imageIds) => {
      for (let start = 0; start < imageIds.length; start += MAX_PAGE_SIZE) {
        await deleteKeys(imageIds.slice(start, start + MAX_PAGE_SIZE).map((imageId) => imageKey(sessionId, imageId)));
      }
    },
    deleteSession: async (sessionId) => {
      const prefix = sessionImagesPrefix(sessionId);
      let continuationToken: string | undefined;
      do {
        const page = await listPage(prefix, continuationToken);
        if (page.keys.length > 0) await deleteKeys(page.keys);
        continuationToken = page.nextToken;
      } while (continuationToken);
    },
    listSessionIds: async () => {
      const ids: string[] = [];
      let continuationToken: string | undefined;
      do {
        const page = await listPage(IMAGE_SESSIONS_PREFIX, continuationToken, "/");
        ids.push(...page.prefixes.map((prefix) => prefix.slice(IMAGE_SESSIONS_PREFIX.length).replace(/\/$/, "")));
        continuationToken = page.nextToken;
      } while (continuationToken);
      return ids;
    },
    hasRoom: async () => true,
  };
};
