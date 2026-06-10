import { describe, expect, it, vi } from "vitest";
import {
  createOpenProgressPhotoAction,
  getPrimaryFocusActionIntent,
  getSecondaryFocusAction,
} from "../../screens/app/homeActions";

describe("home actions", () => {
  it("opens progress photo capture from the body photo CTA", () => {
    const openProgressPhoto = vi.fn();

    createOpenProgressPhotoAction(openProgressPhoto)();

    expect(openProgressPhoto).toHaveBeenCalledTimes(1);
  });

  it("uses meal scanning as the primary Today's Focus meal action", () => {
    expect(getPrimaryFocusActionIntent("log_meal")).toBe("meal_scan");
  });

  it("offers manual meal logging as the secondary Today's Focus meal action", () => {
    expect(getSecondaryFocusAction("log_meal")).toEqual({
      intent: "meal_manual",
      label: "Log this meal manually",
    });
  });

  it("does not show a secondary focus action for non-meal actions", () => {
    expect(getSecondaryFocusAction("log_workout")).toBeNull();
    expect(getSecondaryFocusAction("none")).toBeNull();
  });
});
