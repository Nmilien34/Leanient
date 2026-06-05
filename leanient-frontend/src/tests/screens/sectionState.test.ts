import { describe, expect, it } from "vitest";
import { resolveSectionState } from "../../screens/app/sectionState";

describe("resolveSectionState", () => {
  it("shows content whenever the section has data, even mid-refresh or after an error", () => {
    expect(resolveSectionState({ hasData: true, isLoading: false, hasError: false })).toBe("content");
    // Cached data wins: a failed/with-flight background refresh keeps content.
    expect(resolveSectionState({ hasData: true, isLoading: true, hasError: false })).toBe("content");
    expect(resolveSectionState({ hasData: true, isLoading: false, hasError: true })).toBe("content");
  });

  it("prioritizes loading over error and empty when there is no data yet", () => {
    expect(resolveSectionState({ hasData: false, isLoading: true, hasError: false })).toBe("loading");
    expect(resolveSectionState({ hasData: false, isLoading: true, hasError: true })).toBe("loading");
  });

  it("shows error when there is no data, nothing in flight, and the fetch failed", () => {
    expect(resolveSectionState({ hasData: false, isLoading: false, hasError: true })).toBe("error");
  });

  it("shows empty when the fetch succeeded but the section has no data", () => {
    expect(resolveSectionState({ hasData: false, isLoading: false, hasError: false })).toBe("empty");
  });
});
