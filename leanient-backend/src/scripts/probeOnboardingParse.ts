/**
 * Round 2 of the onboarding-error hunt: backend returns 200s right after
 * onboarding, so the app's failure must be client-side. The app validates
 * every response with Zod; this probe runs the REAL shared schemas against the
 * first-ever (freshly generated) /home/focus and /training/today responses and
 * the immediate re-fetch (cached) ones, to catch a fresh-vs-cached shape drift.
 *
 * Run:  npx tsx src/scripts/probeOnboardingParse.ts  (backend running on :8080)
 */
import path from "node:path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {
  todaysFocusResponseSchema,
  trainingTodayResponseSchema,
  progressOverviewResponseSchema,
} from "@leanient/shared";

const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });

const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:8080";

async function getJson(pathname: string, token: string): Promise<unknown> {
  const res = await fetch(`${BASE}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json()) as { data?: unknown };
  if (res.status >= 400) throw new Error(`${pathname} -> ${res.status}`);
  return body.data;
}

function tryParse(label: string, schema: { safeParse(v: unknown): { success: boolean; error?: unknown } }, value: unknown): void {
  const result = schema.safeParse(value);
  if (result.success) {
    console.log(` ok  parse ${label}`);
  } else {
    console.log(`FAIL parse ${label}`);
    console.log(JSON.stringify((result.error as { issues?: unknown }).issues, null, 2).slice(0, 1200));
    console.log("  payload:", JSON.stringify(value).slice(0, 700));
  }
}

async function main(): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI!);
  const users = mongoose.connection.collection("users");
  const insert = await users.insertOne({
    email: `probe.parse.${Date.now()}@example.com`,
    emailVerified: true,
    authProviders: [],
    displayName: "Probe Parse",
    subscriptionStatus: "free",
    subscriptionWillRenew: false,
    onboardingComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const userId = insert.insertedId.toString();
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { algorithm: "HS256", expiresIn: "1h" });

  try {
    const res = await fetch(`${BASE}/onboarding/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
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
        initialWeight: { value: 210, unit: "lb", measuredAt: new Date().toISOString() },
      }),
    });
    console.log(`POST /onboarding/complete -> ${res.status}`);
    if (res.status >= 400) {
      console.log((await res.text()).slice(0, 300));
      return;
    }

    console.log("\n--- FIRST fetch (fresh generation — what the app hits right after onboarding) ---");
    const [focus1, training1, progress1] = await Promise.all([
      getJson("/home/focus", token),
      getJson("/training/today", token),
      getJson("/progress/overview", token),
    ]);
    tryParse("todaysFocus (fresh)", todaysFocusResponseSchema, focus1);
    tryParse("trainingToday (fresh)", trainingTodayResponseSchema, training1);
    tryParse("progressOverview (fresh)", progressOverviewResponseSchema, progress1);

    console.log("\n--- SECOND fetch (cached — what a reload sees) ---");
    const [focus2, training2] = await Promise.all([
      getJson("/home/focus", token),
      getJson("/training/today", token),
    ]);
    tryParse("todaysFocus (cached)", todaysFocusResponseSchema, focus2);
    tryParse("trainingToday (cached)", trainingTodayResponseSchema, training2);

    if (JSON.stringify(focus1) !== JSON.stringify(focus2)) {
      console.log("\nNOTE: /home/focus fresh vs cached responses DIFFER:");
      console.log(" fresh :", JSON.stringify(focus1).slice(0, 400));
      console.log(" cached:", JSON.stringify(focus2).slice(0, 400));
    }
    if (JSON.stringify(training1) !== JSON.stringify(training2)) {
      console.log("\nNOTE: /training/today fresh vs cached responses DIFFER:");
      console.log(" fresh :", JSON.stringify(training1).slice(0, 400));
      console.log(" cached:", JSON.stringify(training2).slice(0, 400));
    }
  } finally {
    const oid = new mongoose.Types.ObjectId(userId);
    for (const c of [
      "userprofiles",
      "usermedicationprotocols",
      "weightlogs",
      "weeklycheckins",
      "weeklyverdicts",
      "meallogs",
      "workoutlogs",
      "doselogs",
      "todaysfocuses",
      "workoutrecommendations",
    ]) {
      await mongoose.connection.collection(c).deleteMany({ userId: oid }).catch(() => undefined);
    }
    await users.deleteOne({ _id: oid });
    console.log("\nprobe user cleaned up");
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("probe failed:", error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
