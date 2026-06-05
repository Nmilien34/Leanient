/**
 * The four render states every data-driven section resolves to, in priority order.
 * This is the single source of truth for the loading / error / empty / content
 * decision so all read screens behave consistently (Gap 10).
 *
 * Priority (when the section has NO data yet):
 *   1. loading  - a fetch is in flight
 *   2. error    - the last fetch failed
 *   3. empty    - the fetch succeeded but the section is genuinely empty
 * If the section DOES have data, always show content. Cached data wins, so a
 * failed background refresh keeps the last good values on screen instead of
 * flashing an error.
 */
export type SectionState = "loading" | "error" | "empty" | "content";

export interface SectionStateInput {
  /** Does the section have data to show (non-null, non-empty)? */
  hasData: boolean;
  /** Is the relevant fetch in flight? */
  isLoading: boolean;
  /** Did the last relevant fetch fail? */
  hasError: boolean;
}

export function resolveSectionState({ hasData, isLoading, hasError }: SectionStateInput): SectionState {
  if (hasData) return "content";
  if (isLoading) return "loading";
  if (hasError) return "error";
  return "empty";
}
