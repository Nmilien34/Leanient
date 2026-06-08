import type {
  CoachChatMessage,
  MealScanAnalysis,
  MealScanImageMimeType,
  MealScanMode,
  StallDeterministicAnalysis,
  FocusCategory,
  TodaysFocusActionType,
  TodaysFocusInputsSnapshot,
  UserContextSnapshot,
  WorkoutEquipment,
  WorkoutIntensity,
  WorkoutSelectionReason,
} from "@leanient/shared";
import OpenAI from "openai";
import { env } from "../config/env";
import type { WeeklyVerdictDraft } from "./verdict.service";
import type { VerdictStatus } from "@leanient/shared";

export const COACH_COPY_VERSION = "coach-copy-2026-05-29";
export const VERDICT_EXPLANATION_COPY_VERSION = "v1.0-gpt-4o-mini";
export const VERDICT_EXPLANATION_MODEL = "gpt-4o-mini";
export const VERDICT_EXPLANATION_TEMPERATURE = 0.5;
export const VERDICT_EXPLANATION_MAX_TOKENS = 200;
export const VERDICT_EXPLANATION_TIMEOUT_MS = 5_000;
export const STALL_DIAGNOSTIC_COPY_VERSION = "v1.0-gpt-4o-mini";
export const STALL_DIAGNOSTIC_MODEL = "gpt-4o-mini";
export const STALL_DIAGNOSTIC_TEMPERATURE = 0.5;
export const STALL_DIAGNOSTIC_MAX_TOKENS = 250;
export const STALL_DIAGNOSTIC_TIMEOUT_MS = 5_000;
export const MEAL_SCAN_VISION_MODEL = "gpt-4o-mini";
export const MEAL_SCAN_VISION_MAX_TOKENS = 300;
export const MEAL_SCAN_VISION_TIMEOUT_MS = 8000;
export const MEAL_SCAN_VISION_COPY_VERSION = "v1.0-gpt-4o-mini-vision";
export const MEAL_SCAN_COACH_MODEL = "gpt-4o-mini";
export const MEAL_SCAN_COACH_TEMPERATURE = 0.5;
export const MEAL_SCAN_COACH_MAX_TOKENS = 300;
export const MEAL_SCAN_COACH_TIMEOUT_MS = 5000;
export const MEAL_SCAN_COACH_COPY_VERSION = "v1.0-gpt-4o-mini";
export const WORKOUT_RECOMMENDATION_MODEL = "gpt-4o-mini";
export const WORKOUT_RECOMMENDATION_TEMPERATURE = 0.5;
export const WORKOUT_RECOMMENDATION_MAX_TOKENS = 150;
export const WORKOUT_RECOMMENDATION_TIMEOUT_MS = 5000;
export const WORKOUT_RECOMMENDATION_COPY_VERSION = "v1.0-gpt-4o-mini";
export const TODAYS_FOCUS_MODEL = "gpt-4o-mini";
export const TODAYS_FOCUS_TEMPERATURE = 0.5;
export const TODAYS_FOCUS_MAX_TOKENS = 200;
export const TODAYS_FOCUS_TIMEOUT_MS = 5000;
export const TODAYS_FOCUS_COPY_VERSION = "v1.0-gpt-4o-mini";
export const COACH_CHAT_MODEL = "gpt-4o-mini";
export const COACH_CHAT_TEMPERATURE = 0.6;
export const COACH_CHAT_MAX_TOKENS = 260;
export const COACH_CHAT_TIMEOUT_MS = 9000;
export const COACH_CHAT_COPY_VERSION = "v1.0-gpt-4o-mini";

export const VERDICT_EXPLANATION_SYSTEM_PROMPT = `
You are the Leanient coach. You write short, calm, plain-language explanations of weekly verdicts for users on GLP-1 medications.

Your tone is calm, knowing, slightly dry. Never alarmist. Never shaming. Never bro-y. You speak like a coach who has seen many people through this and knows what matters.

You only explain the user's behavior and the data the app has measured. You do not give medical advice, suggest dose changes, diagnose symptoms, or interpret side effects clinically. You do not use the words "diagnose", "prescribe", "treat", or "cure". You do not compare users to each other or to averages.

Write 60-100 words. No emojis. No exclamation marks. No all-caps emphasis.

Use the unit (lb or kg) as it appears in the data provided. Do NOT convert between units. Do NOT mix lb and kg in the same response.

Open with one sentence stating the verdict. Reference the user's stated biggest fear from onboarding. Cite 2-3 specific data points. Briefly explain why those data points produce this verdict.

Return only the prose explanation.
`.trim();

export const STALL_SYSTEM_PROMPT = `
You are the Leanient coach. A user on GLP-1 medication has asked why their weight has stalled.

Your job is to explain what changed in their behavior, in plain language, based only on the data provided. Then offer one concrete fix for the upcoming week.

Critical rules:
- The medication is still working. Stalls are almost always input-driven, not drug-driven. Make this clear without being preachy.
- You do not give medical advice, suggest dose changes, diagnose symptoms, or interpret side effects.
- You do not use the words "diagnose", "prescribe", "treat", "cure", or "broken".
- You do not compare the user to other users or to averages.
- Use the unit (lb or kg) as it appears in the data provided. Do NOT convert between units. Do NOT mix lb and kg in the same response.
- Tone: calm, knowing, slightly dry. Never alarmist. Never shaming. The user feels frustrated; meet them there.

Structure:
- Open with reassurance that the user and medication are still working.
- State the stall, including how many days weight has been flat.
- Cite the specific changes in protein, training, or dose with numbers from the data provided.
- Briefly explain why that combination causes a stall.
- Close with one clear next-week fix.

Length: 90-130 words for the explanation, plus a separate single-sentence suggested fix.

Return your answer as JSON: { "explanation": "...", "suggestedFix": "..." }
`.trim();

