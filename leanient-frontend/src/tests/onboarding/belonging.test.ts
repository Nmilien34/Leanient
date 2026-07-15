import { describe, expect, it } from "vitest";
import { buildBelonging } from "../../onboarding/belonging";

describe("buildBelonging", () => {
  it("locks in the shot day and cites the semaglutide stat for semaglutide meds", () => {
    const view = buildBelonging({ shotDays: ["saturday"], medicationName: "Wegovy" });
    expect(view.context).toBe("Saturdays. Locked in.");
    expect(view.statNum).toBe("4.1M+");
    expect(view.statLine).toContain("semaglutide");
    expect(view.statCite).toBe("IQVIA National Prescription Audit");
  });

  it("names every shot day for split-dose schedules", () => {
    const view = buildBelonging({ shotDays: ["wednesday", "thursday"], medicationName: "Ozempic" });
    expect(view.context).toBe("Wednesdays + Thursdays. Locked in.");
  });

  it("falls back to the cited GLP-1 population read for other meds", () => {
    const view = buildBelonging({ shotDays: ["monday"], medicationName: "Zepbound" });
    expect(view.statNum).toBe("15M+");
    expect(view.statLine).toContain("GLP-1");
    expect(view.statCite).toBe("KFF Health Tracking Poll");
  });

  it("survives a missing shot day and med", () => {
    const view = buildBelonging({ shotDays: undefined, medicationName: undefined });
    expect(view.context).toBe("Locked in.");
    expect(view.statNum).toBe("15M+");
  });
});
