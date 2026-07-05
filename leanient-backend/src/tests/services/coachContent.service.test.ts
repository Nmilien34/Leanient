import type { UserContextSnapshot } from "@leanient/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildVerdictCopy,
  CoachContentError,
  generateTodaysFocusCopy,
  generateWorkoutRecommendationCopy,
  generateVerdictExplanation,
  generateMealScanCoachContent,
  generateMealScanVision,
  generateStallDiagnostic,
  MEAL_SCAN_COACH_MAX_TOKENS,
  MEAL_SCAN_COACH_MODEL,
  MEAL_SCAN_COACH_SYSTEM_PROMPT,
  MEAL_SCAN_COACH_TEMPERATURE,
  MEAL_SCAN_COACH_TIMEOUT_MS,
  MEAL_SCAN_VISION_MAX_TOKENS,
  MEAL_SCAN_VISION_MODEL,
  MEAL_SCAN_VISION_TIMEOUT_MS,
  STALL_DIAGNOSTIC_COPY_VERSION,
  STALL_DIAGNOSTIC_MAX_TOKENS,
  STALL_DIAGNOSTIC_MODEL,
  STALL_DIAGNOSTIC_TEMPERATURE,
  STALL_DIAGNOSTIC_TIMEOUT_MS,
  STALL_SYSTEM_PROMPT,
  VERDICT_EXPLANATION_COPY_VERSION,
  VERDICT_EXPLANATION_MAX_TOKENS,
  VERDICT_EXPLANATION_MODEL,
  VERDICT_EXPLANATION_SYSTEM_PROMPT,
  VERDICT_EXPLANATION_TEMPERATURE,
  VERDICT_EXPLANATION_TIMEOUT_MS,
  TODAYS_FOCUS_COPY_VERSION,
  TODAYS_FOCUS_MAX_TOKENS,
  TODAYS_FOCUS_MODEL,
  TODAYS_FOCUS_SYSTEM_PROMPT,
  TODAYS_FOCUS_TEMPERATURE,
  TODAYS_FOCUS_TIMEOUT_MS,
  WORKOUT_RECOMMENDATION_COPY_VERSION,
  WORKOUT_RECOMMENDATION_MAX_TOKENS,
  WORKOUT_RECOMMENDATION_MODEL,
  WORKOUT_RECOMMENDATION_SYSTEM_PROMPT,
  WORKOUT_RECOMMENDATION_TEMPERATURE,
  WORKOUT_RECOMMENDATION_TIMEOUT_MS,
} from "../../services/coachContent.service";
import type { WeeklyVerdictDraft } from "../../services/verdict.service";

const openAIMocks = vi.hoisted(() => {
  class MockAPIError extends Error {}
  class MockAPIConnectionTimeoutError extends MockAPIError {}
  class MockAPIConnectionError extends MockAPIError {}

  const createMock = vi.fn();
  const constructorMock = vi.fn();

  class MockOpenAI {
    public static APIConnectionError = MockAPIConnectionError;
    public static APIConnectionTimeoutError = MockAPIConnectionTimeoutError;
    public static APIError = MockAPIError;

    public chat = {
      completions: {
        create: createMock,
      },
    };

    public constructor(options: unknown) {
      constructorMock(options);
    }
  }

  return {
    APIConnectionError: MockAPIConnectionError,
    APIConnectionTimeoutError: MockAPIConnectionTimeoutError,
    APIError: MockAPIError,
    createMock,
    constructorMock,
    OpenAI: MockOpenAI,
  };
});

vi.mock("openai", () => ({
  default: openAIMocks.OpenAI,
  APIConnectionError: openAIMocks.APIConnectionError,
  APIConnectionTimeoutError: openAIMocks.APIConnectionTimeoutError,
  APIError: openAIMocks.APIError,
}));

function userContextSnapshot(overrides: Partial<UserContextSnapshot["profile"]> = {}) {
  return {
    profile: {
      journeyStage: "active_loss" as const,
      goalWeight: 165,
      goalWeightUnit: "lb" as const,
      dailyProteinTarget: 120,
      dailyCalorieTarget: 1800,
      goalPace: "steady" as const,
      biggestFear: "losing_muscle" as const,
      trainingStatus: "beginner" as const,
      sideEffectBaseline: [],
      timezone: "America/New_York",
      ...overrides,
    },
    priorWeight: {
      value: 185,
      unit: "lb" as const,
      measuredAt: "2026-05-18T12:00:00.000Z",
    },
  };
}