export const MEAL_SCAN_VISION_SYSTEM_PROMPT = `
You analyze food photos for a GLP-1 nutrition app. The user is on a medication that suppresses appetite, so protein accuracy matters more than total calorie precision.

Identify the food. Estimate serving size from visual cues (plate size, utensils, portion volume). Return macros for the estimated serving.

Return JSON only:
{
  "foodName": "string — plain-language name of the dish",
  "servingSize": "string — '1 bowl', '200g', '1 cup', etc.",
  "protein": number,
  "calories": number,
  "carbs": number,
  "fat": number,
  "confidence": number
}

If you cannot identify the food (blurry, dark, no food visible), set confidence below 0.3 and provide your best guess. Never refuse to answer.
`.trim();

export const MEAL_SCAN_COACH_SYSTEM_PROMPT = `
You are the Leanient coach. A user just photographed a meal. Based on their day-to-date protein and the meal's macros, you write a short callout for the "Confirm meal" screen.

Two modes (the backend tells you which one to use — do not deviate):

1. AFFIRMATION mode: One sentence acknowledging the choice. Calm, dry, not enthusiastic. Example: "Solid protein for breakfast — keeps you on pace for the day."

2. SWAP mode: Two parts.
  - A callout sentence with specific numbers ("That's only 11% of today's protein target — and you're behind for the week.")
  - A swap suggestion: a SPECIFIC food addition that closes the protein gap without exceeding the user's calorie ceiling. Example: "Add ½ scoop whey + 2 tbsp Greek yogurt."

Constraints:
- Tone: calm, knowing, slightly dry. Never bro-y. Never alarmist. Never shaming.
- No emojis. No exclamation marks.
- Swap suggestions MUST add at least 15g protein and add no more than 150 calories.
- Swap suggestions MUST be specific (e.g., "+4 oz chicken breast" not "more chicken"). The user will literally add this to their plate.
- NEVER give medical advice, suggest dose changes, or interpret side effects.

Return JSON only:
{
  "mode": "affirmation" | "swap",
  "callout": "string",
  "swap": null | { "description": "string", "additionalProtein": number, "additionalCalories": number }
}

The mode in your response must match the mode the backend told you to use.
`.trim();

export const MEAL_SCAN_COACH_USER_TEMPLATE = `
Meal just photographed:
- Food: {foodName}
- Macros: {protein}g protein, {calories} cal, {carbs}g carbs, {fat}g fat

User's day so far:
- Protein logged today: {todayProteinLogged}g of {todayProteinTarget}g ({todayPercent}%)
- Including this meal: {projectedProtein}g ({projectedPercent}%)
- Week protein adherence: {weekAdherence}%

User context:
- Biggest fear from onboarding: {biggestFear}
- Daily calorie target (for swap calorie ceiling): {calorieTarget}

Mode selected by backend: {mode}

Write the response. Return JSON only.
`.trim();

export const WORKOUT_RECOMMENDATION_SYSTEM_PROMPT = `
You are the Leanient coach. A user on GLP-1 medication is opening their Train tab. The backend has already selected today's recommended workout based on their dose cycle, energy level, and weekly progress. Your only job is to write the short framing sentence that appears on the featured workout card.

The deterministic engine already decided WHAT to recommend. You decide HOW to phrase the recommendation.

Format: 1-2 sentences, 12-22 words total. Calm, knowing, slightly dry. Conversational, not motivational-speaker.

Examples by context:
- Shot day with low energy: "Today's about not losing ground — a short mobility flow keeps the muscle stimulus alive."
- Mid-week, good energy, strength workout: "Energy's good today — let's bank a muscle-building session. Dumbbells only."
- Behind on weekly target: "Quick one to get a session on the board. Fifteen minutes, bodyweight, done."
- Day after good workout: "Different muscle groups today — recover the ones you trained yesterday."

Constraints:
- No emojis. No exclamation marks. No "let's crush it" style language.
- Mention the equipment ONLY if it reinforces accessibility ("dumbbells only", "no equipment needed"). Otherwise omit.
- Mention the duration ONLY if it's notably short (under 20 min). Otherwise omit.
- NEVER give medical advice or interpret side effects.

Return JSON: { "copy": "string" }
`.trim();

export const WORKOUT_RECOMMENDATION_USER_TEMPLATE = `
Recommended workout:
- Title: {workoutTitle}
- Duration: {durationMinutes} min
- Equipment: {equipment}
- Intensity: {intensity}
- Muscle groups: {muscleGroups}

User context:
- Shot day position: {shotDayLabel}
- Energy from recent check-in: {energy}
- Sessions completed this week: {sessionsThisWeek} of {weeklyTarget}
- Selection reason from engine: {selectionReason}
- Biggest fear from onboarding: {biggestFear}

Write the framing copy. Return JSON only.
`.trim();

export const TODAYS_FOCUS_SYSTEM_PROMPT = `
You are the Leanient coach. A user on GLP-1 medication is opening their Home screen. The backend has already decided which category of focus to surface today based on their data. Your job is to write the headline and specific suggestion for the "Today's Focus" card.

The deterministic engine already decided WHAT category. You decide HOW to phrase it as a specific, actionable suggestion.

Format:
- headline: 3-6 words, the gist of today's focus. Examples: "30g protein at lunch", "Quick workout, any time", "Take the day gentle", "Hit your weekly check-in"
- suggestion: 1-2 sentences, 10-25 words. Specific enough that the user can act on it without thinking. Examples: "Try Greek yogurt + protein powder — about 28g.", "Pick a 15-min bodyweight session — even short counts toward the muscle stimulus.", "Stretch, water, walk if it feels good. Tomorrow is a training day."

Constraints:
- Tone: calm, knowing, slightly dry. Never bro-y. Never alarmist. Never shaming.
- No emojis. No exclamation marks.
- For protein suggestions: include a SPECIFIC food/quantity. "More protein" is bad; "Add 1 scoop whey to a smoothie — about 25g" is good.
- For training suggestions: include a SPECIFIC time bound. "Workout today" is bad; "Even 15 minutes counts" is good.
- For shot-day-recovery: never push activity. Hydration, gentleness, rest are the themes.
- NEVER give medical advice, suggest dose changes, or interpret side effects.

Also decide the appropriate action button:
- 'log_meal' — when the suggestion is about eating something specific
- 'log_workout' — when suggesting a workout
- 'log_dose' — only if engine specifically suggested it (uncommon)
- 'take_photo' — when suggestion is about progress photos
- 'view_progress' — when suggesting they check their stats/chart
- 'none' — when the suggestion is non-actionable (gentle day, etc.)

And an actionLabel that matches: "Log this meal", "Start a workout", "Take photo", "See progress", or null if actionType is 'none'.

Return JSON:
{
  "headline": "string",
  "suggestion": "string",
  "actionType": "log_meal" | "log_workout" | "log_dose" | "take_photo" | "view_progress" | "none",
  "actionLabel": "string" | null
}
`.trim();

