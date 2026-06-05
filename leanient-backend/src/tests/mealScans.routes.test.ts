import { ERROR_CODES, type MealScanAnalysis, type MealScanCoachContent } from "@leanient/shared";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSessionJwt } from "../auth/jwt";

interface MockObjectId {
  toString: () => string;
}

interface MockMealScanDocument {
  _id: MockObjectId;
  userId: string;
  photoS3Key: string;
  imageMimeType: "image/jpeg" | "image/png";
  analysis: MealScanAnalysis | null;
  coachContent: MealScanCoachContent | null;
  idempotencyKey?: string;
  visionEngineVersion: string;
  coachContentVersion?: string | null;
}

interface MockProfileDocument {
  userId: string;
  dailyProteinTarget: number;
  dailyCalorieTarget: number;
  biggestFear: "losing_muscle";
}

const routeMocks = vi.hoisted(() => {
  const mealScans: MockMealScanDocument[] = [];
  const profiles: MockProfileDocument[] = [];
  let nextId = 1;
  const putS3Object = vi.fn();
  const generateMealScanVision = vi.fn();
  const generateMealScanCoachContent = vi.fn();

  function objectId(): MockObjectId {
    const id = `scan_${nextId}`;
    nextId += 1;
    return { toString: () => id };
  }

  function cloneScan(scan: MockMealScanDocument): MockMealScanDocument {
    return {
      ...scan,
      _id: scan._id,
      analysis: scan.analysis ? { ...scan.analysis } : null,
      coachContent: scan.coachContent
        ? {
            ...scan.coachContent,
            swap: scan.coachContent.swap
              ? {
                  ...scan.coachContent.swap,
                  adjustedMacros: { ...scan.coachContent.swap.adjustedMacros },
                }
              : null,
          }
        : null,
    };
  }

  const MealScanModel = {
    findOne: vi.fn(async (filter: { userId: string; idempotencyKey?: string }) => {
      const scan =
        mealScans.find((candidate) => {
          return (
            candidate.userId === filter.userId &&
            candidate.idempotencyKey === filter.idempotencyKey
          );
        }) ?? null;
      return scan ? cloneScan(scan) : null;
    }),
    findOneAndUpdate: vi.fn(async () => null),
    create: vi.fn(async (payload: Omit<MockMealScanDocument, "_id">) => {
      const duplicate = mealScans.find((candidate) => {
        return (
          payload.idempotencyKey &&
          candidate.userId === payload.userId &&
          candidate.idempotencyKey === payload.idempotencyKey
        );
      });

      if (duplicate) {
        throw Object.assign(new Error("duplicate key"), {
          code: 11000,
          keyPattern: { userId: 1, idempotencyKey: 1 },
        });
      }

      const scan = { _id: objectId(), ...payload };
      mealScans.push(scan);
      return cloneScan(scan);
    }),
  };

  const MealLogModel = {
    find: vi.fn(() => ({
      select: vi.fn(async () => []),
    })),
  };

  const UserProfileModel = {
    findOne: vi.fn(async (filter: { userId: string }) => {
      return profiles.find((profile) => profile.userId === filter.userId) ?? null;
    }),
  };

  return {
    mealScans,
    profiles,
    MealScanModel,
    MealLogModel,
    UserProfileModel,
    putS3Object,
    generateMealScanVision,
    generateMealScanCoachContent,
    reset: () => {
      mealScans.splice(0, mealScans.length);
      profiles.splice(0, profiles.length);
      nextId = 1;
      MealScanModel.findOne.mockClear();
      MealScanModel.findOneAndUpdate.mockClear();
      MealScanModel.create.mockClear();
      MealLogModel.find.mockClear();
      UserProfileModel.findOne.mockClear();
      putS3Object.mockReset();
      generateMealScanVision.mockReset();
      generateMealScanCoachContent.mockReset();
    },
  };
});

vi.mock("../models/mealScan.model", () => ({
  MealScanModel: routeMocks.MealScanModel,
}));

vi.mock("../models/mealLog.model", () => ({
  MealLogModel: routeMocks.MealLogModel,
}));

vi.mock("../models/userProfile.model", () => ({
  UserProfileModel: routeMocks.UserProfileModel,
}));

vi.mock("../services/s3.service", () => ({
  putS3Object: routeMocks.putS3Object,
}));

