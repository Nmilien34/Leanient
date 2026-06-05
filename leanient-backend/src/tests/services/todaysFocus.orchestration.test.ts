import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TodaysFocusActionType, FocusCategory } from "../../services/todaysFocus.service";
import type * as CoachContentService from "../../services/coachContent.service";

interface MockFocusDocument {
  _id: {
    toString: () => string;
  };
  userId: string;
  utcDate: Date;
  category: FocusCategory;
  selectionReason: string;
  coachContent: {
    headline: string;
    suggestion: string;
    actionType: TodaysFocusActionType;
    actionLabel: string | null;
    copyVersion: string;
  } | null;
  inputsSnapshot: {
    proteinLoggedToday: number;
    proteinTargetToday: number;
    sessionsThisWeek: number;
    weeklyTarget: number;
    shotDayLabel: string | null;
    energy: "good" | "mid" | "low" | null;
    daysSinceLastActivity: number | null;
  };
  engineVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

const modelMocks = vi.hoisted(() => {
  const focuses: MockFocusDocument[] = [];
  const mealLogs: Array<{ userId: string; recordedAt: Date; protein: number; deletedAt: null }> =
    [];
  const workoutLogs: Array<{ userId: string; recordedAt: Date; deletedAt: null }> = [];
  let nextId = 1;

  function objectId() {
    const id = `focus_${nextId}`;
    nextId += 1;
    return {
      toString: () => id,
    };
  }

  function cloneFocus(focus: MockFocusDocument): MockFocusDocument {
    return {
      ...focus,
      utcDate: new Date(focus.utcDate),
      createdAt: new Date(focus.createdAt),
      updatedAt: new Date(focus.updatedAt),
      coachContent: focus.coachContent ? { ...focus.coachContent } : null,
      inputsSnapshot: { ...focus.inputsSnapshot },
    };
  }

  function matchesDateRange(recordedAt: Date, range?: { $gte?: Date; $lt?: Date; $lte?: Date }) {
    if (!range) {
      return true;
    }

    return (
      (!range.$gte || recordedAt >= range.$gte) &&
      (!range.$lt || recordedAt < range.$lt) &&
      (!range.$lte || recordedAt <= range.$lte)
    );
  }

  const TodaysFocusModel = {
    findOne: vi.fn(async (filter: { userId: string; utcDate: Date }) => {
      const focus =
        focuses.find(
          (candidate) =>
            candidate.userId === filter.userId &&
            candidate.utcDate.toISOString() === filter.utcDate.toISOString(),
        ) ?? null;

      return focus ? cloneFocus(focus) : null;
    }),
    create: vi.fn(async (payload: Omit<MockFocusDocument, "_id" | "createdAt" | "updatedAt">) => {
      const duplicate = focuses.find(
        (candidate) =>
          candidate.userId === payload.userId &&
          candidate.utcDate.toISOString() === payload.utcDate.toISOString(),
      );

      if (duplicate) {
        throw Object.assign(new Error("duplicate key"), {
          code: 11000,
          keyPattern: { userId: 1, utcDate: 1 },
        });
      }

      const focus = {
        _id: objectId(),
        ...payload,
        createdAt: new Date("2026-06-04T12:00:00.000Z"),
        updatedAt: new Date("2026-06-04T12:00:00.000Z"),
      };
      focuses.push(focus);
      return cloneFocus(focus);
    }),
  };

  const UserModel = {
    findById: vi.fn(async () => ({
      _id: {
        toString: () => "user_1",
      },
      onboardingComplete: true,
    })),
  };

  const getUserProfileDocument = vi.fn(async () => ({
    userId: "user_1",
    dailyProteinTarget: 120,
    dailyCalorieTarget: 1800,
    weeklyWorkoutTarget: 3,
    biggestFear: "losing_muscle",
    sideEffectBaseline: [],
  }));

  const MealLogModel = {
    find: vi.fn((filter: { userId: string; deletedAt: null; recordedAt?: { $gte?: Date; $lt?: Date } }) => ({
      select: vi.fn(async () =>
        mealLogs.filter(
          (log) =>
            log.userId === filter.userId &&
            log.deletedAt === filter.deletedAt &&
            matchesDateRange(log.recordedAt, filter.recordedAt),
        ),
      ),
    })),
    countDocuments: vi.fn(async (filter: { userId: string; deletedAt: null }) => {
      return mealLogs.filter((log) => log.userId === filter.userId && log.deletedAt === filter.deletedAt)
        .length;
    }),
  };

  const WorkoutLogModel = {
    find: vi.fn((filter: { userId: string; deletedAt: null; recordedAt?: { $gte?: Date; $lt?: Date } }) => ({
      select: vi.fn(async () =>
        workoutLogs.filter(
          (log) =>
            log.userId === filter.userId &&
            log.deletedAt === filter.deletedAt &&
            matchesDateRange(log.recordedAt, filter.recordedAt),
        ),
      ),
    })),
    countDocuments: vi.fn(async (filter: { userId: string; deletedAt: null; recordedAt?: { $gte?: Date; $lt?: Date } }) => {
      return workoutLogs.filter(
        (log) =>
          log.userId === filter.userId &&
          log.deletedAt === filter.deletedAt &&
          matchesDateRange(log.recordedAt, filter.recordedAt),
      ).length;
    }),
  };

  const DoseLogModel = {
    find: vi.fn(() => ({
      sort: vi.fn(async () => []),
    })),
  };

  const UserMedicationProtocolModel = {
    findOne: vi.fn(async () => null),
  };

  const WeeklyCheckinModel = {
    findOne: vi.fn(() => ({
      sort: vi.fn(async () => null),
    })),
  };

  const generateTodaysFocusCopy = vi.fn(async () => ({
    headline: "30g protein at lunch",
    suggestion: "Try Greek yogurt and protein powder, about 30g.",
    actionType: "log_meal",
    actionLabel: "Log this meal",
    copyVersion: "v1.0-gpt-4o-mini",
    model: "gpt-4o-mini",
  }));

  return {
    focuses,
    mealLogs,
    workoutLogs,
    TodaysFocusModel,
    UserModel,
    getUserProfileDocument,
    MealLogModel,
    WorkoutLogModel,
    DoseLogModel,
    UserMedicationProtocolModel,
    WeeklyCheckinModel,
    generateTodaysFocusCopy,
    reset: () => {
      focuses.splice(0, focuses.length);
      mealLogs.splice(0, mealLogs.length);
      workoutLogs.splice(0, workoutLogs.length);
      nextId = 1;
      TodaysFocusModel.findOne.mockClear();
      TodaysFocusModel.create.mockClear();
      UserModel.findById.mockClear();
      getUserProfileDocument.mockClear();
      MealLogModel.find.mockClear();
      MealLogModel.countDocuments.mockClear();
      WorkoutLogModel.find.mockClear();
      WorkoutLogModel.countDocuments.mockClear();
      DoseLogModel.find.mockClear();
      UserMedicationProtocolModel.findOne.mockClear();
      WeeklyCheckinModel.findOne.mockClear();
      generateTodaysFocusCopy.mockClear();
    },
  };
});

vi.mock("../../models/todaysFocus.model", () => ({
  TodaysFocusModel: modelMocks.TodaysFocusModel,
}));

vi.mock("../../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

vi.mock("../../services/userProfile.service", () => ({
  getUserProfileDocument: modelMocks.getUserProfileDocument,
}));

vi.mock("../../models/mealLog.model", () => ({
  MealLogModel: modelMocks.MealLogModel,
}));

vi.mock("../../models/workoutLog.model", () => ({
  WorkoutLogModel: modelMocks.WorkoutLogModel,
}));

vi.mock("../../models/doseLog.model", () => ({
  DoseLogModel: modelMocks.DoseLogModel,
}));

vi.mock("../../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: modelMocks.UserMedicationProtocolModel,
}));

