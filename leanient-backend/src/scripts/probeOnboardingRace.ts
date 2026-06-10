/**
 * Reproduction probe for the "couldn't load this right now" error a fresh user
 * sees immediately after finishing onboarding.
 *
 * Simulates the exact app sequence against a RUNNING local backend:
 *   1. Create a throwaway user directly in Mongo (onboardingComplete: false).
 *   2. Mint a session JWT (same HS256 + sub shape as issueSessionJwt).
 *   3. Fire the pre-onboarding home fetch (what App.tsx does at sign-in).
 *   4. POST /onboarding/complete with a realistic body.
 *   5. IMMEDIATELY fire the same 11 home calls refreshHomeData() makes.
 *   6. Report each call's status for both rounds, then delete the test user.
 *
 * Run:  npx tsx src/scripts/probeOnboardingRace.ts   (backend must be running on :8080)
 */
import path from "node:path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:8080";

async function call(name: string, pathname: string, token: string): Promise<string> {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}${pathname}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ms = Date.now() - started;
    let detail = "";
    if (res.status >= 400) {
      const body = await res.text();
      detail = ` ${body.slice(0, 140)}`;
    }
    // The app's axios client times out at 10s; flag anything close to that.
    const slow = ms > 8000 ? "  <-- WOULD TIME OUT IN APP (>10s axios limit)" : ms > 4000 ? "  <-- slow" : "";
    return `${res.status >= 400 ? "FAIL" : " ok "} ${String(res.status).padEnd(3)} ${String(ms).padStart(6)}ms ${name}${detail}${slow}`;
  } catch (error) {
    return `FAIL ERR ${String(Date.now() - started).padStart(6)}ms ${name} ${(error as Error).message}`;
  }
}

async function homeFetchRound(label: string, token: string): Promise<void> {
  const today = new Date().toISOString();
  const calls: Array<[string, string]> = [
    ["getProfile", "/me/profile"],
    ["getMedicationProtocol", "/me/medication"],
    ["getWeightLogs", "/weight-logs"],
    ["getLatestWeeklyVerdict", "/weekly-verdicts/latest"],
    ["getRecommendedWorkouts", "/workouts/recommended"],
    ["getTodaysFocus", "/home/focus"],
    ["getMealLogs(today)", `/meal-logs?from=${encodeURIComponent(today.slice(0, 10) + "T00:00:00.000Z")}&to=${encodeURIComponent(today.slice(0, 10) + "T23:59:59.999Z")}`],
    ["getWorkoutLogs(today)", `/workout-logs?from=${encodeURIComponent(today.slice(0, 10) + "T00:00:00.000Z")}&to=${encodeURIComponent(today.slice(0, 10) + "T23:59:59.999Z")}`],
    ["getDoseLogs", "/dose-logs"],
    ["getProgressOverview", "/progress/overview"],
    ["getTrainingToday", "/training/today"],
  ];
  const results = await Promise.all(calls.map(([name, p]) => call(name, p, token)));
  console.log(`\n--- ${label} ---`);
  for (const line of results) console.log(line);
}

async function main(): Promise<void> {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error("MONGODB_URI and JWT_SECRET must be set");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection("users");

  const insert = await users.insertOne({
    email: `probe.onboarding.race.${Date.now()}@example.com`,
    emailVerified: true,
    authProviders: [],
    displayName: "Probe User",
    subscriptionStatus: "free",
    subscriptionWillRenew: false,
    onboardingComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const userId = insert.insertedId.toString();
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  });
  console.log(`created probe user ${userId}`);

  try {
    await homeFetchRound("ROUND 1: pre-onboarding (what sign-in fires)", token);

    const body = {
      profile: {
        journeyStage: "active_loss",
        goalWeight: 170,
        goalWeightUnit: "lb",
        goalPace: "steady",
        biggestFear: "losing_muscle",
        trainingStatus: "beginner",
        equipmentAccess: "dumbbells",
        weeklyWorkoutTarget: 3,
        sideEffectBaseline: [],
        timezone: "America/New_York",
        sex: "male",
        ageYears: 30,
        heightInches: 70,
      },
      medicationProtocol: {
        medicationName: "Ozempic",
        doseAmount: 0.5,
        doseUnit: "mg",
        shotDays: ["sunday"],
        startDate: "2026-05-01",
        active: true,
      },
      initialWeight: {
        value: 210,
        unit: "lb",
        measuredAt: new Date().toISOString(),
      },
    };

    const res = await fetch(`${BASE}/onboarding/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    console.log(`\nPOST /onboarding/complete -> ${res.status}`);
    if (res.status >= 400) {
      console.log((await res.text()).slice(0, 400));
      return;
    }

    // Immediately, like handleOnboardingComplete does.
    await homeFetchRound("ROUND 2: immediately after onboarding completes", token);

    // And once more after 2s to see if any failure is transient.
    await new Promise((r) => setTimeout(r, 2000));
    await homeFetchRound("ROUND 3: 2s later (what a reload would see)", token);
  } finally {
    // Clean up everything the probe created.
    const oid = new mongoose.Types.ObjectId(userId);
    const collections = [
      "userprofiles",
      "usermedicationprotocols",
      "weightlogs",
      "weeklycheckins",
      "weeklyverdicts",
      "meallogs",
      "workoutlogs",
      "doselogs",
    ];
    for (const c of collections) {
      await mongoose.connection
        .collection(c)
        .deleteMany({ userId: oid })
        .catch(() => undefined);
    }
    await users.deleteOne({ _id: oid });
    console.log("\nprobe user + data cleaned up");
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("probe failed:", error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
