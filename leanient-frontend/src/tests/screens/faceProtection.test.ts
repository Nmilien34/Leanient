import { describe, expect, it } from "vitest";
import type { MuscleRetentionSnapshot } from "@leanient/shared";
import { buildFaceProtectionSignal } from "../../screens/app/faceProtection";

function snap(
  weekOf: string,
  proteinScore: number,
  paceScore: number,
): Pick<MuscleRetentionSnapshot, "proteinScore" | "paceScore" | "weekOf"> {
  return { weekOf, proteinScore, paceScore };
}

describe("buildFaceProtectionSignal", () => {
  it("returns null without any snapshots", () => {
    expect(buildFaceProtectionSignal([])).toBeNull();
  });

  it("reads strong protection from high protein and a steady pace", () => {
    const s = buildFaceProtectionSignal([snap("2026-06-01T00:00:00.000Z", 90, 90)])!;
    expect(s.score).toBe(90); // 0.6*90 + 0.4*90
    expect(s.label).toBe("strong");
    expect(s.weakFactor).toBeNull();
    expect(s.headline).toBe("Your face is well protected");
  });

  it("blames protein and nudges toward collagen when protein is the weak lever", () => {
    const s = buildFaceProtectionSignal([snap("2026-06-01T00:00:00.000Z", 55, 90)])!;
    expect(s.score).toBe(69); // 0.6*55 + 0.4*90
    expect(s.label).toBe("fair");
    expect(s.weakFactor).toBe("protein");
    expect(s.line).toContain("collagen");
  });

  it("blames pace when protein is fine but loss is fast", () => {
    const s = buildFaceProtectionSignal([snap("2026-06-01T00:00:00.000Z", 88, 40)])!;
    expect(s.score).toBe(69); // 0.6*88 + 0.4*40
    expect(s.label).toBe("fair");
    expect(s.weakFactor).toBe("pace");
    expect(s.line).toContain("gentler pace");
  });

  it("reads at-risk when both levers are low", () => {
    const s = buildFaceProtectionSignal([snap("2026-06-01T00:00:00.000Z", 60, 30)])!;
    expect(s.score).toBe(48); // 0.6*60 + 0.4*30
    expect(s.label).toBe("at_risk");
    expect(s.weakFactor).toBe("pace"); // pace is the lower factor
  });

  it("averages only the most recent weeks", () => {
    const s = buildFaceProtectionSignal([
      snap("2026-04-01T00:00:00.000Z", 30, 30), // old, dropped from the window
      snap("2026-05-04T00:00:00.000Z", 90, 90),
      snap("2026-05-11T00:00:00.000Z", 90, 90),
      snap("2026-05-18T00:00:00.000Z", 90, 90),
      snap("2026-05-25T00:00:00.000Z", 90, 90),
    ])!;
    expect(s.proteinScore).toBe(90);
    expect(s.label).toBe("strong");
  });
});