vi.mock("../../models/weeklyCheckin.model", () => ({
  WeeklyCheckinModel: modelMocks.WeeklyCheckinModel,
}));

vi.mock("../../services/coachContent.service", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof CoachContentService;
  return {
    ...actual,
    TODAYS_FOCUS_COPY_VERSION: "v1.0-gpt-4o-mini",
    generateTodaysFocusCopy: modelMocks.generateTodaysFocusCopy,
  };
});

import { getTodaysFocus } from "../../services/todaysFocus.service";

function seedProteinGapData() {
  modelMocks.mealLogs.push(
    {
      userId: "user_1",
      recordedAt: new Date("2026-06-04T09:00:00.000Z"),
      protein: 40,
      deletedAt: null,
    },
    {
      userId: "user_1",
      recordedAt: new Date("2026-06-03T09:00:00.000Z"),
      protein: 70,
      deletedAt: null,
    },
  );
  modelMocks.workoutLogs.push(
    {
      userId: "user_1",
      recordedAt: new Date("2026-06-02T09:00:00.000Z"),
      deletedAt: null,
    },
    {
      userId: "user_1",
      recordedAt: new Date("2026-06-03T09:00:00.000Z"),
      deletedAt: null,
    },
    {
      userId: "user_1",
      recordedAt: new Date("2026-06-04T09:00:00.000Z"),
      deletedAt: null,
    },
  );
}

