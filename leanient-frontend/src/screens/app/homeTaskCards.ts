import type { PlanChecklistItem, TodayPlan } from "./todayPlanMetrics";
import type { CycleDayKind } from "./cyclePersonality";

/**
 * The v2 plan is flat tap-cards (no expansion): 3-4 word titles, chips instead
 * of sentences, one visual on the right. This maps the shipped checklist +
 * plan into card view-models (design/home-coach.html frames 01-03).
 */
export type TaskChipTone = "plain" | "em" | "am";

export interface TaskChip {
  label: string;
  tone: TaskChipTone;
}

export interface TaskCardView {
  key: string;
  kind: PlanChecklistItem["kind"] | "water" | "weighin" | "walk";
  title: string;
  done: boolean;
  /** Emerald outline + eyebrow on the day's priority card. */
  focus: boolean;
  focusLabel?: string;
  amber?: boolean;
  chips: TaskChip[];
  /** The single right-side visual. */
  right: "ring" | "play" | "playPrimary" | "go" | "goPrimary";
  /** For right === "ring". */
  pct?: number;
  /** Small chip on the compressed done strip ("8:10a", "79g to go"). */
  doneChip?: string;
}

const FOCUS_LABEL_BY_KIND: Record<CycleDayKind, string> = {
  reset: "TODAY'S FOCUS",
  settling: "TODAY'S FOCUS",
  greenlight: "TODAY'S FOCUS",
  steady: "TODAY'S FOCUS",
  // The defense play is protein before the hunger window opens.
  defense: "BEFORE 2PM",
};

/** "Breakfast" / "Lunch" / "Dinner" by local hour, for protein card titles. */
export function mealNameForHour(hour: number): string {
  if (hour < 11) return "Breakfast";
  if (hour < 16) return "Lunch";
  return "Dinner";
}

/** Swap the checklist's generic protein prefix for the mealtime name, keeping the grams. */
function mealTitle(itemTitle: string, hour: number): string {
  const parts = itemTitle.split("·");
  if (parts.length < 2) return itemTitle;
  return `${mealNameForHour(hour)} ·${parts.slice(1).join("·")}`;
}

export function toTaskCards(args: {
  plan: TodayPlan;
  checklist: PlanChecklistItem[];
  personality: CycleDayKind;
  /** Local hour, for mealtime titles ("Lunch · ~40g"). */
  hour: number;
  /** "dumbbells" — the equipment half of the move title. */
  equipment?: string | null;
  /** Today's abandoned session, for the pick-it-back-up chip. */
  sessionStarted?: boolean;
  /** The latest logged meal's time, chipped onto the banked strip ("8:10a"). */
  lastMealTime?: string | null;
  /** "1.0 mg" — the protocol dose, carried on the shot card title. */
  doseLabel?: string | null;
  /** "Left thigh" — the rotation suggestion from dose history. */
  nextSiteLabel?: string | null;
}): TaskCardView[] {
  const { plan, checklist, personality, hour, equipment, sessionStarted, lastMealTime, doseLabel, nextSiteLabel } =
    args;
  const reset = personality === "reset";

  const doneChipFor = (item: PlanChecklistItem): string | undefined => {
    if (item.key === "protein-banked") return `${plan.eat.remaining}g to go`;
    if (item.kind === "protein") return lastMealTime ?? "target hit";
    if (item.kind === "shot") return "logged";
    return "done";
  };

  return checklist.map((item): TaskCardView => {
    if (item.done) {
      return {
        key: item.key,
        kind: item.kind,
        title: item.title,
        done: true,
        focus: false,
        chips: [],
        right: "go",
        doneChip: doneChipFor(item),
      };
    }

    if (item.kind === "protein") {
      const chips: TaskChip[] = [];
      if (reset) {
        // The reset-day promise: the target already flexed down in the plan.
        chips.push({ label: "target flexed down", tone: "em" });
        chips.push({ label: "a shake counts", tone: "plain" });
      } else {
        const idea = plan.eat.suggestions[0];
        if (idea) chips.push({ label: idea.name, tone: "em" });
        chips.push({ label: "or scan", tone: "plain" });
      }
      return {
        key: item.key,
        kind: item.kind,
        title: reset ? `Easy protein · ${plan.eat.target}g` : mealTitle(item.title, hour),
        done: false,
        focus: item.focus && !reset,
        focusLabel: FOCUS_LABEL_BY_KIND[personality],
        chips,
        right: "ring",
        pct: item.trailingPct ?? 0,
      };
    }

    if (item.kind === "session") {
      const green = personality === "greenlight";
      const chips: TaskChip[] = [];
      if (sessionStarted) chips.push({ label: "started · pick it back up", tone: "am" });
      else if (reset) {
        chips.push({ label: "gentle", tone: "am" });
        chips.push({ label: "still counts", tone: "plain" });
      } else if (green) chips.push({ label: "your strongest slot", tone: "em" });
      else if (equipment) chips.push({ label: equipment, tone: "plain" });
      return {
        key: item.key,
        kind: item.kind,
        title: item.title,
        done: false,
        focus: item.focus,
        focusLabel: "TODAY'S FOCUS",
        chips,
        // Green-light days push the session: the strongest window gets the
        // filled play button even when protein holds the focus outline.
        right: green || item.focus ? "playPrimary" : "play",
      };
    }

    // shot — the reset day's anchor, dose on the title, rotation on the chip.
    return {
      key: item.key,
      kind: item.kind,
      title: doseLabel ? `${item.title} · ${doseLabel}` : item.title,
      done: false,
      focus: true,
      focusLabel: "ANCHORS YOUR WEEK",
      amber: true,
      chips: nextSiteLabel ? [{ label: `${nextSiteLabel.toLowerCase()} next`, tone: "am" }] : [],
      right: "goPrimary",
    };
  });
}

