import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, type TodaysFocusResponse } from "@leanient/shared";
import { issueSessionJwt } from "../auth/jwt";
import { AppError } from "../lib/errors";

const serviceMocks = vi.hoisted(() => ({
  getTodaysFocus: vi.fn(),
}));

vi.mock("../services/todaysFocus.service", () => ({
  getTodaysFocus: serviceMocks.getTodaysFocus,
}));

import { createApp } from "../server";

function focusResponse(overrides: Partial<TodaysFocusResponse> = {}): TodaysFocusResponse {
  return {
    category: "protein_gap",
    headline: "30g protein at lunch",
    suggestion: "Try Greek yogurt and protein powder, about 30g.",
    actionType: "log_meal",
    actionLabel: "Log this meal",
    selectionReason: "protein is behind target today",
    engineVersion: "v1.0",
    generatedAt: "2026-06-04T12:00:00.000Z",
    ...overrides,
  };
}

describe("home routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    serviceMocks.getTodaysFocus.mockReset();
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/home/focus");

    expect(response.status).toBe(401);
    expect(serviceMocks.getTodaysFocus).not.toHaveBeenCalled();
  });

  it("returns today's focus for authenticated users", async () => {
    serviceMocks.getTodaysFocus.mockResolvedValueOnce(focusResponse());

    const response = await request(app).get("/home/focus").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      category: "protein_gap",
      headline: "30g protein at lunch",
      actionType: "log_meal",
      selectionReason: "protein is behind target today",
    });
    expect(serviceMocks.getTodaysFocus).toHaveBeenCalledWith("user_1");
  });

  it("returns cached focus payloads from the service unchanged", async () => {
    serviceMocks.getTodaysFocus.mockResolvedValueOnce(
      focusResponse({
        category: "steady_state",
        headline: "Keep the rhythm",
        suggestion: "A boring day is allowed. Hit the basics and move on.",
        actionType: "none",
        actionLabel: null,
      }),
    );

    const response = await request(app).get("/home/focus").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      category: "steady_state",
      actionType: "none",
      actionLabel: null,
    });
  });

  it("returns null copy fields when AI degraded", async () => {
    serviceMocks.getTodaysFocus.mockResolvedValueOnce(
      focusResponse({
        headline: null,
        suggestion: null,
        actionType: "none",
        actionLabel: null,
      }),
    );

    const response = await request(app).get("/home/focus").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data.headline).toBeNull();
    expect(response.body.data.suggestion).toBeNull();
  });

  it("propagates the onboarding guard status", async () => {
    serviceMocks.getTodaysFocus.mockRejectedValueOnce(
      new AppError({
        code: ERROR_CODES.badRequest,
        message: "Complete onboarding before viewing today's focus",
        statusCode: 403,
      }),
    );

    const response = await request(app).get("/home/focus").set("Authorization", authorization);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(ERROR_CODES.badRequest);
  });
});