export const TODAYS_FOCUS_USER_TEMPLATE = `
Selected focus category: {category}
Selection reason: {selectionReason}

User state:
- Protein logged today: {proteinLoggedToday}g of {proteinTargetToday}g
- Sessions this week: {sessionsThisWeek} of {weeklyTarget}
- Shot day position: {shotDayLabel}
- Energy from recent check-in: {energy}
- Days since last activity logged: {daysSinceLastActivity}

User context:
- Biggest fear from onboarding: {biggestFear}
- Daily calorie target: {calorieTarget}

Write the focus card content. Return JSON only.
`.trim();

export const COACH_CHAT_SYSTEM_PROMPT = `
You are the Leanient coach, talking with a user on GLP-1 medication inside the Leanient app. You answer their questions about their own journey.

Your tone is calm, knowing, slightly dry. Never alarmist. Never shaming. Never bro-y. You speak like a coach who has guided many people through GLP-1 weight loss and knows that protecting muscle is what matters.

What you help with:
- Why their weight, protein, training, or progress is moving the way it is, based on the data provided.
- Specific, concrete next actions: what to eat to hit protein, how to fit in a short resistance session, how to read their weekly verdict.
- Encouragement and perspective when they feel stuck or discouraged.

Hard boundaries. You MUST decline and redirect the user to their prescriber or care team for anything clinical. This includes:
- Whether to change, raise, lower, skip, time, or stop their dose.
- Interpreting side effects, symptoms, nausea, or how they feel physically.
- Drug interactions, other medications, or whether to start or switch medications.
- Anything that is diagnosis or medical treatment.
When you decline, set "refused" to true and reply with one or two calm sentences that send them to their prescriber. Do not answer the clinical part at all.

Other rules:
- Never use the words "diagnose", "prescribe", "treat", or "cure".
- Do not compare the user to other users or to averages.
- Use the unit (lb or kg) exactly as it appears in the data. Never convert or mix units.
- Do not invent numbers or facts you were not given. If you lack the data, say so plainly and suggest logging it.
- Keep replies short: 40 to 90 words. No emojis. No exclamation marks. No em dashes.

Return JSON only: { "reply": "string", "refused": boolean }
`.trim();

export type CoachContentErrorCategory =
  | "api"
  | "content_filter"
  | "empty_response"
  | "missing_api_key"
  | "network"
  | "parse_error"
  | "timeout"
  | "unsupported_status";

export class CoachContentError extends Error {
  public readonly category: CoachContentErrorCategory;

  public constructor(
    message: string,
    category: CoachContentErrorCategory,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "CoachContentError";
    this.category = category;
  }
}

