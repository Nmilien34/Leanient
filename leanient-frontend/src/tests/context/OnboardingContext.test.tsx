import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

// Mock the API singleton so submit() doesn't hit the network. vi.hoisted keeps
// the spy referenceable from the hoisted vi.mock factory.
const { completeOnboarding } = vi.hoisted(() => ({ completeOnboarding: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("../../services/api.service", () => ({ default: { completeOnboarding } }));

import { OnboardingProvider, useOnboarding, type OnboardingContextValue } from "../../context/OnboardingContext";

async function renderOnboardingHarness() {
  let current: OnboardingContextValue | undefined;
  function Harness() {
    current = useOnboarding();
    return null;
  }
  await act(async () => {
    TestRenderer.create(
      <OnboardingProvider>
        <Harness />
      </OnboardingProvider>,
    );
  });
  return () => {
    if (!current) throw new Error("Onboarding context did not render");
    return current;
  };
}

describe("OnboardingContext.submit", () => {
  it("POSTs the assembled draft to completeOnboarding", async () => {
    const ctx = await renderOnboardingHarness();

    await act(async () => {
      ctx().setProfile({
        journeyStage: "active_loss",
        goalWeight: 172,
        goalWeightUnit: "lb",
        goalPace: "steady",
        biggestFear: "losing_muscle",
        trainingStatus: "consistent",
      });
      ctx().setMedication({ medicationName: "Wegovy", doseUnit: "mg", shotDay: "sunday", startDate: "2026-04-20" });
      ctx().setInitialWeight({ value: 198, unit: "lb" });
      // Biological inputs are required at submit (backend computes targets from them).
      ctx().setBasics({ sexAssignedAtBirth: "female", age: 34, heightValue: 66, heightUnit: "in" });
    });

    await act(async () => {
      await ctx().submit();
    });

    expect(completeOnboarding).toHaveBeenCalledTimes(1);
    expect(completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({ journeyStage: "active_loss", goalWeight: 172 }),
        medicationProtocol: expect.objectContaining({ medicationName: "Wegovy", shotDay: "sunday" }),
        initialWeight: expect.objectContaining({ value: 198, unit: "lb" }),
      }),
    );
  });
});