describe("getTodaysFocus", () => {
  beforeEach(() => {
    modelMocks.reset();
    seedProteinGapData();
  });

  it("generates fresh focus on the first request of the UTC day", async () => {
    const focus = await getTodaysFocus("user_1", new Date("2026-06-04T12:00:00.000Z"));

    expect(focus).toMatchObject({
      category: "protein_gap",
      headline: "30g protein at lunch",
      suggestion: "Try Greek yogurt and protein powder, about 30g.",
      actionType: "log_meal",
      actionLabel: "Log this meal",
      engineVersion: "v1.0",
    });
    expect(modelMocks.TodaysFocusModel.create).toHaveBeenCalledTimes(1);
    expect(modelMocks.generateTodaysFocusCopy).toHaveBeenCalledTimes(1);
  });

  it("returns the cached focus on the second request of the same UTC day without calling AI", async () => {
    await getTodaysFocus("user_1", new Date("2026-06-04T12:00:00.000Z"));
    modelMocks.generateTodaysFocusCopy.mockClear();

    const focus = await getTodaysFocus("user_1", new Date("2026-06-04T22:00:00.000Z"));

    expect(focus.generatedAt).toBe("2026-06-04T12:00:00.000Z");
    expect(modelMocks.focuses).toHaveLength(1);
    expect(modelMocks.generateTodaysFocusCopy).not.toHaveBeenCalled();
  });

  it("generates a new record on the next UTC day", async () => {
    await getTodaysFocus("user_1", new Date("2026-06-04T23:59:00.000Z"));
    await getTodaysFocus("user_1", new Date("2026-06-05T00:01:00.000Z"));

    expect(modelMocks.focuses).toHaveLength(2);
    expect(modelMocks.focuses.map((focus) => focus.utcDate.toISOString())).toEqual([
      "2026-06-04T00:00:00.000Z",
      "2026-06-05T00:00:00.000Z",
    ]);
  });

  it("stores null coach content when AI fails and returns 200-shape data", async () => {
    modelMocks.generateTodaysFocusCopy.mockRejectedValueOnce(new Error("OpenAI down"));

    const focus = await getTodaysFocus("user_1", new Date("2026-06-04T12:00:00.000Z"));

    expect(focus).toMatchObject({
      category: "protein_gap",
      headline: null,
      suggestion: null,
      actionType: "none",
      actionLabel: null,
    });
    expect(modelMocks.focuses[0].coachContent).toBeNull();
  });

  it("uses profile side-effect baseline for shot-day recovery when no check-in exists", async () => {
    modelMocks.getUserProfileDocument.mockResolvedValueOnce({
      userId: "user_1",
      dailyProteinTarget: 120,
      dailyCalorieTarget: 1800,
      weeklyWorkoutTarget: 3,
      biggestFear: "losing_muscle",
      sideEffectBaseline: ["low_energy"],
    });
    modelMocks.UserMedicationProtocolModel.findOne.mockResolvedValueOnce({
      userId: "user_1",
      active: true,
      medicationName: "Wegovy",
      doseUnit: "mg",
      shotDay: "thursday",
      startDate: "2026-06-04",
    });

    const focus = await getTodaysFocus("user_1", new Date("2026-06-04T12:00:00.000Z"));

    expect(focus.category).toBe("shot_day_recovery");
    expect(modelMocks.generateTodaysFocusCopy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "shot_day_recovery",
        inputsSnapshot: expect.objectContaining({ energy: "low" }),
      }),
    );
  });

  it("does not retry AI after a same-day null coach-content record was cached", async () => {
    modelMocks.generateTodaysFocusCopy.mockRejectedValueOnce(new Error("OpenAI down"));
    await getTodaysFocus("user_1", new Date("2026-06-04T12:00:00.000Z"));
    modelMocks.generateTodaysFocusCopy.mockClear();

    const focus = await getTodaysFocus("user_1", new Date("2026-06-04T13:00:00.000Z"));

    expect(focus.headline).toBeNull();
    expect(modelMocks.generateTodaysFocusCopy).not.toHaveBeenCalled();
  });

  it("returns the existing record when a duplicate-key insert race occurs", async () => {
    const originalCreate = modelMocks.TodaysFocusModel.create.getMockImplementation();
    modelMocks.TodaysFocusModel.create.mockImplementationOnce(async (payload) => {
      const existing = {
        _id: {
          toString: () => "focus_existing",
        },
        ...payload,
        createdAt: new Date("2026-06-04T12:00:00.000Z"),
        updatedAt: new Date("2026-06-04T12:00:00.000Z"),
      };
      modelMocks.focuses.push(existing);
      throw Object.assign(new Error("duplicate key"), {
        code: 11000,
        keyPattern: { userId: 1, utcDate: 1 },
      });
    });

    const focus = await getTodaysFocus("user_1", new Date("2026-06-04T12:00:00.000Z"));

    expect(focus.generatedAt).toBe("2026-06-04T12:00:00.000Z");
    expect(modelMocks.focuses).toHaveLength(1);
    modelMocks.TodaysFocusModel.create.mockImplementation(originalCreate);
  });
});