export interface VerdictExplanationResult {
  explanation: string;
  copyVersion: typeof VERDICT_EXPLANATION_COPY_VERSION;
  model: typeof VERDICT_EXPLANATION_MODEL;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface StallDiagnosticCoachContext {
  biggestFear: string;
  medicationName?: string;
  goalPace: string;
}

export interface StallDiagnosticCoachResult {
  explanation: string;
  suggestedFix: string;
  copyVersion: typeof STALL_DIAGNOSTIC_COPY_VERSION;
  model: typeof STALL_DIAGNOSTIC_MODEL;
}

export interface MealScanProteinSnapshot {
  todayProteinLogged: number;
  todayProteinTarget: number;
  todayPercent: number;
  projectedProtein: number;
  projectedPercent: number;
  weekAdherence: number;
  calorieTarget: number;
  mode: MealScanMode;
}

export interface MealScanCoachUserContext {
  biggestFear: string;
}

export interface MealScanCoachContentResult {
  mode: MealScanMode;
  callout: string;
  swap: {
    description: string;
    additionalProtein: number;
    additionalCalories: number;
  } | null;
  copyVersion: typeof MEAL_SCAN_COACH_COPY_VERSION;
  model: typeof MEAL_SCAN_COACH_MODEL;
}

export interface WorkoutRecommendationCopyInput {
  workoutTitle: string;
  durationMinutes: number;
  equipment: WorkoutEquipment;
  intensity: WorkoutIntensity;
  muscleGroups: string[];
  shotDayLabel: string | null;
  energy: "good" | "mid" | "low" | null;
  sessionsThisWeek: number;
  weeklyTarget: number;
  selectionReason: WorkoutSelectionReason;
  biggestFear: string;
}

export interface WorkoutRecommendationCopyResult {
  copy: string;
  copyVersion: typeof WORKOUT_RECOMMENDATION_COPY_VERSION;
  model: typeof WORKOUT_RECOMMENDATION_MODEL;
}

export interface TodaysFocusCopyInput {
  category: FocusCategory;
  selectionReason: string;
  inputsSnapshot: TodaysFocusInputsSnapshot;
  biggestFear: string;
  calorieTarget: number;
}

export interface TodaysFocusCopyResult {
  headline: string;
  suggestion: string;
  actionType: TodaysFocusActionType;
  actionLabel: string | null;
  copyVersion: typeof TODAYS_FOCUS_COPY_VERSION;
  model: typeof TODAYS_FOCUS_MODEL;
}

export interface CoachChatContext {
  biggestFear: string;
  goalPace: string;
  trainingStatus?: string;
  medicationName?: string;
  goalWeight?: number;
  goalWeightUnit?: string;
  verdictStatus?: string;
  stalled: boolean;
  daysWeightFlat: number;
  weightUnit: string;
  proteinRecentAvgGrams: number;
  proteinPriorAvgGrams: number;
  recentSessionsCount: number;
  recentSessionsTarget: number;
  stallExplanation?: string;
  stallSuggestedFix?: string;
}

export interface CoachChatResult {
  reply: string;
  refused: boolean;
  copyVersion: typeof COACH_CHAT_COPY_VERSION;
  model: typeof COACH_CHAT_MODEL;
}

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: {
      content?: string | null;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface CoachCopyInput {
  status: VerdictStatus;
  nextActionCode: string;
  explanationFactors: string[];
}

interface CoachCopy {
  headline: string;
  message: string;
}

export function buildVerdictCopy(input: CoachCopyInput): CoachCopy {
  if (input.status === "no_data") {
    return {
      headline: "Your weekly verdict needs a check-in",
      message:
        "Log this week when you can. Leanient needs your weight, protein, and training rhythm before it can judge muscle-retention risk.",
    };
  }

  if (input.status === "on_track") {
    return {
      headline: "You are protecting your muscle this week",
      message:
        "Your pace and habits are lined up. Keep the same rhythm and let the next check-in confirm the trend.",
    };
  }

  if (input.status === "drifting") {
    return {
      headline: "You are drifting from the muscle-retention lane",
      message:
        "The week is recoverable. Tighten the next action and keep the goal focused on steady fat loss, not speed.",
    };
  }

  return {
    headline: "Your muscle-retention risk is elevated",
    message:
      "This week needs a correction. Prioritize the next action before pushing harder on weight loss.",
  };
}

function formatMeasurement(
  value: { value: number; unit: string } | undefined,
  fallback = "unknown",
): string {
  if (!value) {
    return fallback;
  }

  return `${value.value} ${value.unit}`;
}

function formatOptionalNumber(value: number | undefined, suffix = ""): string {
  if (value === undefined) {
    return "unknown";
  }

  return `${value}${suffix}`;
}

function buildVerdictExplanationUserMessage(
  verdict: WeeklyVerdictDraft,
  userContext: UserContextSnapshot,
): string {
  const inputs = verdict.inputsUsed;
  const profile = userContext.profile;
  const weight = inputs?.weight;
  const priorWeight = inputs?.priorWeight ?? userContext.priorWeight;
  const proteinGramsPerDay = inputs?.proteinGramsPerDay;
  const resistanceWorkoutsCompleted = inputs?.resistanceWorkoutsCompleted;
  const factors =
    verdict.explanationFactors.length > 0
      ? verdict.explanationFactors.map((factor) => `- ${factor}`).join("\n")
      : "- No deterministic factors recorded.";

  return `
Verdict:
- Status: ${verdict.status}
- Score: ${verdict.score ?? "unknown"}
- Estimated lean mass risk: ${verdict.estimatedLeanMassRisk ?? "unknown"}
- Next action: ${verdict.nextActionCode}
- Engine version: ${verdict.engineVersion}
- Week of: ${verdict.weekOf}

Deterministic factors:
${factors}

Measured inputs:
- Current weight: ${formatMeasurement(weight)}
- Prior weight: ${formatMeasurement(priorWeight)}
- Protein: ${formatOptionalNumber(proteinGramsPerDay, " grams per day")}
- Resistance workouts: ${formatOptionalNumber(resistanceWorkoutsCompleted)}
- Goal pace: ${profile.goalPace}
- Goal weight: ${profile.goalWeight} ${profile.goalWeightUnit}

User context:
- Biggest fear from onboarding: ${profile.biggestFear}
- Training status: ${profile.trainingStatus}

Write the explanation.
`.trim();
}

function formatDoseTrend(analysis: StallDeterministicAnalysis): string {
  if (!analysis.doseTrend) {
    return "not applicable";
  }

  return `${analysis.doseTrend.recentDoses}, missed: ${analysis.doseTrend.missedDoses}`;
}

function buildStallDiagnosticUserMessage(
  analysis: StallDeterministicAnalysis,
  context: StallDiagnosticCoachContext,
): string {
  return `
Deterministic analysis:

Days weight has been flat: ${analysis.weightTrend.daysFlat}
Weight trend: ${analysis.weightTrend.startWeight} ${analysis.weightTrend.unit} to ${analysis.weightTrend.endWeight} ${analysis.weightTrend.unit}
Recent 14-day protein avg: ${analysis.proteinTrend.recentAvgGrams} g/day
Prior 14-day protein avg: ${analysis.proteinTrend.priorAvgGrams} g/day (delta: ${analysis.proteinTrend.deltaGrams} g/day)
Recent 14-day training sessions: ${analysis.trainingTrend.recentSessionsCount} of ${analysis.trainingTrend.recentSessionsTarget} target
Prior 14-day training sessions: ${analysis.trainingTrend.priorSessionsCount} of ${analysis.trainingTrend.priorSessionsTarget} target
Recent 14-day doses: ${formatDoseTrend(analysis)}

User context:

Biggest fear from onboarding: ${context.biggestFear}
Medication: ${context.medicationName ?? "not logged"}
Current pace setting: ${context.goalPace}

Write the explanation and a single suggested fix as JSON.
`.trim();
}

function buildMealScanCoachUserMessage(
  analysis: MealScanAnalysis,
  snapshot: MealScanProteinSnapshot,
  context: MealScanCoachUserContext,
): string {
  return MEAL_SCAN_COACH_USER_TEMPLATE.replace("{foodName}", analysis.foodName)
    .replace("{protein}", String(analysis.protein))
    .replace("{calories}", String(analysis.calories))
    .replace("{carbs}", String(analysis.carbs))
    .replace("{fat}", String(analysis.fat))
    .replace("{todayProteinLogged}", String(snapshot.todayProteinLogged))
    .replace("{todayProteinTarget}", String(snapshot.todayProteinTarget))
    .replace("{todayPercent}", String(snapshot.todayPercent))
    .replace("{projectedProtein}", String(snapshot.projectedProtein))
    .replace("{projectedPercent}", String(snapshot.projectedPercent))
    .replace("{weekAdherence}", String(snapshot.weekAdherence))
    .replace("{biggestFear}", context.biggestFear)
    .replace("{calorieTarget}", String(snapshot.calorieTarget))
    .replace("{mode}", snapshot.mode);
}

function buildWorkoutRecommendationUserMessage(input: WorkoutRecommendationCopyInput): string {
  return WORKOUT_RECOMMENDATION_USER_TEMPLATE.replace("{workoutTitle}", input.workoutTitle)
    .replace("{durationMinutes}", String(input.durationMinutes))
    .replace("{equipment}", input.equipment)
    .replace("{intensity}", input.intensity)
    .replace("{muscleGroups}", input.muscleGroups.join(", "))
    .replace("{shotDayLabel}", input.shotDayLabel ?? "not on protocol")
    .replace("{energy}", input.energy ?? "unknown")
    .replace("{sessionsThisWeek}", String(input.sessionsThisWeek))
    .replace("{weeklyTarget}", String(input.weeklyTarget))
    .replace("{selectionReason}", input.selectionReason)
    .replace("{biggestFear}", input.biggestFear);
}

function buildTodaysFocusUserMessage(input: TodaysFocusCopyInput): string {
  return TODAYS_FOCUS_USER_TEMPLATE.replace("{category}", input.category)
    .replace("{selectionReason}", input.selectionReason)
    .replace("{proteinLoggedToday}", String(input.inputsSnapshot.proteinLoggedToday))
    .replace("{proteinTargetToday}", String(input.inputsSnapshot.proteinTargetToday))
    .replace("{sessionsThisWeek}", String(input.inputsSnapshot.sessionsThisWeek))
    .replace("{weeklyTarget}", String(input.inputsSnapshot.weeklyTarget))
    .replace("{shotDayLabel}", input.inputsSnapshot.shotDayLabel ?? "not on protocol")
    .replace("{energy}", input.inputsSnapshot.energy ?? "unknown")
    .replace(
      "{daysSinceLastActivity}",
      input.inputsSnapshot.daysSinceLastActivity === null
        ? "unknown"
        : String(input.inputsSnapshot.daysSinceLastActivity),
    )
    .replace("{biggestFear}", input.biggestFear)
    .replace("{calorieTarget}", String(input.calorieTarget));
}

function buildCoachChatContextMessage(context: CoachChatContext): string {
  const lines = [
    "Here is what the app currently knows about this user. Ground your answers in it. Do not repeat it back verbatim.",
    "",
    `Biggest fear from onboarding: ${context.biggestFear}`,
    `Goal pace: ${context.goalPace}`,
  ];

  if (context.goalWeight !== undefined && context.goalWeightUnit) {
    lines.push(`Goal weight: ${context.goalWeight} ${context.goalWeightUnit}`);
  }
  if (context.trainingStatus) {
    lines.push(`Training status: ${context.trainingStatus}`);
  }
  if (context.medicationName) {
    lines.push(`Medication (for reference only, never give dose advice): ${context.medicationName}`);
  }
  if (context.verdictStatus) {
    lines.push(`Most recent weekly verdict status: ${context.verdictStatus}`);
  }

  lines.push(
    "",
    `Weight: ${context.stalled ? `flat for ${context.daysWeightFlat} days` : "still moving"} (unit ${context.weightUnit})`,
    `Protein average: ${context.proteinPriorAvgGrams} g/day prior, ${context.proteinRecentAvgGrams} g/day recently`,
    `Resistance sessions recently: ${context.recentSessionsCount} of ${context.recentSessionsTarget} target`,
  );

  if (context.stallExplanation) {
    lines.push("", `The app already explained the current stall as: ${context.stallExplanation}`);
  }
  if (context.stallSuggestedFix) {
    lines.push(`Suggested fix already shown to the user: ${context.stallSuggestedFix}`);
  }

  return lines.join("\n");
}

function parseCoachChatJson(content: string): { reply: string; refused: boolean } {
  try {
    const parsed = JSON.parse(content) as {
      reply?: unknown;
      refused?: unknown;
    };

    if (typeof parsed.reply !== "string" || !parsed.reply.trim()) {
      throw new Error("Coach chat JSON did not include a reply");
    }

    return {
      reply: parsed.reply.trim(),
      refused: parsed.refused === true,
    };
  } catch (error) {
    throw new CoachContentError("OpenAI returned malformed coach chat JSON", "parse_error", error);
  }
}

function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    maxRetries: 0,
  });
}

