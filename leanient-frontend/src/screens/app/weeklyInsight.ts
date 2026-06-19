import type { MuscleRetentionSnapshot } from "@leanient/shared";
import type { DailyInsight } from "./dailyInsight";

/**
 * The "This week" coach insight: a week-over-week read, comparing the latest
 * retention snapshot to the prior one. Where the Today insight is about today's
 * levers, this is the arc of the week — what moved, up or down, and why. Reuses
 * the DailyInsight shape so the same CoachInsightCard renders it. Deterministic.
 */

/** A score move this size (out of 100) is worth naming. */
export const NOTABLE_MOVE = 6;
const COMPONENT_MOVE = 10;

const round = (n: number) => Math.round(n);

export function buildWeeklyInsight(snapshots: MuscleRetentionSnapshot[]): DailyInsight | null {
  if (snapshots.length === 0) return null;
  const sorted = [...snapshots].sort((a, b) => (a.weekOf < b.weekOf ? -1 : 1));
  const latest = sorted[sorted.length - 1];

  if (sorted.length === 1) {
    return {
      tone: "coach",
      tag: "COACH'S READ",
      headline: "Your first week is in",
      body: "One week logged. From here I can read your trend, what's protecting your muscle and what's slipping. Keep logging and the picture sharpens.",
      chatPrompt: "What should I focus on for my first few weeks?",
    };
  }

  const prior = sorted[sorted.length - 2];
  const dMuscle = round(latest.muscleRetentionScore - prior.muscleRetentionScore);
  const dProtein = round(latest.proteinScore - prior.proteinScore);
  const dTraining = round(latest.trainingScore - prior.trainingScore);

  if (dMuscle >= NOTABLE_MOVE) {
    return {
      tone: "win",
      tag: "NICE WORK",
      headline: `Your muscle score climbed ${dMuscle} points`,
      body: "Whatever you changed this week worked. Hold the same protein and training rhythm and it sticks.",
      chatPrompt: "What drove my muscle score up this week?",
    };
  }
  if (dMuscle <= -NOTABLE_MOVE) {
    return {
      tone: "watch",
      tag: "WORTH A LOOK",
      headline: `Your muscle score slipped ${Math.abs(dMuscle)} points`,
      body: "A dip, not a disaster. Protein to target plus one extra session this week is usually enough to turn it.",
      chatPrompt: "Why did my muscle score drop this week?",
    };
  }
  if (dProtein >= COMPONENT_MOVE) {
    return {
      tone: "win",
      tag: "NICE WORK",
      headline: "Your strongest protein week in a while",
      body: "Protein is the biggest muscle protector on a GLP-1, and you hit it. Hold this and the score follows.",
      chatPrompt: "How do I keep my protein this consistent?",
    };
  }
  if (dTraining >= COMPONENT_MOVE) {
    return {
      tone: "win",
      tag: "NICE WORK",
      headline: "Training stepped up this week",
      body: "More resistance work is what tells your body to keep the muscle. Keep the sessions coming.",
      chatPrompt: "How many strength sessions should I aim for?",
    };
  }
  if (dTraining <= -COMPONENT_MOVE) {
    return {
      tone: "watch",
      tag: "COACH'S READ",
      headline: "Training eased off this week",
      body: "Sessions dipped from last week. Even two short ones this week keeps your muscle signal up.",
      chatPrompt: "What's a realistic training plan for this week?",
    };
  }
  if (dProtein <= -COMPONENT_MOVE) {
    return {
      tone: "watch",
      tag: "COACH'S READ",
      headline: "Protein eased off this week",
      body: "Last week's protein ran lighter. Two protein-forward meals a day gets it back where it protects muscle.",
      chatPrompt: "How do I get my protein back on track?",
    };
  }
  return {
    tone: "coach",
    tag: "COACH'S READ",
    headline: "A steady week",
    body: "You held your muscle score about level. Consistency is exactly what keeps your muscle while the fat comes off.",
    chatPrompt: "What's the one thing to improve this week?",
  };
}
