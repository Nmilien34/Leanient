import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

function replaceEnv(values: Record<string, string | undefined>): void {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  Object.assign(process.env, values);
}

function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    PORT: "3001",
    MONGODB_URI: "mongodb://127.0.0.1:27017/leanient_test",
    JWT_SECRET: "test_secret_that_is_at_least_32_characters",
    JWT_EXPIRES_IN: "30d",
    GOOGLE_CLIENT_ID: "google-test-client-id.apps.googleusercontent.com",
    FRONTEND_ORIGIN: "http://localhost:8081",
    AWS_REGION: "us-east-2",
    AWS_S3_BUCKET_NAME: "leanient-test-photos",
    AWS_ACCESS_KEY_ID: "test-access-key",
    AWS_SECRET_ACCESS_KEY: "test-secret-key",
    REVENUECAT_WEBHOOK_SECRET: "test-revenuecat-secret",
    ...overrides,
  };
}

async function loadEnvModule(values: Record<string, string | undefined>) {
  vi.resetModules();
  vi.doMock("dotenv", () => ({
    default: { config: vi.fn() },
    config: vi.fn(),
  }));
  replaceEnv(values);
  return import("../../config/env");
}

describe("env Apple configuration", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("dotenv");
    replaceEnv(originalEnv);
  });

  it("loads production env without Apple credentials", async () => {
    const { env } = await loadEnvModule(productionEnv());

    expect(env.isProduction).toBe(true);
    expect(env.apple).toBeNull();
  });

  it("exposes a complete Apple config when every Apple credential is present", async () => {
    const { env } = await loadEnvModule(
      productionEnv({
        APPLE_CLIENT_ID: "ai.boltzman.leanient",
        APPLE_TEAM_ID: "TEAMID1234",
        APPLE_KEY_ID: "APPLEKEY123",
        APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----",
      }),
    );

    expect(env.apple).toEqual({
      clientId: "ai.boltzman.leanient",
      teamId: "TEAMID1234",
      keyId: "APPLEKEY123",
      privateKey: "-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----",
    });
  });
});
