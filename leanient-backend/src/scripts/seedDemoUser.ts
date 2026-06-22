/**
 * Seed the App Store review demo account (guideline 2.1a) with weeks of realistic
 * data so a reviewer can verify every feature: weight trend, muscle-retention
 * verdict, doses, workouts, meals. Idempotent — re-running wipes the demo
 * account's logs and recreates them. The reviewer signs in via POST /auth/demo
 * (see signInWithReviewAccount) using the credentials in src/config/demoAccount.
 *
 * Intentionally does NOT import ../config/env (which fail-fasts on the full
 * required set). It loads .env directly, like grantSubscription.ts.
 *
 * Run from leanient-backend/:   npm run seed:demo
 * or from repo root:            npx tsx leanient-backend/src/scripts/seedDemoUser.ts
 * On Render: open the leanient-backend Shell and run the npx form.
 */
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";

const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });
dotenv.config({ override: false });

import { DEMO_ACCOUNT } from "../config/demoAccount";
import { UserModel } from "../models/user.model";
import { UserProfileModel } from "../models/userProfile.model";
import { UserMedicationProtocolModel } from "../models/userMedicationProtocol.model";
import { WeightLogModel } from "../models/weightLog.model";
import { MuscleRetentionSnapshotModel } from "../models/muscleRetentionSnapshot.model";
import { DoseLogModel } from "../models/doseLog.model";
import { WorkoutLogModel } from "../models/workoutLog.model";
import { MealLogModel } from "../models/mealLog.model";
import { WeeklyVerdictModel } from "../models/weeklyVerdict.model";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const round1 = (n: number) => Math.round(n * 10) / 10;

