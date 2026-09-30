import { AwsClient } from "aws4fetch";
import type { S3Config } from "../config.js";

const CONNECT_TIMEOUT_MS = 1000;
const BUCKET_EXISTS = 409;

export const testS3Config: S3Config = {
  endpoint: process.env.TEST_S3_ENDPOINT ?? "http://localhost:9000",
  bucket: process.env.TEST_S3_BUCKET ?? "gamemash-test",
  accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID ?? "minioadmin",
  secretAccessKey: process.env.TEST_S3_SECRET_ACCESS_KEY ?? "minioadmin",
  region: "auto",
};

export const connectTestS3 = async (): Promise<S3Config | undefined> => {
  const client = new AwsClient({ ...testS3Config, service: "s3", retries: 0 });
  try {
    const response = await client.fetch(`${testS3Config.endpoint}/${testS3Config.bucket}`, {
      method: "PUT",
      signal: AbortSignal.timeout(CONNECT_TIMEOUT_MS),
    });
    if (!response.ok && response.status !== BUCKET_EXISTS) {
      throw new Error(`could not create test bucket: ${response.status} ${await response.text()}`);
    }
    return testS3Config;
  } catch (error) {
    if (process.env.CI) throw new Error("S3 storage is required for tests in CI", { cause: error });
    return undefined;
  }
};
