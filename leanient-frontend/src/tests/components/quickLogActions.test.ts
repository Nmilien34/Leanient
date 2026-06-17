import { describe, expect, it } from "vitest";
import { QUICK_LOG_ACTIONS } from "../../components/app/quickLogActions";

describe("QUICK_LOG_ACTIONS", () => {
  it("leads with the consolidated Log food entry, then the coach", () => {
    const labels = QUICK_LOG_ACTIONS.map((row) => row.label);
    const keys = QUICK_LOG_ACTIONS.map((row) => row.key);

    // Scan + manual are consolidated into one "Log food" hub.
    expect(labels).not.toContain("Scan meal");
    expect(labels).not.toContain("Manual meal");
    expect(labels[0]).toBe("Log food");
    expect(keys[0]).toBe("meal");
    expect(labels[1]).toBe("Talk to your coach");
  });
});