function verdictDraft(overrides: Partial<WeeklyVerdictDraft> = {}): WeeklyVerdictDraft {
  return {
    userId: "user_1",
    weekOf: "2026-05-25",
    checkinId: "checkin_1",
    source: "checkin",
    engineVersion: "leanient-verdict-2026-05-29",
    copyVersion: null,
    explanation: null,
    status: "on_track",
    score: 91,
    estimatedLeanMassRisk: 0.09,
    nextActionCode: "keep_rhythm",
    headline: "You are protecting your muscle this week",
    message: "Your pace and habits are lined up.",
    explanationFactors: [
      "Weight loss pace stayed in a conservative range.",
      "Protein intake supported lean-mass retention.",
      "Resistance training gave the week a strong muscle signal.",
    ],
    inputsUsed: {
      ...userContextSnapshot(),
      weight: {
        value: 184,
        unit: "lb",
        measuredAt: "2026-05-26T12:00:00.000Z",
      },
      proteinGramsPerDay: 120,
      resistanceWorkoutsCompleted: 3,
    },
    ...overrides,
  };
}

function stallAnalysis() {
  return {
    weightTrend: {
      daysFlat: 14,
      startWeight: 184.2,
      endWeight: 184,
      unit: "lb" as const,
    },
    proteinTrend: {
      recentAvgGrams: 95,
      priorAvgGrams: 125,
      deltaGrams: -30,
    },
    trainingTrend: {
      recentSessionsCount: 2,
      recentSessionsTarget: 4,
      priorSessionsCount: 5,
      priorSessionsTarget: 4,
    },
    doseTrend: null,
  };
}

function mockOpenAIText(content: string) {
  openAIMocks.createMock.mockResolvedValueOnce({
    choices: [
      {
        finish_reason: "stop",
        message: {
          content,
        },
      },
    ],
    usage: {
      prompt_tokens: 220,
      completion_tokens: 72,
      total_tokens: 292,
    },
  });
}

