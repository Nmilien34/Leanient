export const DEFAULT_STAGGER_STEP_MS = 70;
export const DEFAULT_STAGGER_MAX_DELAY_MS = 420;

export function staggeredRevealDelay(
  index: number,
  stepMs = DEFAULT_STAGGER_STEP_MS,
  maxDelayMs = DEFAULT_STAGGER_MAX_DELAY_MS,
): number {
  const safeIndex = Math.max(0, index);
  return Math.min(maxDelayMs, safeIndex * stepMs);
}