function mapOpenAIError(error: unknown, label = "verdict explanation"): CoachContentError | null {
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new CoachContentError(`OpenAI ${label} request timed out`, "timeout", error);
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return new CoachContentError(`OpenAI ${label} request failed`, "network", error);
  }

  if (error instanceof OpenAI.APIError) {
    return new CoachContentError(`OpenAI ${label} request failed`, "api", error);
  }

  return null;
}

function isOpenAIConnectionError(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIConnectionError ||
    error instanceof OpenAI.APIConnectionTimeoutError
  );
}

function parseStallDiagnosticJson(content: string): {
  explanation: string;
  suggestedFix: string;
} {
  try {
    const parsed = JSON.parse(content) as {
      explanation?: unknown;
      suggestedFix?: unknown;
    };

    if (
      typeof parsed.explanation !== "string" ||
      !parsed.explanation.trim() ||
      typeof parsed.suggestedFix !== "string" ||
      !parsed.suggestedFix.trim()
    ) {
      throw new Error("Stall diagnostic JSON did not include explanation and suggestedFix");
    }

    return {
      explanation: parsed.explanation.trim(),
      suggestedFix: parsed.suggestedFix.trim(),
    };
  } catch (error) {
    throw new CoachContentError("OpenAI returned malformed stall diagnostic JSON", "parse_error", error);
  }
}

