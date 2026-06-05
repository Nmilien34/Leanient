import type { StallDiagnosticResponse } from "@leanient/shared";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSessionJwt } from "../auth/jwt";

const serviceMocks = vi.hoisted(() => ({
  getStallDiagnostic: vi.fn(),
}));

vi.mock("../services/stallDiagnostic.service", () => ({
  getStallDiagnostic: serviceMocks.getStallDiagnostic,
}));

import { createApp } from "../server";

function stalledResponse(overrides: Partial<StallDiagnosticResponse> = {}): StallDiagnosticResponse {
  return {
    stalled: true,
    daysSinceWeightChange: 14,
    deterministicAnalysis: {
      weightTrend: {
        daysFlat: 14,
        startWeight: 184.2,
        endWeight: 184,
        unit: "lb",
      },
      proteinTrend: {
        recentAvgGrams: 95,
        priorAvgGrams: 125,
        deltaGrams: -30,
      },
      trainingTrend: {
        recentSessionsCount: 2,
        recentSessionsTarget: 4,
        priorSessionsCount: 5,
        priorSessionsTarget: 4,
      },
      doseTrend: null,
    },
    explanation:
      "You are not failing, and the medication is still working. Protein and training both slipped, so the scale got quiet.",
    suggestedFix: "Return to 125 grams of protein daily and complete two resistance sessions this week.",
    copyVersion: "v1.0-gpt-4o-mini",
    engineVersion: "v1.0",
    ...overrides,
  };
}

describe("diagnostics routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    serviceMocks.getStallDiagnostic.mockReset();
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("returns a stalled diagnostic response for an authenticated user", async () => {
    serviceMocks.getStallDiagnostic.mockResolvedValueOnce(stalledResponse());

    const response = await request(app)
      .post("/diagnostics/stall")
      .set("Authorization", authorization)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      stalled: true,
      explanation:
        "You are not failing, and the medication is still working. Protein and training both slipped, so the scale got quiet.",
      suggestedFix: "Return to 125 grams of protein daily and complete two resistance sessions this week.",
      engineVersion: "v1.0",
    });
    expect(serviceMocks.getStallDiagnostic).toHaveBeenCalledWith("user_1");
  });

  it("returns non-stalled diagnostics without AI prose", async () => {
    serviceMocks.getStallDiagnostic.mockResolvedValueOnce(
      stalledResponse({
        stalled: false,
        daysSinceWeightChange: 0,
        explanation: null,
        suggestedFix: null,
        copyVersion: null,
      }),
    );

    const response = await request(app)
      .post("/diagnostics/stall")
      .set("Authorization", authorization)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      stalled: false,
      explanation: null,
      suggestedFix: null,
      copyVersion: null,
    });
  });

  it("requires authentication", async () => {
    const response = await request(app).post("/diagnostics/stall").send({});

    expect(response.status).toBe(401);
    expect(serviceMocks.getStallDiagnostic).not.toHaveBeenCalled();
  });

  it("returns graceful null prose when the diagnostic service degraded after AI failure", async () => {
    serviceMocks.getStallDiagnostic.mockResolvedValueOnce(
      stalledResponse({
        explanation: null,
        suggestedFix: null,
        copyVersion: null,
      }),
    );

    const response = await request(app)
      .post("/diagnostics/stall")
      .set("Authorization", authorization)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      stalled: true,
      explanation: null,
      suggestedFix: null,
      copyVersion: null,
    });
  });
});
