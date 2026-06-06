import { describe, expect, it, vi } from "vitest";
import { persistMedicationEdit } from "../../screens/app/medicationSettings";
import { mockMedicationProtocol } from "../../mocks/home";

describe("persistMedicationEdit", () => {
  it("patches the protocol with the partial update, then refreshes context", async () => {
    const calls: string[] = [];
    const patchMedicationProtocol = vi.fn(async () => {
      calls.push("patch");
      return mockMedicationProtocol;
    });
    const refresh = vi.fn(async () => {
      calls.push("refresh");
    });

    await persistMedicationEdit(
      { shotDays: ["monday"], doseAmount: 1 },
      { patchMedicationProtocol, refresh },
    );

    expect(patchMedicationProtocol).toHaveBeenCalledWith({ shotDays: ["monday"], doseAmount: 1 });
    // Refresh (the context update mechanism) runs after a successful patch.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(["patch", "refresh"]);
  });

  it("propagates the error and does NOT refresh when the patch fails", async () => {
    const patchMedicationProtocol = vi.fn(async () => {
      throw new Error("boom");
    });
    const refresh = vi.fn(async () => undefined);

    await expect(
      persistMedicationEdit({ shotDays: ["tuesday"] }, { patchMedicationProtocol, refresh }),
    ).rejects.toThrow("boom");
    expect(refresh).not.toHaveBeenCalled();
  });
});
