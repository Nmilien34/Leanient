import { describe, expect, it } from "vitest";
import { TRAINING_STATUSES } from "@leanient/shared";
import { TRAINING_STATUS_OPTIONS } from "../../onboarding/options";

describe("TRAINING_STATUS_OPTIONS", () => {
  it("maps one-to-one onto the shared TrainingStatus enum", () => {
    expect(TRAINING_STATUS_OPTIONS.map((o) => o.value)).toEqual([...TRAINING_STATUSES]);
  });

  it("gives every option a label and a subtext line", () => {
    for (const option of TRAINING_STATUS_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.sub && option.sub.length).toBeGreaterThan(0);
    }
  });
});
