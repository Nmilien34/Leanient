import { describe, expect, it } from "vitest";
import { buildGettingStarted } from "../../screens/app/gettingStarted";

describe("buildGettingStarted", () => {
  it("returns null once a score exists (no guide needed)", () => {
    expect(
      buildGettingStarted({ hasScore: true, weightLogged: false, mealLoggedToday: false, workoutDoneToday: false }),
    ).toBeNull();
  });

  it("explains the missing score and lists the data-generating steps", () => {
    const view = buildGettingStarted({
      hasScore: false,
      weightLogged: false,
      mealLoggedToday: false,
      workoutDoneToday: false,
    })!;
    expect(view.steps.map((s) => s.key)).toEqual(["weight", "meal", "workout"]);
    expect(view.steps.every((s) => !s.done)).toBe(true);
    expect(view.doneCount).toBe(0);
    expect(view.allDone).toBe(false);
    expect(view.headline).toBe("Your muscle score is on its way");
    expect(view.why).toContain("first days of data");
  });

  it("tracks real progress as the user logs", () => {
    const view = buildGettingStarted({
      hasScore: false,
      weightLogged: true,
      mealLoggedToday: true,
      workoutDoneToday: false,
    })!;
    expect(view.doneCount).toBe(2);
    expect(view.steps.find((s) => s.key === "workout")!.done).toBe(false);
    expect(view.allDone).toBe(false);
  });

  it("celebrates and points to the check-in once all steps are done", () => {
    const view = buildGettingStarted({
      hasScore: false,
      weightLogged: true,
      mealLoggedToday: true,
      workoutDoneToday: true,
    })!;
    expect(view.allDone).toBe(true);
    expect(view.headline).toBe("Your first data is in");
    expect(view.why).toContain("weekly check-in");
  });
});
