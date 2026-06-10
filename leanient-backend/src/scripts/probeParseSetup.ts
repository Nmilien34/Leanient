/**
 * Setup half of the frontend-parse probe: creates a fresh user and completes
 * onboarding via the running local backend, then prints the JWT. The actual
 * fetching/parsing happens in the frontend test harness (so the REAL
 * api.service schemas run). Pass "cleanup <userId>" to delete the user after.
 *
 * Run:  npx tsx src/scripts/probeParseSetup.ts            (create + onboard)
 *       npx tsx src/scripts/probeParseSetup.ts cleanup <userId>
 */
import path from "node:path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });
const BASE = process.env.PROBE_BASE_URL ?? "http://localhost:8080";

async function cleanup(userId: string): Promise<void> {
  await mongoose.connect(process.env.MONGODB_URI!);
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
  await mongoose.connection.collection("users").deleteOne({ _id: oid });
  console.log(`cleaned up ${userId}`);
  await mongoose.disconnect();
}

async function main(): Promise<void> {
  const [mode, idArg] = process.argv.slice(2);
  if (mode === "cleanup") {
    if (!idArg) throw new Error("cleanup requires a userId");
    await cleanup(idArg);
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI!);
  const insert = await mongoose.connection.collection("users").insertOne({
    email: `probe.feparse.${Date.now()}@example.com`,
    emailVerified: true,
    authProviders: [],
    displayName: "Probe FE Parse",
    subscriptionStatus: "free",
    subscriptionWillRenew: false,
    onboardingComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const userId = insert.insertedId.toString();
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET!, { algorithm: "HS256", expiresIn: "1h" });

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
  if (res.status >= 400) {
    console.error(`onboarding failed: ${res.status}`, (await res.text()).slice(0, 300));
    await cleanup(userId);
    process.exit(1);
  }

  console.log(`PROBE_USER_ID=${userId}`);
  console.log(`PROBE_TOKEN=${token}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