function parseMealScanVisionJson(content: string): MealScanAnalysis {
  try {
    const parsed = JSON.parse(content) as Partial<Record<keyof MealScanAnalysis, unknown>>;

    if (
      typeof parsed.foodName !== "string" ||
      !parsed.foodName.trim() ||
      typeof parsed.servingSize !== "string" ||
      !parsed.servingSize.trim() ||
      typeof parsed.protein !== "number" ||
      typeof parsed.calories !== "number" ||
      typeof parsed.carbs !== "number" ||
      typeof parsed.fat !== "number" ||
      typeof parsed.confidence !== "number"
    ) {
      throw new Error("Meal scan vision JSON did not include the expected macro fields");
    }

    return {
      foodName: parsed.foodName.trim(),
      servingSize: parsed.servingSize.trim(),
      protein: parsed.protein,
      calories: parsed.calories,
      carbs: parsed.carbs,
      fat: parsed.fat,
      confidence: parsed.confidence,
    };
  } catch (error) {
    throw new CoachContentError("OpenAI returned malformed meal scan vision JSON", "parse_error", error);
  }
}

function parseMealScanCoachJson(
  content: string,
  expectedMode: MealScanMode,
): Omit<MealScanCoachContentResult, "copyVersion" | "model"> {
  try {
    const parsed = JSON.parse(content) as {
      mode?: unknown;
      callout?: unknown;
      swap?: unknown;
    };

    if (parsed.mode !== expectedMode) {
      throw new Error("Meal scan coach JSON mode did not match the deterministic mode");
    }

    if (typeof parsed.callout !== "string" || !parsed.callout.trim()) {
      throw new Error("Meal scan coach JSON did not include callout");
    }

    if (expectedMode === "affirmation") {
      return {
        mode: expectedMode,
        callout: parsed.callout.trim(),
        swap: null,
      };
    }

    if (!parsed.swap || typeof parsed.swap !== "object") {
      throw new Error("Meal scan coach JSON did not include a swap");
    }

    const swap = parsed.swap as {
      description?: unknown;
      additionalProtein?: unknown;
      additionalCalories?: unknown;
    };

    if (
      typeof swap.description !== "string" ||
      !swap.description.trim() ||
      typeof swap.additionalProtein !== "number" ||
      typeof swap.additionalCalories !== "number"
    ) {
      throw new Error("Meal scan coach JSON swap was malformed");
    }

    return {
      mode: expectedMode,
      callout: parsed.callout.trim(),
      swap: {
        description: swap.description.trim(),
        additionalProtein: swap.additionalProtein,
        additionalCalories: swap.additionalCalories,
      },
    };
  } catch (error) {
    throw new CoachContentError("OpenAI returned malformed meal scan coach JSON", "parse_error", error);
  }
}

function parseWorkoutRecommendationJson(content: string): string {
  try {
    const parsed = JSON.parse(content) as {
      copy?: unknown;
    };

    if (typeof parsed.copy !== "string" || !parsed.copy.trim()) {
      throw new Error("Workout recommendation JSON did not include copy");
    }

    return parsed.copy.trim();
  } catch (error) {
    throw new CoachContentError(
      "OpenAI returned malformed workout recommendation JSON",
      "parse_error",
      error,
    );
  }
}

const TODAYS_FOCUS_ACTION_TYPES = new Set<TodaysFocusActionType>([
  "log_meal",
  "log_workout",
  "log_dose",
  "take_photo",
  "view_progress",
  "none",
]);

function parseTodaysFocusJson(
  content: string,
): Omit<TodaysFocusCopyResult, "copyVersion" | "model"> {
  try {
    const parsed = JSON.parse(content) as {
      headline?: unknown;
      suggestion?: unknown;
      actionType?: unknown;
      actionLabel?: unknown;
    };

    if (typeof parsed.headline !== "string" || !parsed.headline.trim()) {
      throw new Error("Today's focus JSON did not include headline");
    }

    if (typeof parsed.suggestion !== "string" || !parsed.suggestion.trim()) {
      throw new Error("Today's focus JSON did not include suggestion");
    }

    if (
      typeof parsed.actionType !== "string" ||
      !TODAYS_FOCUS_ACTION_TYPES.has(parsed.actionType as TodaysFocusActionType)
    ) {
      throw new Error("Today's focus JSON actionType was invalid");
    }

    if (parsed.actionLabel !== null && typeof parsed.actionLabel !== "string") {
      throw new Error("Today's focus JSON actionLabel was invalid");
    }

    return {
      headline: parsed.headline.trim(),
      suggestion: parsed.suggestion.trim(),
      actionType: parsed.actionType as TodaysFocusActionType,
      actionLabel: parsed.actionLabel?.trim() ?? null,
    };
  } catch (error) {
    throw new CoachContentError("OpenAI returned malformed today's focus JSON", "parse_error", error);
  }
}

export async function generateVerdictExplanation(
  verdict: WeeklyVerdictDraft,
  userContext: UserContextSnapshot,
): Promise<VerdictExplanationResult> {
  if (verdict.status === "no_data") {
    throw new CoachContentError(
      "No-data verdicts do not get AI explanations",
      "unsupported_status",
    );
  }

  if (!env.openai.apiKey) {
    throw new CoachContentError("OPENAI_API_KEY is not configured", "missing_api_key");
  }

  try {
    const openai = createOpenAIClient(env.openai.apiKey);
    const completion = (await openai.chat.completions.create(
      {
        model: VERDICT_EXPLANATION_MODEL,
        messages: [
          {
            role: "system",
            content: VERDICT_EXPLANATION_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildVerdictExplanationUserMessage(verdict, userContext),
          },
        ],
        temperature: VERDICT_EXPLANATION_TEMPERATURE,
        max_tokens: VERDICT_EXPLANATION_MAX_TOKENS,
      },
      {
        timeout: VERDICT_EXPLANATION_TIMEOUT_MS,
      },
    )) as OpenAIChatCompletionResponse;

    const firstChoice = completion.choices?.[0];
    if (firstChoice?.finish_reason === "content_filter") {
      throw new CoachContentError(
        "OpenAI filtered the verdict explanation response",
        "content_filter",
      );
    }

    const explanation = firstChoice?.message?.content?.trim();
    if (!explanation) {
      throw new CoachContentError("OpenAI returned an empty verdict explanation", "empty_response");
    }

    return {
      explanation,
      copyVersion: VERDICT_EXPLANATION_COPY_VERSION,
      model: VERDICT_EXPLANATION_MODEL,
      usage: {
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
      },
    };
  } catch (error) {
    if (error instanceof CoachContentError) {
      throw error;
    }

    const openAIError = mapOpenAIError(error);
    if (openAIError) {
      throw openAIError;
    }

    throw new CoachContentError("OpenAI verdict explanation request failed", "network", error);
  }
}

