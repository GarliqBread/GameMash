import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("uses defaults when env is empty", () => {
    expect(loadConfig({})).toEqual({
      host: "0.0.0.0",
      port: 3000,
      redisUrl: "redis://localhost:6380",
      logLevel: "info",
      trustProxy: [],
      s3: null,
      imagesDir: null,
      imagesMinFreeBytes: 1024 * 1024 * 1024,
      maxActiveImages: undefined,
    });
  });

  it("reads the disk image settings", () => {
    expect(
      loadConfig({ IMAGES_DIR: "/data/images", IMAGES_MIN_FREE_MB: "2048", IMAGES_MAX_ACTIVE: "500" }),
    ).toMatchObject({ imagesDir: "/data/images", imagesMinFreeBytes: 2048 * 1024 * 1024, maxActiveImages: 500 });
  });

  it.each([["IMAGES_MAX_ACTIVE"], ["IMAGES_MIN_FREE_MB"]])(
    "rejects a %s that is not a positive whole number",
    (name) => {
      expect(() => loadConfig({ [name]: "-3" })).toThrow(name);
      expect(() => loadConfig({ [name]: "1.5" })).toThrow(name);
    },
  );

  it("reads trusted proxies as a comma-separated list", () => {
    expect(loadConfig({ TRUST_PROXY: "loopback, 10.0.0.0/8" }).trustProxy).toEqual(["loopback", "10.0.0.0/8"]);
  });

  it("rejects an invalid port", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow('Invalid PORT: "abc"');
  });

  const s3Env = {
    S3_ENDPOINT: "http://localhost:9000/",
    S3_BUCKET: "gamemash-dev",
    S3_ACCESS_KEY_ID: "key",
    S3_SECRET_ACCESS_KEY: "secret",
  };

  it("reads the S3 settings and defaults the region to auto", () => {
    expect(loadConfig(s3Env).s3).toEqual({
      endpoint: "http://localhost:9000",
      bucket: "gamemash-dev",
      accessKeyId: "key",
      secretAccessKey: "secret",
      region: "auto",
    });
    expect(loadConfig({ ...s3Env, S3_REGION: "eu-west-1" }).s3?.region).toBe("eu-west-1");
  });

  it("rejects a partial S3 configuration", () => {
    expect(() => loadConfig({ S3_ENDPOINT: "http://localhost:9000", S3_BUCKET: "gamemash-dev" })).toThrow(
      "Incomplete S3 configuration, missing: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
    );
  });

  it.each(["localhost:9000", "https://host/storage/v1/s3", "https://host/?region=eu"])(
    "rejects the S3 endpoint %j",
    (endpoint) => {
      expect(() => loadConfig({ ...s3Env, S3_ENDPOINT: endpoint })).toThrow(`Invalid S3_ENDPOINT: "${endpoint}"`);
    },
  );
});
