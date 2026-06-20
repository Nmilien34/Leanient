import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../server";

describe("legal pages", () => {
  const app = createApp({ healthCheck: async () => true });

  it("serves the privacy policy as HTML at /privacy", async () => {
    const response = await request(app).get("/privacy");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Privacy Policy for Leanient");
  });

  it("serves the terms of use as HTML at /terms", async () => {
    const response = await request(app).get("/terms");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("Terms of Use for Leanient");
  });
});