/**
 * Shot day leads with the anchor: the shot card moves to the top of the plan
 * (board frame 02), everything else keeps its order.
 */
export function orderForReset(cards: TaskCardView[], personality: CycleDayKind): TaskCardView[] {
  if (personality !== "reset") return cards;
  const shot = cards.filter((c) => c.kind === "shot" && !c.done);
  const rest = cards.filter((c) => !(c.kind === "shot" && !c.done));
  return [...shot, ...rest];
}

/**
 * The defense-day walk micro-card: the evening guard rail against the hunger
 * window. Zero-decision — tapping it ticks it done on the spot (frame 06),
 * with an undo toast instead of any screen.
 */
export function buildWalkCard(doneAt: string | null, now: Date): TaskCardView {
  const done = doneAt != null;
  const justNow = done && now.getTime() - new Date(doneAt).getTime() < 15 * 60_000;
  return {
    key: "walk",
    kind: "walk",
    title: "Walk · 10 min",
    done,
    focus: false,
    amber: true,
    chips: [{ label: "after dinner", tone: "am" }, { label: "blunts the cravings", tone: "plain" }],
    right: "go",
    doneChip: done ? (justNow ? "just now" : "earlier today") : undefined,
  };
}

/**
 * The green-light weigh-in micro-card: day 2-3 is the truest read of the
 * cycle (water weight settled, appetite quiet), so the fresh third slot asks
 * for the scale. Done state follows the real weight log.
 */
export function buildWeighInCard(loggedToday: boolean): TaskCardView {
  return {
    key: "weighin",
    kind: "weighin",
    title: "Morning weigh-in",
    done: loggedToday,
    focus: false,
    chips: [
      { label: "30 seconds", tone: "plain" },
      { label: "day 2 reads truest", tone: "em" },
    ],
    right: "go",
    doneChip: loggedToday ? "logged" : undefined,
  };
}

/**
 * The shot-day water micro-card: a local, tap-to-add 0.5L counter toward 2L.
 * Purely additive to the plan (never counted by the verdict engine).
 */
export function buildWaterCard(liters: number, goalLiters = 2): TaskCardView {
  const done = liters >= goalLiters;
  return {
    key: "water",
    kind: "water",
    title: done ? `Water · ${goalLiters}L in` : `Water · ${goalLiters}L`,
    done,
    focus: false,
    amber: true,
    chips: liters > 0 ? [{ label: `${liters}L so far`, tone: "am" }] : [{ label: "tap to add 0.5L", tone: "plain" }],
    right: "ring",
    pct: Math.min(100, (liters / goalLiters) * 100),
    doneChip: done ? "ahead of the side effects" : undefined,
  };
}
