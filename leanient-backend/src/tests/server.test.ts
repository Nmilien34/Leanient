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
});