const START_WEIGHT = 210;
const GOAL_WEIGHT = 175;
const PROTEIN_TARGET = 165;
const CALORIE_TARGET = 1900;
const WORKOUT_TARGET = 3;
const PER_WEEK_LOSS = 1.8;
const SITES = ["abdomen_left", "thigh_right", "arm_left"] as const;

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Run from the Render shell or set it in .env.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });

  try {
    // 1) User — onboarded, with an active subscription so premium features unlock.
    const user = await UserModel.findOneAndUpdate(
      { email: DEMO_ACCOUNT.email },
      {
        $set: {
          email: DEMO_ACCOUNT.email,
          emailVerified: true,
          displayName: DEMO_ACCOUNT.displayName,
          subscriptionStatus: "active",
          subscriptionWillRenew: true,
          entitlementExpiresAt: new Date(now.getTime() + 365 * DAY),
          onboardingComplete: true,
          onboardingCompletedAt: daysAgo(70),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const userId = user._id;

    // 2) Profile.
    await UserProfileModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          userId,
          journeyStage: "active_loss",
          goalWeight: GOAL_WEIGHT,
          goalWeightUnit: "lb",
          dailyProteinTarget: PROTEIN_TARGET,
          dailyCalorieTarget: CALORIE_TARGET,
          goalPace: "steady",
          biggestFear: "losing_muscle",
          trainingStatus: "consistent",
          equipmentAccess: "dumbbells",
          weeklyWorkoutTarget: WORKOUT_TARGET,
          ageYears: 38,
          heightInches: 70,
          timezone: "America/New_York",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // 3) Medication protocol — Wegovy, weekly Sunday shot, started 10 weeks ago.
    await UserMedicationProtocolModel.deleteMany({ userId });
    const protocol = await UserMedicationProtocolModel.create({
      userId,
      medicationName: "Wegovy",
      doseAmount: 1.0,
      doseUnit: "mg",
      shotDays: ["sunday"],
      shotDay: "sunday",
      startDate: ymd(daysAgo(70)),
      active: true,
    });

    // 4) Weight logs — 11 weekly weigh-ins trending down.
    await WeightLogModel.deleteMany({ userId });
    const weightDocs = [];
    for (let w = 10; w >= 0; w -= 1) {
      const measuredAt = daysAgo(w * 7);
      weightDocs.push({
        userId,
        value: round1(GOAL_WEIGHT + 17 + w * PER_WEEK_LOSS),
        unit: "lb",
        measuredAt,
        weekOf: ymd(measuredAt),
        source: "weekly_checkin",
      });
    }
    await WeightLogModel.insertMany(weightDocs);

    // 5) Muscle-retention snapshots — 8 weeks, score climbing (drives the verdict + Progress chart).
    await MuscleRetentionSnapshotModel.deleteMany({ userId });
    const snapshotDocs = [];
    for (let w = 7; w >= 0; w -= 1) {
      const idx = 7 - w;
      const score = Math.min(86, 76 + idx * 1.4);
      const endWeight = round1(GOAL_WEIGHT + 17 + w * PER_WEEK_LOSS);
      snapshotDocs.push({
        userId,
        weekOf: daysAgo(w * 7),
        proteinScore: Math.min(92, 84 + idx),
        trainingScore: Math.min(88, 72 + idx * 1.6),
        paceScore: 86,
        muscleRetentionScore: Math.round(score),
        retentionLabel: score >= 80 ? "keeping_muscle" : "maintaining",
        weeklyWeightLossLb: PER_WEEK_LOSS,
        cumulativeWeightLossLb: round1(START_WEIGHT - endWeight),
        inputsUsed: {
          avgDailyProteinGrams: 152,
          sessionsCompleted: 2,
          weeklyWorkoutTarget: WORKOUT_TARGET,
          dailyProteinTarget: PROTEIN_TARGET,
          startWeight: round1(endWeight + PER_WEEK_LOSS),
          endWeight,
          dataSource: { protein: "logs", training: "logs", weight: "logs" },
        },
        engineVersion: "v1.0",
      });
    }
    await MuscleRetentionSnapshotModel.insertMany(snapshotDocs);

    // 6) Latest weekly verdict (the worded read).
    await WeeklyVerdictModel.deleteMany({ userId });
    await WeeklyVerdictModel.create({
      userId,
      weekOf: ymd(now),
      source: "checkin",
      engineVersion: "v1.0",
      status: "on_track",
      score: 84,
      estimatedLeanMassRisk: 0.18,
      nextActionCode: "stay_course",
      headline: "You're keeping your muscle",
      message: "Down 18 lb and your lean mass is holding. Two protein-forward meals and your strength sessions keep it that way.",
      explanation: "Protein stayed near target and you logged steady resistance training, so most of this week's loss came from fat.",
      explanationFactors: ["Protein near target", "Resistance training logged", "Loss pace in the safe range"],
    });

    // 7) Recent doses.
    await DoseLogModel.deleteMany({ userId });
    await DoseLogModel.insertMany(
      [2, 9, 16].map((d, i) => ({
        userId,
        recordedAt: daysAgo(d),
        medicationProtocolId: protocol._id,
        doseAmount: 1.0,
        doseUnit: "mg",
        injectionSite: SITES[i % SITES.length],
        painLevel: 1,
      })),
    );

    // 8) Recent workouts.
    await WorkoutLogModel.deleteMany({ userId });
    await WorkoutLogModel.insertMany(
      [1, 4, 8, 11, 15].map((d) => ({
        userId,
        recordedAt: daysAgo(d),
        customWorkoutName: "Resistance",
        durationMinutes: 30,
        countsAsResistance: true,
        perceivedEffort: "normal",
        exercises: [
          { name: "Goblet squat", sets: [{ reps: 10, weight: 40, unit: "lb" }] },
          { name: "Dumbbell press", sets: [{ reps: 10, weight: 30, unit: "lb" }] },
        ],
      })),
    );

    // 9) Recent meals.
    await MealLogModel.deleteMany({ userId });
    await MealLogModel.insertMany([
      { userId, recordedAt: daysAgo(0), source: "manual", foodName: "Grilled chicken and rice", protein: 48, calories: 540 },
      { userId, recordedAt: daysAgo(0), source: "manual", foodName: "Greek yogurt with berries", protein: 22, calories: 210 },
      { userId, recordedAt: daysAgo(1), source: "manual", foodName: "Salmon with vegetables", protein: 40, calories: 480 },
      { userId, recordedAt: daysAgo(1), source: "manual", foodName: "Protein shake", protein: 30, calories: 180 },
    ]);

    console.log("Demo account seeded:");
    console.log(`  email:    ${DEMO_ACCOUNT.email}`);
    console.log(`  password: ${DEMO_ACCOUNT.password}`);
    console.log(`  _id:      ${String(userId)}`);
    console.log("  data:     profile, medication, 11 weigh-ins, 8 retention weeks, verdict, 3 doses, 5 workouts, 4 meals");
    console.log("\nUse POST /auth/demo with the email + password (the app's reviewer sign-in calls this).");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("seed:demo failed:", error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
