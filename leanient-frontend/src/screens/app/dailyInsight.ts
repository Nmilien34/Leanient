import type { VerdictStatus } from "@leanient/shared";

/**
 * The Home "coach insight" card: one short, data-driven read from the coach,
 * chosen from the user's real week (verdict status, the three retention levers,
 * loss pace, and the shot cycle). It is an observation plus a why, NOT a task
 * list (the plan already owns tasks). Deterministic and testable; the coach's
 * voice is written here, the same way the verdict explanation is.
 */

export type DailyInsightTone = "win" | "watch" | "coach";

export interface DailyInsight {
  tone: DailyInsightTone;
  /** Short eyebrow, e.g. "NICE WORK" / "WORTH A LOOK" / "COACH'S READ". */
  tag: string;
  headline: string;
  body: string;
  /** Seeds the coach chat when the card is tapped, so the conversation lands in context. */
  chatPrompt: string;
}

export interface DailyInsightLever {
  key: string;
  label: string;
  score: number;
}

/** A lever scoring below this reads as a clear gap worth calling out. */
export const LEVER_GAP = 60;
/** Weekly loss beyond this (lb) is quick enough that muscle is at risk. */
export const FAST_LOSS_LB = 1.6;

export function buildDailyInsight(args: {
  verdictStatus: VerdictStatus;
  retentionDelta: number | null;
  /** The retention levers (protein / training / pace) with their weekly scores. */
  levers: DailyInsightLever[];
  /** Week-over-week weight change in lb; negative means weight came off. */
  weeklyDeltaLb: number | null;
  /** True in the shot's ease-in window, where appetite (and protein) dip. */
  shotContext: boolean;
}): DailyInsight {
  const { verdictStatus, retentionDelta, levers, weeklyDeltaLb, shotContext } = args;
  const weakest = levers.length ? [...levers].sort((a, b) => a.score - b.score)[0] : null;
  const lossLb = weeklyDeltaLb != null ? Math.abs(Math.min(0, weeklyDeltaLb)) : null;

  // 1 · Shot-day window — appetite fades, so protein goes in early.
  if (shotContext) {
    return {
      tone: "coach",
      tag: "SHOT-DAY READ",
      headline: "Front-load your protein today",
      body: "Appetite fades later in your cycle. Big breakfast, easy dinner.",
      chatPrompt: "How should I eat on a shot day to protect my muscle?",
    };
  }

  // 2 · Losing quickly — keep the drop coming from fat.
  if (lossLb != null && lossLb >= FAST_LOSS_LB) {
    return {
      tone: "watch",
      tag: "WORTH A LOOK",
      headline: `You're down ${lossLb.toFixed(1)} lb this week`,
      body: "Quick pace. Protein at every meal plus one session keeps the loss on fat.",
      chatPrompt: "I'm losing weight fast. How do I keep it from being muscle?",
    };
  }

  // 3 · A clear lever gap this week.
  if (weakest && weakest.score < LEVER_GAP) {
    if (weakest.key === "training") {
      return {
        tone: "coach",
        tag: "COACH'S READ",
        headline: "Training is your gap this week",
        body: "One short session moves your score most right now. Even 15 minutes counts.",
        chatPrompt: "What's a quick strength session I can do today?",
      };
    }
    if (weakest.key === "protein") {
      return {
        tone: "coach",
        tag: "COACH'S READ",
        headline: "Protein is the lever to pull",
        body: "You've been landing under target. Hit it today, especially near your shot.",
        chatPrompt: "How do I hit my protein target more consistently?",
      };
    }
  }

  // 4 · Strong, stable week — name the win and reinforce it.
  if (verdictStatus === "on_track" && (retentionDelta == null || retentionDelta >= 0)) {
    return {
      tone: "win",
      tag: "NICE WORK",
      headline: "You're in the sweet spot",
      body:
        lossLb != null && lossLb > 0
          ? `Down ${lossLb.toFixed(1)} lb and keeping your muscle. Do it again.`
          : "Keeping your muscle while the fat comes off. Hold this line.",
      chatPrompt: "What should I keep doing to stay on track?",
    };
  }

  // 5 · Drifting or losing — steady the trend.
  if (verdictStatus === "drifting" || verdictStatus === "losing_muscle") {
    return {
      tone: "watch",
      tag: "COACH'S READ",
      headline: "Let's steady the trend",
      body: "Protein to target and one session this week is the fastest way back.",
      chatPrompt: "Why is my muscle trend slipping, and how do I fix it?",
    };
  }

  // 6 · Early or quiet week — a welcoming default that earns its keep.
  return {
    tone: "coach",
    tag: "COACH'S READ",
    headline: "Small things, every day",
    body: "Protein at each meal, a session when it's due. Keep logging and I'll read the rest.",
    chatPrompt: "What matters most for keeping muscle on a GLP-1?",
  };
}
