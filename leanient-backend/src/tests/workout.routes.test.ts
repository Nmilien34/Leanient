import type { EquipmentAccess, UserProfile, Workout } from "@leanient/shared";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSessionJwt } from "../auth/jwt";

const serviceMocks = vi.hoisted(() => ({
  getUserProfile: vi.fn(),
  getRecommendedWorkouts: vi.fn(),
  getWorkoutBySlug: vi.fn(),
  listWorkoutsForUser: vi.fn(),
}));

vi.mock("../services/userProfile.service", () => ({
  getUserProfile: serviceMocks.getUserProfile,
}));

vi.mock("../services/workout.service", () => ({
  getRecommendedWorkouts: serviceMocks.getRecommendedWorkouts,
  getWorkoutBySlug: serviceMocks.getWorkoutBySlug,
  listWorkoutsForUser: serviceMocks.listWorkoutsForUser,
}));

import { createApp } from "../server";

function profile(equipmentAccess: EquipmentAccess): UserProfile {
  return {
    id: "profile_1",
    userId: "user_1",
    journeyStage: "active_loss",
    goalWeight: 165,
    goalWeightUnit: "lb",
    dailyProteinTarget: 120,
    dailyCalorieTarget: 1800,
    goalPace: "steady",
    biggestFear: "losing_muscle",
    trainingStatus: "beginner",
    equipmentAccess,
    weeklyWorkoutTarget: 2,
    sideEffectBaseline: [],
    timezone: "America/New_York",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

function workout(slug: string, equipment: Workout["equipment"]): Workout {
  return {
    id: `workout_${slug}`,
    slug,
    title: slug,
    shortDescription: "A workout",
    focus: "strength",
    energyPhase: "steady_energy",
    durationMinutes: 15,
    difficulty: "beginner",
    equipment,
    intensity: "easy",
    muscleGroups: ["full body"],
    category: "strength",
    exercises: [
      {
        name: "Squat",
        sets: 3,
        reps: "10",
        restSeconds: 60,
        muscleGroups: ["legs"],
        notes: null,
      },
    ],
    safetyNotes: [],
    tags: [],
    version: 1,
    active: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

describe("workout routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    serviceMocks.getUserProfile.mockReset();
    serviceMocks.getRecommendedWorkouts.mockReset();
    serviceMocks.getWorkoutBySlug.mockReset();
    serviceMocks.listWorkoutsForUser.mockReset();
    serviceMocks.getUserProfile.mockResolvedValue(profile("dumbbells"));
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("requires authentication for workout list", async () => {
    const response = await request(app).get("/workouts");

    expect(response.status).toBe(401);
    expect(serviceMocks.listWorkoutsForUser).not.toHaveBeenCalled();
  });

  it("lists workouts filtered by the user's equipment access", async () => {
    serviceMocks.getUserProfile.mockResolvedValueOnce(profile("none"));
    serviceMocks.listWorkoutsForUser.mockResolvedValueOnce([
      workout("bodyweight-basics", "bodyweight"),
      workout("shot-day-mobility", "gentle"),
    ]);

    const response = await request(app).get("/workouts").set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data.map((item: Workout) => item.slug)).toEqual([
      "bodyweight-basics",
      "shot-day-mobility",
    ]);
    expect(serviceMocks.listWorkoutsForUser).toHaveBeenCalledWith("none", {});
  });

  it("passes category filters to the workout service", async () => {
    serviceMocks.listWorkoutsForUser.mockResolvedValueOnce([workout("upper-body-dumbbell", "dumbbells")]);

    const response = await request(app)
      .get("/workouts?category=strength")
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(serviceMocks.listWorkoutsForUser).toHaveBeenCalledWith("dumbbells", {
      category: "strength",
    });
  });

  it("keeps recommended route secured and delegates to legacy filters", async () => {
    serviceMocks.getRecommendedWorkouts.mockResolvedValueOnce([workout("upper-body-dumbbell", "dumbbells")]);

    const response = await request(app)
      .get("/workouts/recommended?focus=strength&energyPhase=steady_energy")
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(serviceMocks.getRecommendedWorkouts).toHaveBeenCalledWith({
      focus: "strength",
      energyPhase: "steady_energy",
    });
  });

  it("returns a workout by slug", async () => {
    serviceMocks.getWorkoutBySlug.mockResolvedValueOnce(workout("upper-body-dumbbell", "dumbbells"));

    const response = await request(app)
      .get("/workouts/upper-body-dumbbell")
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data.slug).toBe("upper-body-dumbbell");
  });

  it("returns 404 for missing workout slugs", async () => {
    serviceMocks.getWorkoutBySlug.mockResolvedValueOnce(null);

    const response = await request(app).get("/workouts/missing").set("Authorization", authorization);

    expect(response.status).toBe(404);
  });
});
