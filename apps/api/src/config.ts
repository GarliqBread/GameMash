import { BYTES_PER_MB } from "./units.js";
export type S3Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};

export type Config = {
  host: string;
  port: number;
  redisUrl: string;
  logLevel: string;
  trustProxy: string[];
  s3: S3Config | null;
  imagesDir: string | null;
  imagesMinFreeBytes: number;
  maxActiveImages: number | undefined;
};

const DEFAULT_PORT = 3000;
const DEFAULT_S3_REGION = "auto";
const DEFAULT_IMAGES_MIN_FREE_MB = 1024;
const S3_VARIABLES = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

const parsePort = (raw: string | undefined) => {
  if (raw === undefined || raw === "") return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: "${raw}"`);
  }
  return port;
};

const parseList = (raw: string | undefined) =>
  (raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseEndpoint = (raw: string) => {
  const url = URL.parse(raw);
  const isHttp = url?.protocol === "http:" || url?.protocol === "https:";
  if (!url || !isHttp || url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`Invalid S3_ENDPOINT: "${raw}"`);
  }
  return url.origin;
};

const parseS3 = (env: NodeJS.ProcessEnv): S3Config | null => {
  const missing = S3_VARIABLES.filter((name) => !env[name]);
  if (missing.length === S3_VARIABLES.length) return null;
  if (missing.length > 0) throw new Error(`Incomplete S3 configuration, missing: ${missing.join(", ")}`);
  return {
    endpoint: parseEndpoint(env.S3_ENDPOINT ?? ""),
    bucket: env.S3_BUCKET ?? "",
    accessKeyId: env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? "",
    region: env.S3_REGION || DEFAULT_S3_REGION,
  };
};

const parsePositiveInteger = (name: string, raw: string | undefined) => {
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${name}: "${raw}"`);
  return value;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => ({
  host: env.HOST || "0.0.0.0",
  port: parsePort(env.PORT),
  redisUrl: env.REDIS_URL || "redis://localhost:6380",
  logLevel: env.LOG_LEVEL || "info",
  trustProxy: parseList(env.TRUST_PROXY),
  s3: parseS3(env),
  imagesDir: env.IMAGES_DIR || null,
  imagesMinFreeBytes:
    (parsePositiveInteger("IMAGES_MIN_FREE_MB", env.IMAGES_MIN_FREE_MB) ?? DEFAULT_IMAGES_MIN_FREE_MB) * BYTES_PER_MB,
  maxActiveImages: parsePositiveInteger("IMAGES_MAX_ACTIVE", env.IMAGES_MAX_ACTIVE),
});
