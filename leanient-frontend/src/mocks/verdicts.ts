import type { UserContextSnapshot, VerdictStatus, WeeklyVerdict } from "@leanient/shared";

/**
 * Typed WeeklyVerdict fixtures for Home dev/screenshots — one per status
 * (on_track / drifting / losing_muscle / no_data). Swap these for the live
 * `LeanientDataContext.latestVerdict` at integration. Each is typed against the
 * shared `WeeklyVerdict`, so a contract change breaks them at compile time.
 */
const STAMP = "2026-06-01T12:00:00.000Z";

const snapshotProfile: UserContextSnapshot["profile"] = {
  journeyStage: "active_loss",
  goalWeight: 172,
  goalWeightUnit: "lb",
  dailyProteinTarget: 120,
  dailyCalorieTarget: 1800,
  goalPace: "steady",
  biggestFear: "losing_muscle",
  trainingStatus: "consistent",
  equipmentAccess: "dumbbells",
  weeklyWorkoutTarget: 3,
  sideEffectBaseline: [],
  timezone: "America/New_York",
};

function makeVerdict(
  status: VerdictStatus,
  fields: Pick<WeeklyVerdict, "headline" | "message" | "nextActionCode" | "explanationFactors"> & {
    proteinGramsPerDay?: number;
    resistanceWorkoutsCompleted?: number;
    explanation?: string | null;
    score?: number | null;
  },
): WeeklyVerdict {
  return {
    id: `verdict_${status}`,
    userId: "user_demo",
    weekOf: "2026-05-25",
    checkinId: status === "no_data" ? null : "checkin_demo",
    source: status === "no_data" ? "cron_no_data" : "checkin",
    engineVersion: "v1",
    copyVersion: "v1",
    explanation: fields.explanation ?? null,
    status,
    score: fields.score ?? null,
    estimatedLeanMassRisk: null,
    nextActionCode: fields.nextActionCode,
    headline: fields.headline,
    message: fields.message,
    explanationFactors: fields.explanationFactors,
    inputsUsed:
      status === "no_data"
        ? undefined
        : {
            profile: snapshotProfile,
            weight: { value: 184, unit: "lb", measuredAt: STAMP },
            proteinGramsPerDay: fields.proteinGramsPerDay ?? 0,
            resistanceWorkoutsCompleted: fields.resistanceWorkoutsCompleted ?? 0,
            dataSource: { protein: "logs", training: "logs" },
          },
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

export const mockVerdictOnTrack = makeVerdict("on_track", {
  headline: "You're keeping your muscle.",
  message: "Protein hit, training stimulus locked in, weight trending down at the right pace.",
  nextActionCode: "see_plan",
  explanationFactors: ["Protein on target", "2 of 3 sessions", "Steady loss"],
  proteinGramsPerDay: 58.9,
  resistanceWorkoutsCompleted: 2,
  score: 82,
});

export const mockVerdictDrifting = makeVerdict("drifting", {
  headline: "You're drifting.",
  message: "Protein is short and you missed your last training session. Recoverable.",
  nextActionCode: "fix_protein_lunch",
  explanationFactors: ["Protein 18% short", "1 of 3 sessions"],
  proteinGramsPerDay: 44,
  resistanceWorkoutsCompleted: 1,
  score: 58,
});

export const mockVerdictLosingMuscle = makeVerdict("losing_muscle", {
  headline: "You're losing muscle.",
  message: "Two weeks of low protein and no training. Today's the day to fix it.",
  nextActionCode: "start_upper_body",
  explanationFactors: ["Protein low 2 weeks", "0 sessions"],
  proteinGramsPerDay: 31,
  resistanceWorkoutsCompleted: 0,
  score: 34,
});

export const mockVerdictNoData = makeVerdict("no_data", {
  headline: "Your first verdict\nis almost ready.",
  message: "Log this week's check-in to see whether you're keeping your muscle. Takes 90 seconds.",
  nextActionCode: "log_checkin",
  explanationFactors: [],
});
