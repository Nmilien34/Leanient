import type { CycleDayKind } from "./cyclePersonality";

/**
 * Frame 08: the ask-anything chat opens with today's context and seeds chips
 * with the questions people actually ask in GLP-1 communities, phrased their
 * way. Picks rotate daily and follow the cycle day, so the chat looks like it
 * already knows what tonight's question will be.
 */

const BY_KIND: Record<CycleDayKind, string[]> = {
  defense: [
    "Is it normal to be starving the night before my shot?",
    "What do I eat when the cravings hit at night?",
    "Why is day 5 always the hardest?",
  ],
  steady: [
    "Why did my loss slow down this week?",
    "How do I keep the routine from getting boring?",
  ],
  greenlight: [
    "Should I push harder on my good days?",
    "What do I eat when nothing sounds good?",
  ],
  reset: [
    "How do I get protein down when I feel queasy?",
    "What should shot day look like?",
  ],
  settling: [
    "Is day-after tiredness normal?",
    "How do I get protein down when I feel queasy?",
  ],
};

const GENERIC = [
  "Why did the scale jump overnight?",
  "Will I lose progress if I miss a shot?",
  'Is "Ozempic face" real?',
  "How much protein do I actually need?",
  "What happens when I stop the med?",
  "Why am I so tired this week?",
];

/** Day-of-year seed so the chips rotate daily without feeling random. */
const daySeed = (now: Date) => Math.floor(now.getTime() / 86_400_000);

export function pickCommunityQuestions(kind: CycleDayKind, now: Date, limit = 4): string[] {
  const seed = daySeed(now);
  const todays = BY_KIND[kind];
  const picks: string[] = [todays[seed % todays.length]];
  if (todays.length > 1) picks.push(todays[(seed + 1) % todays.length]);
  let i = 0;
  while (picks.length < limit && i < GENERIC.length) {
    const candidate = GENERIC[(seed + i) % GENERIC.length];
    if (!picks.includes(candidate)) picks.push(candidate);
    i += 1;
  }
  return picks.slice(0, limit);
}

/** The coach's first line, spoken from today's cycle position. */
export function coachOpener(kind: CycleDayKind, daysSinceShot: number, name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0];
  const to = first ? `, ${first}` : "";
  switch (kind) {
    case "defense":
      return `Day ${daysSinceShot} tonight${to}. Hunger may knock. Ask me anything, I've got you.`;
    case "reset":
      return `Shot day${to}. Gentle plan, big week ahead. Ask me anything.`;
    case "settling":
      return `Day ${daysSinceShot}${to}. If today feels quiet or queasy, that's the med settling. Ask me anything.`;
    case "greenlight":
      return `Day ${daysSinceShot}${to}, your strongest window. Ask me anything, I've got you.`;
    default:
      return `Mid cycle${to}. Steady days win weeks. Ask me anything.`;
  }
}