vi.mock("../services/coachContent.service", () => {
  class MockCoachContentError extends Error {}

  return {
    CoachContentError: MockCoachContentError,
    MEAL_SCAN_COACH_COPY_VERSION: "v1.0-gpt-4o-mini",
    MEAL_SCAN_VISION_COPY_VERSION: "v1.0-gpt-4o-mini-vision",
    generateMealScanVision: routeMocks.generateMealScanVision,
    generateMealScanCoachContent: routeMocks.generateMealScanCoachContent,
  };
});

import { createApp } from "../server";

const VALID_JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]).toString(
  "base64",
);

function token(userId = "user_1") {
  return issueSessionJwt(userId);
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    imageData: VALID_JPEG_BASE64,
    imageMimeType: "image/jpeg",
    capturedAt: "2026-06-03T15:00:00.000Z",
    ...overrides,
  };
}

function analysis(): MealScanAnalysis {
  return {
    foodName: "rice bowl",
    servingSize: "1 bowl",
    protein: 24,
    calories: 520,
    carbs: 76,
    fat: 18,
    confidence: 0.82,
  };
}

function coach() {
  return {
    mode: "swap" as const,
    callout: "That leaves the day short, so add protein now.",
    swap: {
      description: "+4 oz chicken breast",
      additionalProtein: 26,
      additionalCalories: 130,
    },
    copyVersion: "v1.0-gpt-4o-mini" as const,
    model: "gpt-4o-mini" as const,
  };
}

describe("meal scan routes", () => {
  let app: Express;

  beforeEach(() => {
    routeMocks.reset();
    routeMocks.profiles.push({
      userId: "user_1",
      dailyProteinTarget: 120,
      dailyCalorieTarget: 1800,
      biggestFear: "losing_muscle",
    });
    routeMocks.generateMealScanVision.mockResolvedValue(analysis());
    routeMocks.generateMealScanCoachContent.mockResolvedValue(coach());
    app = createApp({
      healthCheck: async () => true,
    });
  });

  it("returns 401 without auth", async () => {
    const response = await request(app).post("/meal-scans/analyze").send(validBody());

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(ERROR_CODES.authMissingToken);
  });

  it("returns a scan response for a valid JPEG body with mocked AI", async () => {
    const response = await request(app)
      .post("/meal-scans/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(validBody());

    expect(response.status).toBe(200);
    expect(response.body.data.analysis.foodName).toBe("rice bowl");
    expect(response.body.data.coachContent.swap.adjustedMacros).toEqual({
      protein: 50,
      calories: 650,
      carbs: 76,
      fat: 18,
    });
    expect(routeMocks.mealScans).toHaveLength(1);
  });

  it("returns vision failure and stores no scan when vision fails", async () => {
    routeMocks.generateMealScanVision.mockRejectedValueOnce(new Error("OpenAI down"));

    const response = await request(app)
      .post("/meal-scans/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(validBody());

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe(ERROR_CODES.mealScanVisionFailed);
    expect(routeMocks.mealScans).toHaveLength(0);
  });

  it("returns 200 with null coach content when coach generation fails", async () => {
    routeMocks.generateMealScanCoachContent.mockRejectedValueOnce(new Error("coach down"));

    const response = await request(app)
      .post("/meal-scans/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(validBody());

    expect(response.status).toBe(200);
    expect(response.body.data.coachContent).toBeNull();
    expect(routeMocks.mealScans).toHaveLength(1);
  });

  it("returns the same idempotent response without creating a second scan", async () => {
    const body = validBody({ idempotencyKey: "same_scan" });
    const first = await request(app)
      .post("/meal-scans/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(body);
    const second = await request(app)
      .post("/meal-scans/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(body);

    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(routeMocks.mealScans).toHaveLength(1);
    expect(routeMocks.generateMealScanVision).toHaveBeenCalledTimes(1);
  });

  it("returns INVALID_IMAGE for invalid base64", async () => {
    const response = await request(app)
      .post("/meal-scans/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(validBody({ imageData: "not base64!" }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ERROR_CODES.invalidImage);
    expect(routeMocks.mealScans).toHaveLength(0);
  });

  it("returns INVALID_IMAGE for decoded images over 10 MB", async () => {
    const response = await request(app)
      .post("/meal-scans/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(validBody({ imageData: Buffer.alloc(10 * 1024 * 1024 + 1).toString("base64") }));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ERROR_CODES.invalidImage);
    expect(routeMocks.mealScans).toHaveLength(0);
  });
});
