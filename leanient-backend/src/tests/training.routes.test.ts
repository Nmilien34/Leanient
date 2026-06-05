import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrainingTodayResponse } from "@leanient/shared";
import { issueSessionJwt } from "../auth/jwt";
import { AppError } from "../lib/errors";
import { ERROR_CODES } from "@leanient/shared";

const serviceMocks = vi.hoisted(() => ({
  getTrainingToday: vi.fn(),
}));

vi.mock("../services/training.service", () => ({
  getTrainingToday: serviceMocks.getTrainingToday,
}));

import { createApp } from "../server";

function trainingResponse(overrides: Partial<TrainingTodayResponse> = {}): TrainingTodayResponse {
  return {
    sessionsThisWeek: 1,
    weeklyTarget: 3,
    shotDayContext: {
      isOnProtocol: true,
      shotDayLabel: "SHOT DAY +2",
      daysUntilNextDose: 5,
    },
    featuredWorkout: {
      workout: {
        id: "workout_upper-body-dumbbell",
        slug: "upper-body-dumbbell",
        title: "Upper body strength",
        shortDescription: "Dumbbell push and pull focus",
        focus: "strength",
        energyPhase: "steady_energy",
        durationMinutes: 22,
        difficulty: "beginner",
        equipment: "dumbbells",
        intensity: "moderate",
        muscleGroups: ["chest", "back", "arms"],
        category: "strength",
        exercises: [
          {
            name: "Dumbbell bench press",
            sets: 3,
            reps: "8-10",
            restSeconds: 90,
            muscleGroups: ["chest", "triceps"],
            notes: null,
          },
        ],
        safetyNotes: [],
        tags: [],
        version: 1,
        active: true,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
      selectionReason: "strength_rotation",
      coachCopy: "Energy's good today. Dumbbells only.",
      coachCopyVersion: "v1.0-gpt-4o-mini",
    },
    recommendationEngineVersion: "v1.0",
    ...overrides,
  };
}

describe("training routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    serviceMocks.getTrainingToday.mockReset();
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/training/today");

    expect(response.status).toBe(401);
    expect(serviceMocks.getTrainingToday).not.toHaveBeenCalled();
  });

  it("returns today's training context for authenticated users", async () => {
    serviceMocks.getTrainingToday.mockResolvedValueOnce(trainingResponse());

    const response = await request(app).get("/training/today").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      sessionsThisWeek: 1,
      weeklyTarget: 3,
      shotDayContext: {
        isOnProtocol: true,
        shotDayLabel: "SHOT DAY +2",
      },
      featuredWorkout: {
        selectionReason: "strength_rotation",
        coachCopy: "Energy's good today. Dumbbells only.",
      },
      recommendationEngineVersion: "v1.0",
    });
    expect(serviceMocks.getTrainingToday).toHaveBeenCalledWith("user_1");
  });

  it("returns null coach copy when AI degraded", async () => {
    serviceMocks.getTrainingToday.mockResolvedValueOnce(
      trainingResponse({
        featuredWorkout: {
          ...trainingResponse().featuredWorkout!,
          coachCopy: null,
          coachCopyVersion: null,
        },
      }),
    );

    const response = await request(app).get("/training/today").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data.featuredWorkout.coachCopy).toBeNull();
  });

  it("propagates the onboarding guard status", async () => {
    serviceMocks.getTrainingToday.mockRejectedValueOnce(
      new AppError({
        code: ERROR_CODES.badRequest,
        message: "Complete onboarding before using training recommendations",
        statusCode: 403,
      }),
    );

    const response = await request(app).get("/training/today").set("Authorization", authorization);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe(ERROR_CODES.badRequest);
  });
});
