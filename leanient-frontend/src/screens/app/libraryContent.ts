import type { CycleDayKind } from "./cyclePersonality";

/**
 * The starter library behind the For-today shelf (frame 07): short coach-voice
 * reads keyed to cycle days, so the shelf picks what matches TODAY. Client-
 * bundled v1; numbers follow docs/glp1-clinical-reference.md. Grows into a
 * served content pipeline later without changing the shelf.
 */
export interface LibraryRead {
  key: string;
  title: string;
  minutes: number;
  /** Which day personalities this read matches. */
  kinds: CycleDayKind[];
  /** Amber tile for guard-flavored reads, mint otherwise. */
  amber: boolean;
  paragraphs: string[];
}

export const LIBRARY_READS: LibraryRead[] = [
  {
    key: "day5-hunger",
    title: "Why hunger returns on day 5",
    minutes: 3,
    kinds: ["defense", "steady"],
    amber: true,
    paragraphs: [
      "Your med leaves your body on a curve. By day 5 or 6 the level in your blood has dropped to roughly half of its peak, so the appetite signals it was quieting start to come through again. That evening hunger is chemistry, and it is right on schedule.",
      "It says nothing about your discipline. The plan already leans on it: protein early in the day, so the evening asks less of you, and a small ritual like a walk after dinner to carry you past the loudest hour.",
      "The next shot resets the curve. Hungry nights before a shot are the most reported pattern on weekly GLP-1s, and they pass.",
    ],
  },
  {
    key: "fresh-shot-48h",
    title: "Your first 48 hours on a fresh shot",
    minutes: 2,
    kinds: ["reset", "settling"],
    amber: false,
    paragraphs: [
      "The day of and the day after your shot are when side effects speak loudest, especially nausea and tiredness. That is why the plan flexes your protein target down and keeps the training gentle.",
      "Water is the quiet hero here. Staying ahead of it keeps most of the common side effects smaller. Small, frequent sips beat one big glass.",
      "By day 2 the noise usually settles and your strongest window of the week opens. The plan will ask more of you then, and you will have it to give.",
    ],
  },
  {
    key: "protein-quiet-appetite",
    title: "Protein when appetite is quiet",
    minutes: 2,
    kinds: ["greenlight", "reset", "settling"],
    amber: false,
    paragraphs: [
      "A quiet appetite is the med working, and it comes with a catch: it silences protein hunger too, and protein is what protects your muscle while the weight comes off.",
      "The move is small and mechanical: protein first at every meal, before anything else on the plate. Twenty to thirty grams per meal, spread across the day, beats one big hit.",
      "On your easiest days, front-load. A bigger lunch on day 2 costs you nothing and banks what the hungry days will make harder.",
    ],
  },
  {
    key: "muscle-basics",
    title: "The muscle part, in plain words",
    minutes: 3,
    kinds: ["greenlight", "steady", "defense", "reset", "settling"],
    amber: false,
    paragraphs: [
      "In the semaglutide trials, up to roughly 39 percent of the weight lost measured as lean mass, which includes muscle (STEP-1 DEXA substudy). Across drugs the honest range is about 25 to 40 percent.",
      "And it is preventable. Two levers, both in your plan: protein at your daily target, and resistance training two to three times a week. People who work both keep what is theirs.",
      "That is the whole reason this app exists. Every card on your plan is one of those levers wearing today's clothes.",
    ],
  },
  {
    key: "stalls",
    title: "Stalls are part of the road",
    minutes: 2,
    kinds: ["steady", "defense"],
    amber: false,
    paragraphs: [
      "Every long weight-loss journey has flat weeks. Water shifts, hormones, and glycogen can hide a real loss under a stubborn scale number for days.",
      "The trend line is your truth, and it is why your Progress screen smooths the week instead of shouting about a single morning. One flat week changes nothing about where you are headed.",
      "If the flat stretches past a few weeks, the coach will see it in your numbers and bring one adjustment, one at a time.",
    ],
  },
  {
    key: "food-noise",
    title: "Where the food noise went",
    minutes: 2,
    kinds: ["greenlight", "settling"],
    amber: false,
    paragraphs: [
      "Many people describe the biggest change on a GLP-1 as silence: the constant background chatter about food goes quiet. That is receptor signaling in the brain's appetite circuits, and it is one of the most consistent reported effects.",
      "The quiet is useful. Decisions about food get cheaper, and the plan's small asks, protein first, one session, land easier than they ever did before the med.",
      "On the days the noise creeps back near your next shot, remember it is the curve, and it resets.",
    ],
  },
];

/**
 * The shelf's pick: reads matching today's personality first (marked as the
 * match), topped up with the evergreen muscle read.
 */
export function pickReadsForToday(kind: CycleDayKind, limit = 2): Array<LibraryRead & { matchesToday: boolean }> {
  const matches = LIBRARY_READS.filter((r) => r.kinds.includes(kind)).map((r) => ({ ...r, matchesToday: true }));
  const rest = LIBRARY_READS.filter((r) => !r.kinds.includes(kind)).map((r) => ({ ...r, matchesToday: false }));
  return [...matches, ...rest].slice(0, limit);
}
