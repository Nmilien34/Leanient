import { describe, expect, it } from "vitest";
import { deriveEnergyFromCheckin } from "../../lib/energy";

function checkin(sideEffects: string[]) {
  return { sideEffects };
}

function profile(sideEffectBaseline: string[]) {
  return { sideEffectBaseline };
}

describe("deriveEnergyFromCheckin", () => {
  it("returns null when there is no check-in", () => {
    expect(deriveEnergyFromCheckin(null)).toBeNull();
  });

  it("treats feel-fine values as good energy", () => {
    expect(deriveEnergyFromCheckin(checkin(["feel_fine"]))).toBe("good");
    expect(deriveEnergyFromCheckin(checkin(["Honestly, I feel fine"]))).toBe("good");
  });

  it("treats low-energy values as low energy", () => {
    expect(deriveEnergyFromCheckin(checkin(["low_energy"]))).toBe("low");
    expect(deriveEnergyFromCheckin(checkin(["Constant low energy"]))).toBe("low");
  });

  it("treats food-aversion values as low energy", () => {
    expect(deriveEnergyFromCheckin(checkin(["food_aversion"]))).toBe("low");
    expect(deriveEnergyFromCheckin(checkin(["Food sounds gross most of the time"]))).toBe("low");
  });

  it("requires shot-day roughness and low protein together for low energy", () => {
    expect(deriveEnergyFromCheckin(checkin(["rough_shot_days", "low_protein_intake"]))).toBe("low");
    expect(
      deriveEnergyFromCheckin(
        checkin(["Pretty rough on shot days", "I can barely hit protein"]),
      ),
    ).toBe("low");
    expect(deriveEnergyFromCheckin(checkin(["rough_shot_days"]))).toBe("mid");
  });

  it("returns mid for empty or unmatched side effects", () => {
    expect(deriveEnergyFromCheckin(checkin([]))).toBe("mid");
    expect(deriveEnergyFromCheckin(checkin(["side_effect_worry"]))).toBe("mid");
  });

  it("keeps feel-fine as the highest-priority signal when co-selected", () => {
    expect(deriveEnergyFromCheckin(checkin(["feel_fine", "low_energy"]))).toBe("good");
  });

  it("falls back to profile baseline when there is no check-in and baseline has low energy", () => {
    expect(deriveEnergyFromCheckin(null, profile(["Constant low energy"]))).toBe("low");
  });

  it("falls back to profile baseline when there is no check-in and baseline has feel-fine", () => {
    expect(deriveEnergyFromCheckin(null, profile(["Honestly, I feel fine"]))).toBe("good");
  });

  it("returns mid when there is no check-in and the profile baseline is empty", () => {
    expect(deriveEnergyFromCheckin(null, profile([]))).toBe("mid");
  });

  it("keeps strong check-in signals ahead of contrary profile baseline values", () => {
    expect(deriveEnergyFromCheckin(checkin(["low_energy"]), profile(["Honestly, I feel fine"]))).toBe(
      "low",
    );
  });

  it("falls back to profile baseline when check-in signal is only mid", () => {
    expect(deriveEnergyFromCheckin(checkin(["rough_shot_days"]), profile(["low_energy"]))).toBe(
      "low",
    );
  });
});
