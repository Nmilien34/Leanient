import { describe, expect, it, vi } from "vitest";
import {
  UNIT_GROUPS,
  persistWeightUnit,
  systemFromWeightUnit,
  weightUnitFromSystem,
} from "../../screens/app/unitSettings";

describe("unitSettings", () => {
  it("derives the system from the profile's weight unit", () => {
    expect(systemFromWeightUnit("lb")).toBe("imperial");
    expect(systemFromWeightUnit("kg")).toBe("metric");
  });

  it("round-trips system back to a weight unit", () => {
    expect(weightUnitFromSystem("imperial")).toBe("lb");
    expect(weightUnitFromSystem("metric")).toBe("kg");
  });

  it("exposes weight / height / energy groups with both options", () => {
    expect(UNIT_GROUPS.map((g) => g.title)).toEqual(["WEIGHT", "HEIGHT", "ENERGY"]);
    for (const g of UNIT_GROUPS) {
      expect(g.imperial.length).toBeGreaterThan(0);
      expect(g.metric.length).toBeGreaterThan(0);
    }
  });
});

describe("persistWeightUnit", () => {
  it("patches the profile with the mapped weight unit, then refreshes context", async () => {
    const calls: string[] = [];
    const patchProfile = vi.fn(async () => {
      calls.push("patch");
    });
    const refresh = vi.fn(async () => {
      calls.push("refresh");
    });

    await persistWeightUnit("metric", { patchProfile, refresh });

    expect(patchProfile).toHaveBeenCalledWith({ goalWeightUnit: "kg" });
    // Refresh (the context update mechanism) runs after a successful patch.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["patch", "refresh"]);
  });

  it("maps imperial back to lb", async () => {
    const patchProfile = vi.fn(async () => undefined);
    const refresh = vi.fn(async () => undefined);

    await persistWeightUnit("imperial", { patchProfile, refresh });

    expect(patchProfile).toHaveBeenCalledWith({ goalWeightUnit: "lb" });
  });

  it("propagates the error and does NOT refresh when the patch fails", async () => {
    const patchProfile = vi.fn(async () => {
      throw new Error("network down");
    });
    const refresh = vi.fn(async () => undefined);

    await expect(persistWeightUnit("metric", { patchProfile, refresh })).rejects.toThrow("network down");
    // No context refresh on failure; the caller reverts its optimistic toggle.
    expect(refresh).not.toHaveBeenCalled();
  });
});
