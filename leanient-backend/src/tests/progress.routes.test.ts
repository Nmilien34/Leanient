import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CODES, type ProgressOverviewResponse } from "@leanient/shared";
import { issueSessionJwt } from "../auth/jwt";
import { AppError } from "../lib/errors";

const serviceMocks = vi.hoisted(() => ({
  getProgressOverview: vi.fn(),
}));

vi.mock("../services/muscleRetention.service", () => ({
  getProgressOverview: serviceMocks.getProgressOverview,
}));

import { createApp } from "../server";

function progressOverview(overrides: Partial<ProgressOverviewResponse> = {}): ProgressOverviewResponse {
  return {
    chart: {
      snapshots: [
        {
          id: "snapshot_1",
          userId: "user_1",
          weekOf: "2026-06-01T00:00:00.000Z",
          proteinScore: 100,
          trainingScore: 67,
          paceScore: 90,
          muscleRetentionScore: 87,
          retentionLabel: "keeping_muscle",
          weeklyWeightLossLb: 1,
          cumulativeWeightLossLb: 4,
          inputsUsed: {
            avgDailyProteinGrams: 120,
            sessionsCompleted: 2,
            weeklyWorkoutTarget: 3,
            dailyProteinTarget: 120,
            startWeight: 181,
            endWeight: 180,
            dataSource: {
              protein: "logs",
              training: "checkin_fallback",
              weight: "logs",
            },
          },
          engineVersion: "v1.0",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      currentLabel: "keeping_muscle",
      currentScore: 87,
    },
    summary: {
      weeksOnProtocol: 6,
      medicationName: "Wegovy",
      startingWeight: 184,
      currentWeight: 180,
      totalWeightLoss: 4,
      targetWeight: 165,
      remainingToTarget: 15,
      estimatedFatLostLb: 3.4,
      estimatedMuscleLostLb: 0.6,
      fatShareOfLossPct: 85,
    },
    engineVersion: "v1.0",
    ...overrides,
  };
}

describe("progress routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    serviceMocks.getProgressOverview.mockReset();
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/progress/overview");

    expect(response.status).toBe(401);
    expect(serviceMocks.getProgressOverview).not.toHaveBeenCalled();
  });

  it("returns progress overview for an authenticated user", async () => {
    serviceMocks.getProgressOverview.mockResolvedValueOnce(progressOverview());

    const response = await request(app).get("/progress/overview").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      chart: {
        currentLabel: "keeping_muscle",
        currentScore: 87,
      },
      summary: {
        weeksOnProtocol: 6,
        medicationName: "Wegovy",
        totalWeightLoss: 4,
        targetWeight: 165,
      },
      engineVersion: "v1.0",
    });
    expect(serviceMocks.getProgressOverview).toHaveBeenCalledWith("user_1", 12);
  });

  it("returns empty snapshots for a new user with no check-ins", async () => {
    serviceMocks.getProgressOverview.mockResolvedValueOnce(
      progressOverview({
        chart: {
          snapshots: [],
          currentLabel: "maintaining",
          currentScore: 0,
        },
        summary: {
          weeksOnProtocol: 1,
          medicationName: "Wegovy",
          startingWeight: 184,
          currentWeight: 184,
          totalWeightLoss: 0,
          targetWeight: 165,
          remainingToTarget: 19,
          estimatedFatLostLb: 0,
          estimatedMuscleLostLb: 0,
          fatShareOfLossPct: 0,
        },
      }),
    );

    const response = await request(app).get("/progress/overview").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data.chart.snapshots).toEqual([]);
    expect(response.body.data.summary.totalWeightLoss).toBe(0);
  });

  it("honors the weeks query parameter", async () => {
    serviceMocks.getProgressOverview.mockResolvedValueOnce(progressOverview());

    const response = await request(app)
      .get("/progress/overview?weeks=4")
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(serviceMocks.getProgressOverview).toHaveBeenCalledWith("user_1", 4);
  });

  it("caps the weeks query parameter at 52", async () => {
    serviceMocks.getProgressOverview.mockResolvedValueOnce(progressOverview());

    const response = await request(app)
      .get("/progress/overview?weeks=100")
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(serviceMocks.getProgressOverview).toHaveBeenCalledWith("user_1", 52);
  });

  it("propagates the onboarding guard status", async () => {
    serviceMocks.getProgressOverview.mockRejectedValueOnce(
      new AppError({
        code: ERROR_CODES.badRequest,
        message: "Complete onboarding before viewing progress",
        statusCode: 403,
      }),
    );

    const response = await request(app).get("/progress/overview").set("Authorization", authorization);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(ERROR_CODES.badRequest);
  });
});
