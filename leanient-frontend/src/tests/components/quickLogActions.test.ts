import { describe, expect, it } from "vitest";
import { QUICK_LOG_ACTIONS } from "../../components/app/quickLogActions";

describe("QUICK_LOG_ACTIONS", () => {
  it("places the coach action between scan and manual meal", () => {
    const labels = QUICK_LOG_ACTIONS.map((row) => row.label);
    const keys = QUICK_LOG_ACTIONS.map((row) => row.key);

    expect(labels).toContain("Talk to your coach");
    expect(labels.indexOf("Talk to your coach")).toBe(labels.indexOf("Scan meal") + 1);
    expect(labels.indexOf("Manual meal")).toBe(labels.indexOf("Talk to your coach") + 1);
    expect(keys[labels.indexOf("Talk to your coach")]).toBe("coach");
  });
});
