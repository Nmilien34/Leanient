import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server";

describe("health check", () => {
  it("returns ok when the database health check passes", async () => {
    const app = createApp({ healthCheck: async () => true });

    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        status: "ok",
        db: "connected",
        service: "leanient-backend",
      },
    });
  });

  it("does not return conditional 304 responses for JSON API routes", async () => {
    const app = createApp({ healthCheck: async () => true });

    const firstResponse = await request(app).get("/healthz");
    const secondResponse = await request(app)
      .get("/healthz")
      .set("If-None-Match", firstResponse.headers.etag ?? "");

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body).toEqual(firstResponse.body);
    expect(secondResponse.headers.etag).toBeUndefined();
    expect(secondResponse.headers["cache-control"]).toContain("no-store");
  });
});
