import { describe, expect, it } from "vitest";
import { TRAINING_STATUSES, EQUIPMENT_ACCESS_OPTIONS } from "@leanient/shared";
import { EQUIPMENT_OPTIONS, TRAINING_STATUS_OPTIONS } from "../../onboarding/options";

describe("TRAINING_STATUS_OPTIONS", () => {
  it("maps every card onto a valid shared TrainingStatus value", () => {
    // The v2 conversation shows 3 cards (onboarding-v2 frame 13); `returning`
    // stays a valid enum value with no card.
    expect(TRAINING_STATUS_OPTIONS).toHaveLength(3);
    for (const option of TRAINING_STATUS_OPTIONS) {
      expect(TRAINING_STATUSES).toContain(option.value);
    }
    expect(new Set(TRAINING_STATUS_OPTIONS.map((o) => o.value)).size).toBe(3);
  });

  it("gives every option a label and a subtext line", () => {
    for (const option of TRAINING_STATUS_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0);
      expect(option.sub && option.sub.length).toBeGreaterThan(0);
    }
  });

  it("frames not-yet as the starting point, never a confession", () => {
    expect(TRAINING_STATUS_OPTIONS[0].label).toBe("Not at all yet");
    expect(TRAINING_STATUS_OPTIONS[0].sub).toContain("Perfect starting point");
  });
});

describe("EQUIPMENT_OPTIONS", () => {
  it("maps every chip onto a valid shared EquipmentAccess value", () => {
    expect(EQUIPMENT_OPTIONS).toHaveLength(4);
    for (const option of EQUIPMENT_OPTIONS) {
      expect(EQUIPMENT_ACCESS_OPTIONS).toContain(option.value);
    }
  });
});
