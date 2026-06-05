import { ERROR_CODES, type MealScanAnalysis, type MealScanCoachContent } from "@leanient/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

interface MockMealLogDocument {
  userId: string;
  protein: number;
  recordedAt: Date;
  deletedAt: Date | null;
}

interface MockProfileDocument {
  userId: string;
  dailyProteinTarget?: number;
  dailyCalorieTarget?: number;
  biggestFear: "losing_muscle" | "ozempic_face";
}

const serviceMocks = vi.hoisted(() => {
  const mealScans: MockMealScanDocument[] = [];
  const mealLogs: MockMealLogDocument[] = [];
  const profiles: MockProfileDocument[] = [];
  let nextId = 1;
  const putS3Object = vi.fn();
  const generateMealScanVision = vi.fn();
  const generateMealScanCoachContent = vi.fn();

  function objectId(prefix = "scan"): MockObjectId {
    const id = `${prefix}_${nextId}`;
    nextId += 1;
    return {
      toString: () => id,
    };
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

  function matchesRecordedAt(
    log: MockMealLogDocument,
    filter: { recordedAt?: { $gte?: Date; $lt?: Date } },
  ): boolean {
    const range = filter.recordedAt;
    if (!range) {
      return true;
    }

    return (
      (!range.$gte || log.recordedAt >= range.$gte) &&
      (!range.$lt || log.recordedAt < range.$lt)
    );
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
    findOneAndUpdate: vi.fn(
      async (
        filter: { _id: MockObjectId; userId: string },
        update: { $set: Omit<MockMealScanDocument, "_id"> },
      ) => {
        const index = mealScans.findIndex((candidate) => {
          return candidate._id.toString() === filter._id.toString() && candidate.userId === filter.userId;
        });

        if (index === -1) {
          return null;
        }

        mealScans[index] = {
          ...mealScans[index],
          ...update.$set,
        };
        return cloneScan(mealScans[index]);
      },
    ),
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

      const scan = {
        _id: objectId(),
        ...payload,
      };
      mealScans.push(scan);
      return cloneScan(scan);
    }),
  };

  const MealLogModel = {
    find: vi.fn((filter: { userId: string; deletedAt: null; recordedAt?: { $gte?: Date; $lt?: Date } }) => {
      return {
        select: vi.fn(async () => {
          return mealLogs.filter((log) => {
            return (
              log.userId === filter.userId &&
              log.deletedAt === filter.deletedAt &&
              matchesRecordedAt(log, filter)
            );
          });
        }),
      };
    }),
  };

  const UserProfileModel = {
    findOne: vi.fn(async (filter: { userId: string }) => {
      return profiles.find((profile) => profile.userId === filter.userId) ?? null;
    }),
  };

  return {
    mealScans,
    mealLogs,
    profiles,
    MealScanModel,
    MealLogModel,
    UserProfileModel,
    reset: () => {
      mealScans.splice(0, mealScans.length);
      mealLogs.splice(0, mealLogs.length);
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
    putS3Object,
    generateMealScanVision,
    generateMealScanCoachContent,
  };
});

vi.mock("../../models/mealScan.model", () => ({
  MealScanModel: serviceMocks.MealScanModel,
}));

vi.mock("../../models/mealLog.model", () => ({
  MealLogModel: serviceMocks.MealLogModel,
}));

vi.mock("../../models/userProfile.model", () => ({
  UserProfileModel: serviceMocks.UserProfileModel,
}));

vi.mock("../../services/s3.service", () => ({
  putS3Object: serviceMocks.putS3Object,
}));

vi.mock("../../services/coachContent.service", () => {
  class MockCoachContentError extends Error {}

  return {
    CoachContentError: MockCoachContentError,
    MEAL_SCAN_COACH_COPY_VERSION: "v1.0-gpt-4o-mini",
    MEAL_SCAN_VISION_COPY_VERSION: "v1.0-gpt-4o-mini-vision",
    generateMealScanVision: serviceMocks.generateMealScanVision,
    generateMealScanCoachContent: serviceMocks.generateMealScanCoachContent,
  };
});

import { analyzeMealScan } from "../../services/mealScan.service";

const VALID_JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00]).toString(
  "base64",
);

function seedProfile(overrides: Partial<MockProfileDocument> = {}) {
  serviceMocks.profiles.push({
    userId: "user_1",
    dailyProteinTarget: 120,
    dailyCalorieTarget: 1800,
    biggestFear: "losing_muscle",
    ...overrides,
  });
}