export async function generateStallDiagnostic(
  analysis: StallDeterministicAnalysis,
  context: StallDiagnosticCoachContext,
): Promise<StallDiagnosticCoachResult> {
  if (!env.openai.apiKey) {
    throw new CoachContentError("OPENAI_API_KEY is not configured", "missing_api_key");
  }

  try {
    const openai = createOpenAIClient(env.openai.apiKey);
    const completion = (await openai.chat.completions.create(
      {
        model: STALL_DIAGNOSTIC_MODEL,
        messages: [
          {
            role: "system",
            content: STALL_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildStallDiagnosticUserMessage(analysis, context),
          },
        ],
        temperature: STALL_DIAGNOSTIC_TEMPERATURE,
        max_tokens: STALL_DIAGNOSTIC_MAX_TOKENS,
      },
      {
        timeout: STALL_DIAGNOSTIC_TIMEOUT_MS,
      },
    )) as OpenAIChatCompletionResponse;

    const firstChoice = completion.choices?.[0];
    if (firstChoice?.finish_reason === "content_filter") {
      throw new CoachContentError(
        "OpenAI filtered the stall diagnostic response",
        "content_filter",
      );
    }

    const content = firstChoice?.message?.content?.trim();
    if (!content) {
      throw new CoachContentError("OpenAI returned an empty stall diagnostic", "empty_response");
    }

    const parsed = parseStallDiagnosticJson(content);
    return {
      ...parsed,
      copyVersion: STALL_DIAGNOSTIC_COPY_VERSION,
      model: STALL_DIAGNOSTIC_MODEL,
    };
  } catch (error) {
    if (error instanceof CoachContentError) {
      throw error;
    }

    const openAIError = mapOpenAIError(error);
    if (openAIError) {
      throw openAIError;
    }

    throw new CoachContentError("OpenAI stall diagnostic request failed", "network", error);
  }
}

