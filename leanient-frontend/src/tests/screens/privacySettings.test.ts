import { describe, expect, it } from "vitest";
import { SHARING_TOGGLES, defaultSharingState, photosLabel } from "../../screens/app/privacySettings";

describe("privacySettings", () => {
  it("defaults research off and personalized coaching on", () => {
    const s = defaultSharingState();
    expect(s).toEqual({ research: false, coaching: true });
  });

  it("describes each sharing toggle with a subtitle", () => {
    expect(SHARING_TOGGLES).toHaveLength(2);
    for (const t of SHARING_TOGGLES) expect(t.subtitle.length).toBeGreaterThan(0);
  });

  it("pluralizes the progress-photo count and handles empty", () => {
    expect(photosLabel(3)).toBe("3 photos");
    expect(photosLabel(1)).toBe("1 photo");
    expect(photosLabel(0)).toBe("None yet");
  });
});
