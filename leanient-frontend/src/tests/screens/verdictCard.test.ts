import { describe, expect, it, vi } from "vitest";
import { shouldShowVerdictCardAction } from "../../components/app/verdictCardBehavior";

describe("VerdictCard action visibility", () => {
  it("only shows the card action for full cards with an action handler", () => {
    expect(shouldShowVerdictCardAction({ mini: true, onAction: vi.fn() })).toBe(false);
    expect(shouldShowVerdictCardAction({ mini: false, onAction: undefined })).toBe(false);
    expect(shouldShowVerdictCardAction({ mini: false, onAction: vi.fn() })).toBe(true);
  });
});