function request(overrides: Partial<Parameters<typeof analyzeMealScan>[1]> = {}) {
  return {
    imageData: VALID_JPEG_BASE64,
    imageMimeType: "image/jpeg" as const,
    capturedAt: "2026-06-03T15:00:00.000Z",
    ...overrides,
  };
}

function visionAnalysis(overrides: Partial<MealScanAnalysis> = {}): MealScanAnalysis {
  return {
    foodName: "rice bowl",
    servingSize: "1 bowl",
    protein: 24,
    calories: 520,
    carbs: 76,
    fat: 18,
    confidence: 0.82,
    ...overrides,
  };
}

function coachSwap() {
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

function coachAffirmation() {
  return {
    mode: "affirmation" as const,
    callout: "Solid protein, keeps you on pace for the day.",
    swap: null,
    copyVersion: "v1.0-gpt-4o-mini" as const,
    model: "gpt-4o-mini" as const,
  };
}

describe("meal scan service", () => {
  beforeEach(() => {
    serviceMocks.reset();
    seedProfile();
    serviceMocks.generateMealScanVision.mockResolvedValue(visionAnalysis());
    serviceMocks.generateMealScanCoachContent.mockResolvedValue(coachSwap());
  });

  it("stores and returns a full meal scan when storage, vision, and coach calls succeed", async () => {
    const result = await analyzeMealScan("user_1", request({ idempotencyKey: "scan_1" }));

    expect(result.analysis.foodName).toBe("rice bowl");
    expect(result.photoS3Key).toMatch(/^meal-scans\/user_1\/.+\.jpg$/);
    expect(result.coachContent?.swap?.adjustedMacros).toEqual({
      protein: 50,
      calories: 650,
      carbs: 76,
      fat: 18,
    });
    expect(serviceMocks.putS3Object).toHaveBeenCalledTimes(1);
    expect(serviceMocks.generateMealScanVision).toHaveBeenCalledTimes(1);
    expect(serviceMocks.generateMealScanCoachContent).toHaveBeenCalledTimes(1);
    expect(serviceMocks.mealScans).toHaveLength(1);
  });

  it("rejects invalid base64 before S3 or OpenAI", async () => {
    await expect(analyzeMealScan("user_1", request({ imageData: "not base64!" }))).rejects.toMatchObject({
      code: ERROR_CODES.invalidImage,
      statusCode: 400,
    });

    expect(serviceMocks.putS3Object).not.toHaveBeenCalled();
    expect(serviceMocks.generateMealScanVision).not.toHaveBeenCalled();
    expect(serviceMocks.mealScans).toHaveLength(0);
  });

  it("rejects image data whose magic bytes do not match the MIME type", async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64");

    await expect(analyzeMealScan("user_1", request({ imageData: pngBytes }))).rejects.toMatchObject({
      code: ERROR_CODES.invalidImage,
      statusCode: 400,
    });

    expect(serviceMocks.putS3Object).not.toHaveBeenCalled();
    expect(serviceMocks.generateMealScanVision).not.toHaveBeenCalled();
  });

  it("rejects decoded images over 10 MB before S3 or OpenAI", async () => {
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1).toString("base64");

    await expect(analyzeMealScan("user_1", request({ imageData: oversized }))).rejects.toMatchObject({
      code: ERROR_CODES.invalidImage,
      statusCode: 400,
    });

    expect(serviceMocks.putS3Object).not.toHaveBeenCalled();
    expect(serviceMocks.generateMealScanVision).not.toHaveBeenCalled();
  });

  it("fails fast on S3 storage errors and does not call OpenAI", async () => {
    serviceMocks.putS3Object.mockRejectedValueOnce(new Error("S3 down"));

    await expect(analyzeMealScan("user_1", request())).rejects.toMatchObject({
      code: ERROR_CODES.mealScanStorageFailed,
      statusCode: 503,
    });

    expect(serviceMocks.generateMealScanVision).not.toHaveBeenCalled();
    expect(serviceMocks.mealScans).toHaveLength(0);
  });

  it("returns a vision failure and stores no MealScan when vision fails", async () => {
    serviceMocks.generateMealScanVision.mockRejectedValueOnce(new Error("OpenAI down"));

    await expect(analyzeMealScan("user_1", request())).rejects.toMatchObject({
      code: ERROR_CODES.mealScanVisionFailed,
      statusCode: 503,
    });

    expect(serviceMocks.putS3Object).toHaveBeenCalledTimes(1);
    expect(serviceMocks.mealScans).toHaveLength(0);
  });

  it("gracefully stores macros with null coach content when coach generation fails", async () => {
    serviceMocks.generateMealScanCoachContent.mockRejectedValueOnce(new Error("coach down"));

    const result = await analyzeMealScan("user_1", request());

    expect(result.analysis.protein).toBe(24);
    expect(result.coachContent).toBeNull();
    expect(serviceMocks.mealScans).toHaveLength(1);
    expect(serviceMocks.mealScans[0].coachContent).toBeNull();
  });

  it("selects affirmation mode when the meal brings the user to 80 percent of protein target", async () => {
    serviceMocks.mealLogs.push({
      userId: "user_1",
      protein: 80,
      recordedAt: new Date("2026-06-03T10:00:00.000Z"),
      deletedAt: null,
    });
    serviceMocks.generateMealScanCoachContent.mockResolvedValueOnce(coachAffirmation());

    const result = await analyzeMealScan("user_1", request());

    expect(serviceMocks.generateMealScanCoachContent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: "affirmation",
        projectedPercent: 87,
      }),
      expect.anything(),
    );
    expect(result.coachContent?.mode).toBe("affirmation");
    expect(result.coachContent?.swap).toBeNull();
  });

  it("selects swap mode when projected protein remains below 80 percent", async () => {
    const result = await analyzeMealScan("user_1", request());

    expect(serviceMocks.generateMealScanCoachContent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: "swap",
        projectedPercent: 20,
      }),
      expect.anything(),
    );
    expect(result.coachContent?.mode).toBe("swap");
    expect(result.coachContent?.swap).not.toBeNull();
  });

  it("returns an existing successful idempotent scan without new S3 or OpenAI calls", async () => {
    const first = await analyzeMealScan("user_1", request({ idempotencyKey: "scan_retry" }));
    const second = await analyzeMealScan("user_1", request({ idempotencyKey: "scan_retry" }));

    expect(second).toEqual(first);
    expect(serviceMocks.mealScans).toHaveLength(1);
    expect(serviceMocks.putS3Object).toHaveBeenCalledTimes(1);
    expect(serviceMocks.generateMealScanVision).toHaveBeenCalledTimes(1);
  });

  it("requires profile nutrition targets before storage or OpenAI", async () => {
    serviceMocks.profiles.splice(0, serviceMocks.profiles.length);
    seedProfile({ dailyProteinTarget: undefined });

    await expect(analyzeMealScan("user_1", request())).rejects.toMatchObject({
      code: ERROR_CODES.badRequest,
      statusCode: 400,
    });

    expect(serviceMocks.putS3Object).not.toHaveBeenCalled();
    expect(serviceMocks.generateMealScanVision).not.toHaveBeenCalled();
  });

  it("returns an existing successful scan when a duplicate idempotent create races", async () => {
    const first = await analyzeMealScan("user_1", request({ idempotencyKey: "race" }));
    serviceMocks.MealScanModel.findOne.mockResolvedValueOnce(null);

    const second = await analyzeMealScan("user_1", request({ idempotencyKey: "race" }));

    expect(second).toEqual(first);
    expect(serviceMocks.mealScans).toHaveLength(1);
  });

  it("allows a retry to proceed when an existing idempotent scan is incomplete", async () => {
    serviceMocks.mealScans.push({
      _id: { toString: () => "scan_incomplete" },
      userId: "user_1",
      photoS3Key: "meal-scans/user_1/old.jpg",
      imageMimeType: "image/jpeg",
      analysis: null,
      coachContent: null,
      idempotencyKey: "retry_after_failure",
      visionEngineVersion: "v1.0-gpt-4o-mini-vision",
      coachContentVersion: null,
    });

    const result = await analyzeMealScan(
      "user_1",
      request({ idempotencyKey: "retry_after_failure" }),
    );

    expect(result.analysis.foodName).toBe("rice bowl");
    expect(serviceMocks.mealScans).toHaveLength(1);
    expect(serviceMocks.mealScans[0].analysis?.foodName).toBe("rice bowl");
  });
});
