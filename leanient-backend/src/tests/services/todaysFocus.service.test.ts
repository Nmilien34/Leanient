import { describe, expect, it } from "vitest";
import type { ShotDayContext } from "../../lib/shotDay";
import { selectFocusCategory } from "../../services/todaysFocus.service";

type Energy = "good" | "mid" | "low" | null;

interface FocusLog {
  protein?: number;
  recordedAt: Date;
}

function shotDayContext(overrides: Partial<ShotDayContext> = {}): ShotDayContext {
  return {
    isOnProtocol: false,
    daysSinceLastDose: null,
    daysUntilNextDose: null,
    shotDayLabel: null,
    nextDoseDate: null,
    ...overrides,
  };
}

function meal(protein: number, recordedAt = new Date("2026-06-04T10:00:00.000Z")): FocusLog {
  return {
    protein,
    recordedAt,
  };
}

function workout(recordedAt = new Date("2026-06-04T10:00:00.000Z")): FocusLog {
  return {
    recordedAt,
  };
}

function baseInput(overrides: Partial<Parameters<typeof selectFocusCategory>[0]> = {}) {
  return {
    userId: "user_1",
    userProfile: {
      dailyProteinTarget: 120,
      weeklyWorkoutTarget: 3,
    },
    shotDayContext: shotDayContext(),
    energy: "mid" as Energy,
    recentMealLogs: [meal(80)],
    weekMealLogs: [meal(120), meal(110), meal(130)],
    recentWorkoutLogs: [workout()],
    weekWorkoutLogs: [workout(), workout(), workout()],
    recentCheckin: null,
    totalMealLogs: 3,
    totalWorkoutLogs: 3,
    utcNow: new Date("2026-06-04T12:00:00.000Z"),
    ...overrides,
  };
}

describe("selectFocusCategory", () => {
  it("prioritizes onboarding nudge when the user has zero logs since joining", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        recentMealLogs: [],
        weekMealLogs: [],
        recentWorkoutLogs: [],
        weekWorkoutLogs: [],
        totalMealLogs: 0,
        totalWorkoutLogs: 0,
      }),
    );

    expect(selected).toMatchObject({
      category: "onboarding_nudge",
      inputsSnapshot: {
        proteinLoggedToday: 0,
        sessionsThisWeek: 0,
      },
    });
    expect(selected.selectionReason).toContain("zero");
  });

  it("selects shot-day recovery on shot day with low energy", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        shotDayContext: shotDayContext({
          isOnProtocol: true,
          shotDayLabel: "SHOT DAY",
        }),
        energy: "low",
      }),
    );

    expect(selected.category).toBe("shot_day_recovery");
    expect(selected.selectionReason).toContain("SHOT DAY");
  });

  it("selects shot-day recovery on shot day +1 with null energy", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        shotDayContext: shotDayContext({
          isOnProtocol: true,
          shotDayLabel: "SHOT DAY +1",
        }),
        energy: null,
      }),
    );

    expect(selected.category).toBe("shot_day_recovery");
  });

  it("does not select shot-day recovery on shot day +2", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        shotDayContext: shotDayContext({
          isOnProtocol: true,
          shotDayLabel: "SHOT DAY +2",
        }),
        energy: "low",
      }),
    );

    expect(selected.category).toBe("steady_state");
  });

  it("selects training gap Thursday through Sunday when the user is behind target", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        utcNow: new Date("2026-06-04T12:00:00.000Z"),
        weekWorkoutLogs: [workout()],
      }),
    );

    expect(selected.category).toBe("training_gap");
    expect(selected.inputsSnapshot.sessionsThisWeek).toBe(1);
  });

  it("does not select training gap before Thursday", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        utcNow: new Date("2026-06-02T12:00:00.000Z"),
        recentMealLogs: [meal(100, new Date("2026-06-02T10:00:00.000Z"))],
        weekMealLogs: [
          meal(120, new Date("2026-06-01T10:00:00.000Z")),
          meal(120, new Date("2026-06-02T10:00:00.000Z")),
        ],
        weekWorkoutLogs: [workout()],
      }),
    );

    expect(selected.category).toBe("steady_state");
  });

  it("selects protein gap when today's protein is under 60 percent by 11am UTC", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        utcNow: new Date("2026-06-04T11:30:00.000Z"),
        recentMealLogs: [meal(40)],
        weekMealLogs: [meal(120), meal(120), meal(120)],
        weekWorkoutLogs: [workout(), workout(), workout()],
      }),
    );

    expect(selected.category).toBe("protein_gap");
    expect(selected.inputsSnapshot.proteinLoggedToday).toBe(40);
  });

  it("selects protein gap when weekly protein adherence is under 75 percent", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        recentMealLogs: [meal(100)],
        weekMealLogs: [meal(60), meal(70), meal(65)],
        weekWorkoutLogs: [workout(), workout(), workout()],
      }),
    );

    expect(selected.category).toBe("protein_gap");
  });

  it("selects steady state when no gap matches", async () => {
    const selected = await selectFocusCategory(baseInput());

    expect(selected.category).toBe("steady_state");
  });

  it("keeps priority order when onboarding and protein gap both match", async () => {
    const selected = await selectFocusCategory(
      baseInput({
        recentMealLogs: [],
        weekMealLogs: [],
        recentWorkoutLogs: [],
        weekWorkoutLogs: [],
        totalMealLogs: 0,
        totalWorkoutLogs: 0,
        utcNow: new Date("2026-06-04T11:30:00.000Z"),
      }),
    );

    expect(selected.category).toBe("onboarding_nudge");
  });
});