function mockOpenAIJson(value: unknown) {
  mockOpenAIText(JSON.stringify(value));
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

describe("coach content service", () => {
  beforeEach(() => {
    openAIMocks.createMock.mockReset();
    openAIMocks.constructorMock.mockClear();
  });

  it("uses deterministic copy for missed check-in verdicts", () => {
    const copy = buildVerdictCopy({
      status: "no_data",
      nextActionCode: "complete_checkin",
      explanationFactors: ["No weekly check-in was submitted for 2026-05-25."],
    });

    expect(copy.headline).toBe("Your weekly verdict needs a check-in");
    expect(copy.message).toContain("Log this week");
  });

  it("keeps elevated muscle-risk copy deterministic", () => {
    const copy = buildVerdictCopy({
      status: "losing_muscle",
      nextActionCode: "add_resistance_training",
      explanationFactors: ["No resistance sessions were logged this week."],
    });

    expect(copy.headline).toBe("This week cost you muscle");
    expect(copy.message).toContain("protein at every meal");
  });

  it("generates short verdict explanation prose from the OpenAI response", async () => {
    const prose =
      "You are keeping your muscle this week. You said your main worry is losing muscle, and the data is behaving itself for once. Protein landed at 120 grams, you trained 3 times, and weight moved from 185 lb to 184 lb. That mix gives your body a clear reason to keep the useful tissue while the scale keeps moving steadily.";
    mockOpenAIText(prose);

    const result = await generateVerdictExplanation(verdictDraft(), userContextSnapshot());

    expect(result).toMatchObject({
      explanation: prose,
      copyVersion: VERDICT_EXPLANATION_COPY_VERSION,
      model: VERDICT_EXPLANATION_MODEL,
      usage: {
        promptTokens: 220,
        completionTokens: 72,
        totalTokens: 292,
      },
    });
    expect(wordCount(result.explanation)).toBeGreaterThanOrEqual(60);
    expect(wordCount(result.explanation)).toBeLessThanOrEqual(150);
    expect(result.explanation).not.toContain("!");
    expect(openAIMocks.constructorMock).toHaveBeenCalledWith({
      apiKey: "test-openai-api-key",
      maxRetries: 0,
    });
    expect(openAIMocks.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: VERDICT_EXPLANATION_MODEL,
        temperature: VERDICT_EXPLANATION_TEMPERATURE,
        max_tokens: VERDICT_EXPLANATION_MAX_TOKENS,
      }),
      {
        timeout: VERDICT_EXPLANATION_TIMEOUT_MS,
      },
    );
  });

  it("passes Ozempic-face context and measured factors into the prompt", async () => {
    const prose =
      "You are keeping your muscle this week. You told us your worry is Ozempic face, which is really a worry about losing the tissue that keeps your face looking like yours. Protein hit 120 grams, you trained 3 times, and the scale moved 1 lb. That is the boring, useful pattern we want.";
    mockOpenAIText(prose);

    const result = await generateVerdictExplanation(
      verdictDraft(),
      userContextSnapshot({ biggestFear: "ozempic_face" }),
    );

    const body = openAIMocks.createMock.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    const userMessage = body.messages[1].content;
    expect(result.explanation).toContain("your face");
    expect(VERDICT_EXPLANATION_SYSTEM_PROMPT).toContain("Do NOT convert between units");
    expect(VERDICT_EXPLANATION_SYSTEM_PROMPT).toContain("Do NOT mix lb and kg");
    expect(userMessage).toContain("Biggest fear from onboarding: ozempic_face");
    expect(userMessage).toContain("Protein: 120 grams per day");
    expect(userMessage).toContain("Resistance workouts: 3");
    expect(userMessage).toContain("Current weight: 184 lb");
  });

  it("throws a categorized CoachContentError when OpenAI fails", async () => {
    const cause = new openAIMocks.APIConnectionError("network down");
    openAIMocks.createMock.mockRejectedValueOnce(cause);

    const promise = generateVerdictExplanation(verdictDraft(), userContextSnapshot());

    await expect(promise).rejects.toThrow(CoachContentError);
    await expect(promise).rejects.toMatchObject({
      category: "network",
    });
  });

  it("rewraps SDK API errors as categorized CoachContentError instances", async () => {
    const cause = new openAIMocks.APIError("rate limit");
    openAIMocks.createMock.mockRejectedValueOnce(cause);

    await expect(generateVerdictExplanation(verdictDraft(), userContextSnapshot())).rejects.toMatchObject(
      {
        category: "api",
        cause,
      },
    );
  });

  it("rewraps SDK timeout errors as timeout CoachContentError instances", async () => {
    const cause = new openAIMocks.APIConnectionTimeoutError("request timed out");
    openAIMocks.createMock.mockRejectedValueOnce(cause);

    await expect(generateVerdictExplanation(verdictDraft(), userContextSnapshot())).rejects.toMatchObject(
      {
        category: "timeout",
        cause,
      },
    );
  });

  it("does not generate explanations for no-data verdicts", async () => {
    await expect(
      generateVerdictExplanation(
        verdictDraft({
          status: "no_data",
          score: null,
          estimatedLeanMassRisk: null,
          nextActionCode: "complete_checkin",
        }),
        userContextSnapshot(),
      ),
    ).rejects.toMatchObject({
      category: "unsupported_status",
    });

    expect(openAIMocks.createMock).not.toHaveBeenCalled();
  });

  it("generates and parses a stall diagnostic JSON response", async () => {
    const explanation =
      "You are not failing, and the medication is still working. Your weight has been flat for 14 days while protein dropped from 125 to 95 grams and training moved from 5 sessions to 2. That combination is enough to make the scale look stubborn.";
    const suggestedFix = "Bring protein back to 125 grams daily and complete two resistance sessions this week.";
    mockOpenAIText(JSON.stringify({ explanation, suggestedFix }));

    const result = await generateStallDiagnostic(stallAnalysis(), {
      biggestFear: "losing_muscle",
      medicationName: "Zepbound",
      goalPace: "steady",
    });

    expect(result).toEqual({
      explanation,
      suggestedFix,
      copyVersion: STALL_DIAGNOSTIC_COPY_VERSION,
      model: STALL_DIAGNOSTIC_MODEL,
    });
    expect(openAIMocks.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: STALL_DIAGNOSTIC_MODEL,
        temperature: STALL_DIAGNOSTIC_TEMPERATURE,
        max_tokens: STALL_DIAGNOSTIC_MAX_TOKENS,
      }),
      {
        timeout: STALL_DIAGNOSTIC_TIMEOUT_MS,
      },
    );
  });

  it("passes Ozempic-face context and protein-drop numbers into the stall prompt", async () => {
    const explanation =
      "You are not failing, and the medication is still working. With Ozempic face on your mind, the useful read is that protein dropped by 30 grams while training also dipped, which can make weight look stuck without meaning the medicine quit.";
    mockOpenAIText(
      JSON.stringify({
        explanation,
        suggestedFix: "Return to 125 grams of protein daily for the next seven days.",
      }),
    );

    const result = await generateStallDiagnostic(stallAnalysis(), {
      biggestFear: "ozempic_face",
      medicationName: "Wegovy",
      goalPace: "steady",
    });

    const body = openAIMocks.createMock.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    const userMessage = body.messages[1].content;
    expect(result.explanation).toContain("Ozempic face");
    expect(result.explanation).toContain("30 grams");
    expect(STALL_SYSTEM_PROMPT).toContain("Do NOT convert between units");
    expect(STALL_SYSTEM_PROMPT).toContain("Do NOT mix lb and kg");
    expect(userMessage).toContain("Biggest fear from onboarding: ozempic_face");
    expect(userMessage).toContain("Weight trend: 184.2 lb to 184 lb");
    expect(userMessage).toContain("Recent 14-day protein avg: 95 g/day");
    expect(userMessage).toContain("Prior 14-day protein avg: 125 g/day (delta: -30 g/day)");
  });

  it("throws CoachContentError when stall diagnostic OpenAI call fails", async () => {
    const cause = new openAIMocks.APIConnectionError("network down");
    openAIMocks.createMock.mockRejectedValueOnce(cause);

    await expect(
      generateStallDiagnostic(stallAnalysis(), {
        biggestFear: "losing_muscle",
        medicationName: "Zepbound",
        goalPace: "steady",
      }),
    ).rejects.toMatchObject({
      category: "network",
    });
  });

  it("throws CoachContentError when stall diagnostic output is not JSON", async () => {
    mockOpenAIText("Here is why you are stuck.");

    await expect(
      generateStallDiagnostic(stallAnalysis(), {
        biggestFear: "losing_muscle",
        medicationName: "Zepbound",
        goalPace: "steady",
      }),
    ).rejects.toMatchObject({
      category: "parse_error",
    });
  });

  it("generates meal scan vision analysis from JSON", async () => {
    mockOpenAIJson({
      foodName: "Greek yogurt bowl",
      servingSize: "1 bowl",
      protein: 28,
      calories: 320,
      carbs: 35,
      fat: 8,
      confidence: 0.82,
    });

    const result = await generateMealScanVision("/9j/4AAQSkZJRg==", "image/jpeg");

    expect(result).toEqual({
      foodName: "Greek yogurt bowl",
      servingSize: "1 bowl",
      protein: 28,
      calories: 320,
      carbs: 35,
      fat: 8,
      confidence: 0.82,
    });
    expect(openAIMocks.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: MEAL_SCAN_VISION_MODEL,
        max_tokens: MEAL_SCAN_VISION_MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      {
        timeout: MEAL_SCAN_VISION_TIMEOUT_MS,
      },
    );
  });

  it("preserves low-confidence meal scan vision responses", async () => {
    mockOpenAIJson({
      foodName: "blurry mixed plate",
      servingSize: "1 plate",
      protein: 12,
      calories: 450,
      carbs: 55,
      fat: 18,
      confidence: 0.22,
    });

    const result = await generateMealScanVision("/9j/4AAQSkZJRg==", "image/jpeg");

    expect(result.confidence).toBe(0.22);
  });

  it("retries meal scan vision once for connection errors", async () => {
    openAIMocks.createMock
      .mockRejectedValueOnce(new openAIMocks.APIConnectionError("network down"))
      .mockResolvedValueOnce({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: JSON.stringify({
                foodName: "salmon",
                servingSize: "1 fillet",
                protein: 34,
                calories: 280,
                carbs: 0,
                fat: 14,
                confidence: 0.91,
              }),
            },
          },
        ],
      });

    const result = await generateMealScanVision("/9j/4AAQSkZJRg==", "image/jpeg");

    expect(result.foodName).toBe("salmon");
    expect(openAIMocks.createMock).toHaveBeenCalledTimes(2);
  });

  it("throws CoachContentError when meal scan vision connection retry also fails", async () => {
    openAIMocks.createMock
      .mockRejectedValueOnce(new openAIMocks.APIConnectionError("network down"))
      .mockRejectedValueOnce(new openAIMocks.APIConnectionError("still down"));

    await expect(generateMealScanVision("/9j/4AAQSkZJRg==", "image/jpeg")).rejects.toMatchObject({
      category: "network",
    });
    expect(openAIMocks.createMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry meal scan vision HTTP API errors", async () => {
    openAIMocks.createMock.mockRejectedValueOnce(new openAIMocks.APIError("rate limited"));

    await expect(generateMealScanVision("/9j/4AAQSkZJRg==", "image/jpeg")).rejects.toMatchObject({
      category: "api",
    });
    expect(openAIMocks.createMock).toHaveBeenCalledTimes(1);
  });

  it("throws CoachContentError when meal scan vision output is not JSON", async () => {
    mockOpenAIText("Looks like food.");

    await expect(generateMealScanVision("/9j/4AAQSkZJRg==", "image/jpeg")).rejects.toMatchObject({
      category: "parse_error",
    });
  });

  it("generates meal scan coach affirmation content", async () => {
    mockOpenAIJson({
      mode: "affirmation",
      callout: "Solid protein for breakfast, keeps you on pace for the day.",
      swap: null,
    });

    const result = await generateMealScanCoachContent(
      {
        foodName: "egg scramble",
        servingSize: "1 plate",
        protein: 32,
        calories: 410,
        carbs: 18,
        fat: 22,
        confidence: 0.88,
      },
      {
        todayProteinLogged: 68,
        todayProteinTarget: 120,
        todayPercent: 57,
        projectedProtein: 100,
        projectedPercent: 83,
        weekAdherence: 79,
        calorieTarget: 1800,
        mode: "affirmation",
      },
      { biggestFear: "losing_muscle" },
    );

    expect(result).toMatchObject({
      mode: "affirmation",
      callout: "Solid protein for breakfast, keeps you on pace for the day.",
      swap: null,
      model: MEAL_SCAN_COACH_MODEL,
    });
    expect(openAIMocks.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: MEAL_SCAN_COACH_MODEL,
        temperature: MEAL_SCAN_COACH_TEMPERATURE,
        max_tokens: MEAL_SCAN_COACH_MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      {
        timeout: MEAL_SCAN_COACH_TIMEOUT_MS,
      },
    );
  });

  it("generates meal scan coach swap content with biggest-fear context", async () => {
    mockOpenAIJson({
      mode: "swap",
      callout:
        "This keeps your face and muscle better covered if you add the protein now.",
      swap: {
        description: "+4 oz chicken breast",
        additionalProtein: 26,
        additionalCalories: 130,
      },
    });

    const result = await generateMealScanCoachContent(
      {
        foodName: "rice bowl",
        servingSize: "1 bowl",
        protein: 12,
        calories: 520,
        carbs: 76,
        fat: 18,
        confidence: 0.74,
      },
      {
        todayProteinLogged: 20,
        todayProteinTarget: 120,
        todayPercent: 17,
        projectedProtein: 32,
        projectedPercent: 27,
        weekAdherence: 62,
        calorieTarget: 1800,
        mode: "swap",
      },
      { biggestFear: "ozempic_face" },
    );

    const body = openAIMocks.createMock.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(result.swap).toEqual({
      description: "+4 oz chicken breast",
      additionalProtein: 26,
      additionalCalories: 130,
    });
    expect(result.callout).toContain("face");
    expect(body.messages[1].content).toContain("Biggest fear from onboarding: ozempic_face");
    expect(body.messages[1].content).toContain("Mode selected by backend: swap");
    expect(MEAL_SCAN_COACH_SYSTEM_PROMPT).toContain("15g protein");
    expect(MEAL_SCAN_COACH_SYSTEM_PROMPT).toContain("150 calories");
  });

  it("throws CoachContentError when meal scan coach OpenAI call fails", async () => {
    openAIMocks.createMock.mockRejectedValueOnce(new openAIMocks.APIConnectionError("network down"));

    await expect(
      generateMealScanCoachContent(
        {
          foodName: "rice bowl",
          servingSize: "1 bowl",
          protein: 12,
          calories: 520,
          carbs: 76,
          fat: 18,
          confidence: 0.74,
        },
        {
          todayProteinLogged: 20,
          todayProteinTarget: 120,
          todayPercent: 17,
          projectedProtein: 32,
          projectedPercent: 27,
          weekAdherence: 62,
          calorieTarget: 1800,
          mode: "swap",
        },
        { biggestFear: "losing_muscle" },
      ),
    ).rejects.toMatchObject({
      category: "network",
    });
    expect(openAIMocks.createMock).toHaveBeenCalledTimes(1);
  });

  it("throws CoachContentError when meal scan coach output is malformed", async () => {
    mockOpenAIJson({
      mode: "swap",
      callout: "Try adding protein.",
      swap: null,
    });

    await expect(
      generateMealScanCoachContent(
        {
          foodName: "rice bowl",
          servingSize: "1 bowl",
          protein: 12,
          calories: 520,
          carbs: 76,
          fat: 18,
          confidence: 0.74,
        },
        {
          todayProteinLogged: 20,
          todayProteinTarget: 120,
          todayPercent: 17,
          projectedProtein: 32,
          projectedPercent: 27,
          weekAdherence: 62,
          calorieTarget: 1800,
          mode: "swap",
        },
        { biggestFear: "losing_muscle" },
      ),
    ).rejects.toMatchObject({
      category: "parse_error",
    });
  });

  it("generates workout recommendation framing copy from JSON", async () => {
    mockOpenAIJson({
      copy: "Energy's good today. Dumbbells only, useful work, nothing dramatic.",
    });

    const result = await generateWorkoutRecommendationCopy({
      workoutTitle: "Upper body strength",
      durationMinutes: 22,
      equipment: "dumbbells",
      intensity: "moderate",
      muscleGroups: ["chest", "back", "arms"],
      shotDayLabel: "SHOT DAY +3",
      energy: "good",
      sessionsThisWeek: 3,
      weeklyTarget: 3,
      selectionReason: "strength_rotation",
      biggestFear: "losing_muscle",
    });

    expect(result).toEqual({
      copy: "Energy's good today. Dumbbells only, useful work, nothing dramatic.",
      copyVersion: WORKOUT_RECOMMENDATION_COPY_VERSION,
      model: WORKOUT_RECOMMENDATION_MODEL,
    });
    expect(openAIMocks.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: WORKOUT_RECOMMENDATION_MODEL,
        temperature: WORKOUT_RECOMMENDATION_TEMPERATURE,
        max_tokens: WORKOUT_RECOMMENDATION_MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      {
        timeout: WORKOUT_RECOMMENDATION_TIMEOUT_MS,
      },
    );
  });

  it("passes shot-day low-energy context into the workout copy prompt", async () => {
    mockOpenAIJson({
      copy: "Recovery work today, gentle enough to keep the signal alive.",
    });

    await generateWorkoutRecommendationCopy({
      workoutTitle: "Shot-day mobility",
      durationMinutes: 12,
      equipment: "gentle",
      intensity: "recovery",
      muscleGroups: ["mobility", "hips"],
      shotDayLabel: "SHOT DAY",
      energy: "low",
      sessionsThisWeek: 0,
      weeklyTarget: 3,
      selectionReason: "shot_day_recovery",
      biggestFear: "energy",
    });

    const body = openAIMocks.createMock.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(body.messages[1].content).toContain("Shot day position: SHOT DAY");
    expect(body.messages[1].content).toContain("Energy from recent check-in: low");
    expect(body.messages[1].content).toContain("Selection reason from engine: shot_day_recovery");
    expect(WORKOUT_RECOMMENDATION_SYSTEM_PROMPT).toContain("Return JSON");
  });

  it("passes behind-target context into the workout copy prompt", async () => {
    mockOpenAIJson({
      copy: "Quick one to get a session on the board. Fifteen minutes, done.",
    });

    await generateWorkoutRecommendationCopy({
      workoutTitle: "Core & posture",
      durationMinutes: 15,
      equipment: "bodyweight",
      intensity: "easy",
      muscleGroups: ["core", "glutes"],
      shotDayLabel: "SHOT DAY +4",
      energy: "mid",
      sessionsThisWeek: 0,
      weeklyTarget: 3,
      selectionReason: "behind_target",
      biggestFear: "losing_muscle",
    });

    const body = openAIMocks.createMock.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    expect(body.messages[1].content).toContain("Sessions completed this week: 0 of 3");
    expect(body.messages[1].content).toContain("Selection reason from engine: behind_target");
  });

  it("throws CoachContentError when workout copy OpenAI call fails", async () => {
    openAIMocks.createMock.mockRejectedValueOnce(new openAIMocks.APIConnectionError("network down"));

    await expect(
      generateWorkoutRecommendationCopy({
        workoutTitle: "Core & posture",
        durationMinutes: 15,
        equipment: "bodyweight",
        intensity: "easy",
        muscleGroups: ["core", "glutes"],
        shotDayLabel: "SHOT DAY +4",
        energy: "mid",
        sessionsThisWeek: 0,
        weeklyTarget: 3,
        selectionReason: "behind_target",
        biggestFear: "losing_muscle",
      }),
    ).rejects.toMatchObject({
      category: "network",
    });
  });

  it("throws CoachContentError when workout copy output is malformed JSON", async () => {
    mockOpenAIText("Do a short workout.");

    await expect(
      generateWorkoutRecommendationCopy({
        workoutTitle: "Core & posture",
        durationMinutes: 15,
        equipment: "bodyweight",
        intensity: "easy",
        muscleGroups: ["core", "glutes"],
        shotDayLabel: null,
        energy: null,
        sessionsThisWeek: 0,
        weeklyTarget: 3,
        selectionReason: "default",
        biggestFear: "losing_muscle",
      }),
    ).rejects.toMatchObject({
      category: "parse_error",
    });
  });

  it("generates today's focus copy for a protein gap", async () => {
    mockOpenAIJson({
      headline: "30g protein at lunch",
      suggestion: "Try Greek yogurt and one scoop protein powder, about 30g.",
      actionType: "log_meal",
      actionLabel: "Log this meal",
    });

    const result = await generateTodaysFocusCopy({
      category: "protein_gap",
      selectionReason: "protein is behind target today",
      inputsSnapshot: {
        proteinLoggedToday: 40,
        proteinTargetToday: 120,
        sessionsThisWeek: 2,
        weeklyTarget: 3,
        shotDayLabel: "SHOT DAY +3",
        energy: "mid",
        daysSinceLastActivity: 0,
      },
      biggestFear: "losing_muscle",
      calorieTarget: 1800,
    });

    expect(result).toEqual({
      headline: "30g protein at lunch",
      suggestion: "Try Greek yogurt and one scoop protein powder, about 30g.",
      actionType: "log_meal",
      actionLabel: "Log this meal",
      copyVersion: TODAYS_FOCUS_COPY_VERSION,
      model: TODAYS_FOCUS_MODEL,
    });
    expect(result.suggestion).toMatch(/\d+/);
    expect(result.suggestion).toContain("Greek yogurt");
    expect(openAIMocks.createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: TODAYS_FOCUS_MODEL,
        temperature: TODAYS_FOCUS_TEMPERATURE,
        max_tokens: TODAYS_FOCUS_MAX_TOKENS,
        response_format: { type: "json_object" },
      }),
      {
        timeout: TODAYS_FOCUS_TIMEOUT_MS,
      },
    );
  });

  it("generates gentle copy for shot-day recovery", async () => {
    mockOpenAIJson({
      headline: "Take the day gentle",
      suggestion: "Water, something easy, and rest. Keep the bar politely low today.",
      actionType: "none",
      actionLabel: null,
    });

    const result = await generateTodaysFocusCopy({
      category: "shot_day_recovery",
      selectionReason: "user is on SHOT DAY with low energy",
      inputsSnapshot: {
        proteinLoggedToday: 80,
        proteinTargetToday: 120,
        sessionsThisWeek: 1,
        weeklyTarget: 3,
        shotDayLabel: "SHOT DAY",
        energy: "low",
        daysSinceLastActivity: 1,
      },
      biggestFear: "energy",
      calorieTarget: 1800,
    });

    expect(result.suggestion.toLowerCase()).not.toContain("workout");
    expect(result.suggestion.toLowerCase()).not.toContain("session");
    expect(result.suggestion.toLowerCase()).not.toContain("lift");
  });

  it("allows loggable action types for onboarding nudges", async () => {
    mockOpenAIJson({
      headline: "Log one easy thing",
      suggestion: "Start with one meal or one walk. The system needs a first breadcrumb.",
      actionType: "log_meal",
      actionLabel: "Log meal",
    });

    const result = await generateTodaysFocusCopy({
      category: "onboarding_nudge",
      selectionReason: "user has zero meal logs and zero workout logs since joining",
      inputsSnapshot: {
        proteinLoggedToday: 0,
        proteinTargetToday: 120,
        sessionsThisWeek: 0,
        weeklyTarget: 3,
        shotDayLabel: null,
        energy: null,
        daysSinceLastActivity: null,
      },
      biggestFear: "confidence",
      calorieTarget: 1800,
    });

    expect(["log_meal", "log_workout", "log_dose", "take_photo", "view_progress", "none"]).toContain(
      result.actionType,
    );
  });

  it("throws CoachContentError when today's focus OpenAI call fails", async () => {
    openAIMocks.createMock.mockRejectedValueOnce(new openAIMocks.APIConnectionError("network down"));

    await expect(
      generateTodaysFocusCopy({
        category: "steady_state",
        selectionReason: "user is on pace",
        inputsSnapshot: {
          proteinLoggedToday: 100,
          proteinTargetToday: 120,
          sessionsThisWeek: 3,
          weeklyTarget: 3,
          shotDayLabel: "SHOT DAY +4",
          energy: "good",
          daysSinceLastActivity: 0,
        },
        biggestFear: "losing_muscle",
        calorieTarget: 1800,
      }),
    ).rejects.toMatchObject({
      category: "network",
    });
    expect(openAIMocks.createMock).toHaveBeenCalledTimes(1);
  });

  it("throws CoachContentError when today's focus output is malformed JSON", async () => {
    mockOpenAIText("Protein at lunch.");

    await expect(
      generateTodaysFocusCopy({
        category: "protein_gap",
        selectionReason: "protein is behind target today",
        inputsSnapshot: {
          proteinLoggedToday: 40,
          proteinTargetToday: 120,
          sessionsThisWeek: 2,
          weeklyTarget: 3,
          shotDayLabel: null,
          energy: "mid",
          daysSinceLastActivity: 0,
        },
        biggestFear: "losing_muscle",
        calorieTarget: 1800,
      }),
    ).rejects.toMatchObject({
      category: "parse_error",
    });
  });

  it("throws CoachContentError when today's focus action type is invalid", async () => {
    mockOpenAIJson({
      headline: "Protein at lunch",
      suggestion: "Add one scoop whey to yogurt, about 25g.",
      actionType: "open_chat",
      actionLabel: "Ask coach",
    });

    await expect(
      generateTodaysFocusCopy({
        category: "protein_gap",
        selectionReason: "protein is behind target today",
        inputsSnapshot: {
          proteinLoggedToday: 40,
          proteinTargetToday: 120,
          sessionsThisWeek: 2,
          weeklyTarget: 3,
          shotDayLabel: null,
          energy: "mid",
          daysSinceLastActivity: 0,
        },
        biggestFear: "losing_muscle",
        calorieTarget: 1800,
      }),
    ).rejects.toMatchObject({
      category: "parse_error",
    });
    expect(TODAYS_FOCUS_SYSTEM_PROMPT).toContain("Return JSON");
  });
});
