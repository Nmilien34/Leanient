import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockUser {
  _id: {
    toString: () => string;
  };
  onboardingComplete: boolean;
  subscriptionStatus: string;
}

interface MockVerdict {
  userId: string;
  weekOf: string;
  source: "cron_no_data";
}

const modelMocks = vi.hoisted(() => {
  const users: MockUser[] = [];
  const verdicts: MockVerdict[] = [];
  const findCalls: unknown[] = [];

  function createUser(
    userId: string,
    onboardingComplete: boolean,
    subscriptionStatus: string,
  ): MockUser {
    const user = {
      _id: {
        toString: () => userId,
      },
      onboardingComplete,
      subscriptionStatus,
    };
    users.push(user);
    return user;
  }

  function matchesFilter(user: MockUser, filter: Record<string, unknown>): boolean {
    const statusFilter = filter.subscriptionStatus as { $in?: string[] } | undefined;
    return (
      user.onboardingComplete === filter.onboardingComplete &&
      Boolean(statusFilter?.$in?.includes(user.subscriptionStatus))
    );
  }

  const UserModel = {
    find: vi.fn((filter: Record<string, unknown>) => {
      findCalls.push(filter);
      return {
        select: vi.fn(async () => users.filter((user) => matchesFilter(user, filter))),
      };
    }),
  };

  const WeeklyCheckinModel = {
    findOne: vi.fn(async () => null),
  };

  const WeeklyVerdictModel = {
    findOne: vi.fn(async (filter) => {
      return (
        verdicts.find((verdict) => {
          return verdict.userId === filter.userId && verdict.weekOf === filter.weekOf;
        }) ?? null
      );
    }),
    create: vi.fn(async (draft) => {
      const verdict = {
        userId: draft.userId,
        weekOf: draft.weekOf,
        source: draft.source,
      };
      verdicts.push(verdict);
      return verdict;
    }),
  };

  const UserProfileModel = {
    findOne: vi.fn(async () => null),
  };

  return {
    users,
    verdicts,
    findCalls,
    UserModel,
    WeeklyCheckinModel,
    WeeklyVerdictModel,
    UserProfileModel,
    createUser,
    reset: () => {
      users.splice(0, users.length);
      verdicts.splice(0, verdicts.length);
      findCalls.splice(0, findCalls.length);
      UserModel.find.mockClear();
      WeeklyCheckinModel.findOne.mockClear();
      WeeklyVerdictModel.findOne.mockClear();
      WeeklyVerdictModel.create.mockClear();
      UserProfileModel.findOne.mockClear();
    },
  };
});

vi.mock("../../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

vi.mock("../../models/weeklyCheckin.model", () => ({
  WeeklyCheckinModel: modelMocks.WeeklyCheckinModel,
}));

vi.mock("../../models/weeklyVerdict.model", () => ({
  WeeklyVerdictModel: modelMocks.WeeklyVerdictModel,
}));

vi.mock("../../models/userProfile.model", () => ({
  UserProfileModel: modelMocks.UserProfileModel,
}));

vi.mock("../../services/verdict.service", () => ({
  calculateWeeklyVerdictWithExplanation: vi.fn(),
  createNoDataVerdict: vi.fn((input) => ({
    userId: input.userId,
    weekOf: input.weekOf,
    source: "cron_no_data",
    copyVersion: null,
    explanation: null,
  })),
}));

import { runVerdictMaintenance } from "../../services/scheduler.service";

describe("scheduler verdict maintenance active-user targeting", () => {
  beforeEach(() => {
    modelMocks.reset();
  });

  it("processes only onboarded trialing or active users", async () => {
    modelMocks.createUser("active_trial", true, "trialing");
    modelMocks.createUser("active_paid_1", true, "active");
    modelMocks.createUser("active_paid_2", true, "active");
    modelMocks.createUser("not_onboarded_trial", false, "trialing");
    modelMocks.createUser("not_onboarded_active", false, "active");
    modelMocks.createUser("canceled_1", true, "canceled");
    modelMocks.createUser("canceled_2", true, "active_canceled");

    const result = await runVerdictMaintenance(new Date("2026-06-01T13:00:00.000Z"));

    expect(result.noData).toBe(3);
    expect(result.computed).toBe(0);
    expect(modelMocks.verdicts).toHaveLength(3);
    expect(modelMocks.verdicts.map((verdict) => verdict.userId).sort()).toEqual([
      "active_paid_1",
      "active_paid_2",
      "active_trial",
    ]);
    expect(modelMocks.findCalls).toEqual([
      {
        onboardingComplete: true,
        subscriptionStatus: { $in: ["trialing", "active"] },
      },
    ]);
  });

  it("creates no verdicts when there are zero active users", async () => {
    modelMocks.createUser("free_user", true, "free");
    modelMocks.createUser("not_onboarded", false, "active");
    modelMocks.createUser("canceled_user", true, "canceled");

    const result = await runVerdictMaintenance(new Date("2026-06-01T13:00:00.000Z"));

    expect(result.noData).toBe(0);
    expect(result.computed).toBe(0);
    expect(modelMocks.verdicts).toHaveLength(0);
  });

  it("does not duplicate no-data verdicts when run twice", async () => {
    modelMocks.createUser("active_trial", true, "trialing");
    modelMocks.createUser("active_paid", true, "active");

    await runVerdictMaintenance(new Date("2026-06-01T13:00:00.000Z"));
    const secondResult = await runVerdictMaintenance(new Date("2026-06-01T13:00:00.000Z"));

    expect(secondResult.noData).toBe(0);
    expect(secondResult.computed).toBe(0);
    expect(modelMocks.verdicts).toHaveLength(2);
    expect(modelMocks.verdicts.map((verdict) => verdict.userId).sort()).toEqual([
      "active_paid",
      "active_trial",
    ]);
  });
});