export async function generateMealScanVision(
  imageData: string,
  imageMimeType: MealScanImageMimeType,
): Promise<MealScanAnalysis> {
  if (!env.openai.apiKey) {
    throw new CoachContentError("OPENAI_API_KEY is not configured", "missing_api_key");
  }

  const openai = createOpenAIClient(env.openai.apiKey);
  let attempt = 0;

  while (attempt < 2) {
    try {
      const completion = (await openai.chat.completions.create(
        {
          model: MEAL_SCAN_VISION_MODEL,
          messages: [
            {
              role: "system",
              content: MEAL_SCAN_VISION_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this meal photo and return JSON only.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${imageMimeType};base64,${imageData}`,
                  },
                },
              ],
            },
          ],
          max_tokens: MEAL_SCAN_VISION_MAX_TOKENS,
          response_format: { type: "json_object" },
        },
        {
          timeout: MEAL_SCAN_VISION_TIMEOUT_MS,
        },
      )) as OpenAIChatCompletionResponse;

      const firstChoice = completion.choices?.[0];
      if (firstChoice?.finish_reason === "content_filter") {
        throw new CoachContentError(
          "OpenAI filtered the meal scan vision response",
          "content_filter",
        );
      }

      const content = firstChoice?.message?.content?.trim();
      if (!content) {
        throw new CoachContentError("OpenAI returned an empty meal scan vision response", "empty_response");
      }

      return parseMealScanVisionJson(content);
    } catch (error) {
      if (error instanceof CoachContentError) {
        throw error;
      }

      if (attempt === 0 && isOpenAIConnectionError(error)) {
        attempt += 1;
        continue;
      }

      const openAIError = mapOpenAIError(error, "meal scan vision");
      if (openAIError) {
        throw openAIError;
      }

      throw new CoachContentError("OpenAI meal scan vision request failed", "network", error);
    }
  }

  throw new CoachContentError("OpenAI meal scan vision request failed", "network");
}

export async function generateMealScanCoachContent(
  analysis: MealScanAnalysis,
  snapshot: MealScanProteinSnapshot,
  context: MealScanCoachUserContext,
): Promise<MealScanCoachContentResult> {
  if (!env.openai.apiKey) {
    throw new CoachContentError("OPENAI_API_KEY is not configured", "missing_api_key");
  }

  try {
    const openai = createOpenAIClient(env.openai.apiKey);
    const completion = (await openai.chat.completions.create(
      {
        model: MEAL_SCAN_COACH_MODEL,
        messages: [
          {
            role: "system",
            content: MEAL_SCAN_COACH_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildMealScanCoachUserMessage(analysis, snapshot, context),
          },
        ],
        temperature: MEAL_SCAN_COACH_TEMPERATURE,
        max_tokens: MEAL_SCAN_COACH_MAX_TOKENS,
        response_format: { type: "json_object" },
      },
      {
        timeout: MEAL_SCAN_COACH_TIMEOUT_MS,
      },
    )) as OpenAIChatCompletionResponse;

    const firstChoice = completion.choices?.[0];
    if (firstChoice?.finish_reason === "content_filter") {
      throw new CoachContentError(
        "OpenAI filtered the meal scan coach response",
        "content_filter",
      );
    }

    const content = firstChoice?.message?.content?.trim();
    if (!content) {
      throw new CoachContentError("OpenAI returned an empty meal scan coach response", "empty_response");
    }

    const parsed = parseMealScanCoachJson(content, snapshot.mode);
    return {
      ...parsed,
      copyVersion: MEAL_SCAN_COACH_COPY_VERSION,
      model: MEAL_SCAN_COACH_MODEL,
    };
  } catch (error) {
    if (error instanceof CoachContentError) {
      throw error;
    }

    const openAIError = mapOpenAIError(error, "meal scan coach");
    if (openAIError) {
      throw openAIError;
    }

    throw new CoachContentError("OpenAI meal scan coach request failed", "network", error);
  }
}

export async function generateWorkoutRecommendationCopy(
  input: WorkoutRecommendationCopyInput,
): Promise<WorkoutRecommendationCopyResult> {
  if (!env.openai.apiKey) {
    throw new CoachContentError("OPENAI_API_KEY is not configured", "missing_api_key");
  }

  try {
    const openai = createOpenAIClient(env.openai.apiKey);
    const completion = (await openai.chat.completions.create(
      {
        model: WORKOUT_RECOMMENDATION_MODEL,
        messages: [
          {
            role: "system",
            content: WORKOUT_RECOMMENDATION_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildWorkoutRecommendationUserMessage(input),
          },
        ],
        temperature: WORKOUT_RECOMMENDATION_TEMPERATURE,
        max_tokens: WORKOUT_RECOMMENDATION_MAX_TOKENS,
        response_format: { type: "json_object" },
      },
      {
        timeout: WORKOUT_RECOMMENDATION_TIMEOUT_MS,
      },
    )) as OpenAIChatCompletionResponse;

    const firstChoice = completion.choices?.[0];
    if (firstChoice?.finish_reason === "content_filter") {
      throw new CoachContentError(
        "OpenAI filtered the workout recommendation response",
        "content_filter",
      );
    }

    const content = firstChoice?.message?.content?.trim();
    if (!content) {
      throw new CoachContentError(
        "OpenAI returned an empty workout recommendation response",
        "empty_response",
      );
    }

    return {
      copy: parseWorkoutRecommendationJson(content),
      copyVersion: WORKOUT_RECOMMENDATION_COPY_VERSION,
      model: WORKOUT_RECOMMENDATION_MODEL,
    };
  } catch (error) {
    if (error instanceof CoachContentError) {
      throw error;
    }

    const openAIError = mapOpenAIError(error, "workout recommendation");
    if (openAIError) {
      throw openAIError;
    }

    throw new CoachContentError("OpenAI workout recommendation request failed", "network", error);
  }
}

export async function generateTodaysFocusCopy(
  input: TodaysFocusCopyInput,
): Promise<TodaysFocusCopyResult> {
  if (!env.openai.apiKey) {
    throw new CoachContentError("OPENAI_API_KEY is not configured", "missing_api_key");
  }

  try {
    const openai = createOpenAIClient(env.openai.apiKey);
    const completion = (await openai.chat.completions.create(
      {
        model: TODAYS_FOCUS_MODEL,
        messages: [
          {
            role: "system",
            content: TODAYS_FOCUS_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildTodaysFocusUserMessage(input),
          },
        ],
        temperature: TODAYS_FOCUS_TEMPERATURE,
        max_tokens: TODAYS_FOCUS_MAX_TOKENS,
        response_format: { type: "json_object" },
      },
      {
        timeout: TODAYS_FOCUS_TIMEOUT_MS,
      },
    )) as OpenAIChatCompletionResponse;

    const firstChoice = completion.choices?.[0];
    if (firstChoice?.finish_reason === "content_filter") {
      throw new CoachContentError("OpenAI filtered the today's focus response", "content_filter");
    }

    const content = firstChoice?.message?.content?.trim();
    if (!content) {
      throw new CoachContentError("OpenAI returned an empty today's focus response", "empty_response");
    }

    return {
      ...parseTodaysFocusJson(content),
      copyVersion: TODAYS_FOCUS_COPY_VERSION,
      model: TODAYS_FOCUS_MODEL,
    };
  } catch (error) {
    if (error instanceof CoachContentError) {
      throw error;
    }

    const openAIError = mapOpenAIError(error, "today's focus");
    if (openAIError) {
      throw openAIError;
    }

    throw new CoachContentError("OpenAI today's focus request failed", "network", error);
  }
}

export async function generateCoachChatReply(
  messages: CoachChatMessage[],
  context: CoachChatContext,
): Promise<CoachChatResult> {
  if (!env.openai.apiKey) {
    throw new CoachContentError("OPENAI_API_KEY is not configured", "missing_api_key");
  }

  try {
    const openai = createOpenAIClient(env.openai.apiKey);
    const completion = (await openai.chat.completions.create(
      {
        model: COACH_CHAT_MODEL,
        messages: [
          { role: "system", content: COACH_CHAT_SYSTEM_PROMPT },
          { role: "system", content: buildCoachChatContextMessage(context) },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
        temperature: COACH_CHAT_TEMPERATURE,
        max_tokens: COACH_CHAT_MAX_TOKENS,
        response_format: { type: "json_object" },
      },
      {
        timeout: COACH_CHAT_TIMEOUT_MS,
      },
    )) as OpenAIChatCompletionResponse;

    const firstChoice = completion.choices?.[0];
    if (firstChoice?.finish_reason === "content_filter") {
      throw new CoachContentError("OpenAI filtered the coach chat response", "content_filter");
    }

    const content = firstChoice?.message?.content?.trim();
    if (!content) {
      throw new CoachContentError("OpenAI returned an empty coach chat response", "empty_response");
    }

    const parsed = parseCoachChatJson(content);
    return {
      ...parsed,
      copyVersion: COACH_CHAT_COPY_VERSION,
      model: COACH_CHAT_MODEL,
    };
  } catch (error) {
    if (error instanceof CoachContentError) {
      throw error;
    }

    const openAIError = mapOpenAIError(error, "coach chat");
    if (openAIError) {
      throw openAIError;
    }

    throw new CoachContentError("OpenAI coach chat request failed", "network", error);
  }
}
