import { describe, expect, it } from "vitest";
import { mockRecommendedWorkout } from "../../mocks/workouts";
import { deriveWorkoutDetail } from "../../screens/app/workoutDetailMetrics";

describe("deriveWorkoutDetail", () => {
  it("builds library workout detail copy and exercise rows", () => {
    const view = deriveWorkoutDetail(mockRecommendedWorkout);

    expect(view.title).toBe("Upper body");
    expect(view.meta).toBe("22 min · Dumbbells · Moderate");
    expect(view.canStart).toBe(true);
    expect(view.startLabel).toBe("Start workout");
    expect(view.exercises[0]).toMatchObject({
      name: "Dumbbell floor press",
      detail: "3 sets · 10 reps · 45s rest",
    });
    expect(view.coachLine).toContain("resistance");
  });

  it("keeps a detail view useful when guided steps are missing", () => {
    const view = deriveWorkoutDetail({
      ...mockRecommendedWorkout,
      exercises: [],
    });

    expect(view.canStart).toBe(false);
    expect(view.startLabel).toBe("Guided steps coming soon");
    expect(view.exercises).toEqual([]);
  });
});
