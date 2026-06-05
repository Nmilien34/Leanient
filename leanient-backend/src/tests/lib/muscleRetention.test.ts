import { describe, expect, it } from "vitest";
import { computeMuscleRetentionScore } from "../../lib/muscleRetention";

describe("computeMuscleRetentionScore", () => {
  it("scores perfect protein, training, and conservative pace as keeping muscle", () => {
    const result = computeMuscleRetentionScore({
      proteinAdherence: 1,
      trainingAdherence: 1,
      weeklyWeightLossLb: 0.4,
    });

    expect(result).toEqual({
      proteinScore: 100,
      trainingScore: 100,
      paceScore: 100,
      muscleRetentionScore: 100,
      retentionLabel: "keeping_muscle",
    });
  });

  it("weights missing training below perfect protein", () => {
    const result = computeMuscleRetentionScore({
      proteinAdherence: 1,
      trainingAdherence: 0,
      weeklyWeightLossLb: 1.2,
    });

    expect(result.proteinScore).toBe(100);
    expect(result.trainingScore).toBe(0);
    expect(result.paceScore).toBe(75);
    expect(result.muscleRetentionScore).toBeCloseTo(61.3, 1);
    expect(result.retentionLabel).toBe("maintaining");
  });

  it("weights missing protein more heavily than missing training", () => {
    const result = computeMuscleRetentionScore({
      proteinAdherence: 0,
      trainingAdherence: 1,
      weeklyWeightLossLb: 1.2,
    });

    expect(result.proteinScore).toBe(0);
    expect(result.trainingScore).toBe(100);
    expect(result.paceScore).toBe(75);
    expect(result.muscleRetentionScore).toBeCloseTo(46.3, 1);
    expect(result.retentionLabel).toBe("losing_some");
  });

  it("applies a pace drag for fast weekly loss", () => {
    const result = computeMuscleRetentionScore({
      proteinAdherence: 1,
      trainingAdherence: 1,
      weeklyWeightLossLb: 2.5,
    });

    expect(result.paceScore).toBe(30);
    expect(result.muscleRetentionScore).toBeCloseTo(89.5, 1);
    expect(result.retentionLabel).toBe("keeping_muscle");
  });

  it("scores gained weight as a neutral-to-low pace signal", () => {
    const result = computeMuscleRetentionScore({
      proteinAdherence: 1,
      trainingAdherence: 1,
      weeklyWeightLossLb: -0.5,
    });

    expect(result.paceScore).toBe(60);
    expect(result.muscleRetentionScore).toBeCloseTo(94, 1);
  });

  it("caps protein and training scores at 100", () => {
    const result = computeMuscleRetentionScore({
      proteinAdherence: 1.4,
      trainingAdherence: 1.5,
      weeklyWeightLossLb: 0.8,
    });

    expect(result.proteinScore).toBe(100);
    expect(result.trainingScore).toBe(100);
    expect(result.paceScore).toBe(90);
    expect(result.muscleRetentionScore).toBeCloseTo(98.5, 1);
  });

  it("handles all-zero behavior inputs with gained-weight pace assumption", () => {
    const result = computeMuscleRetentionScore({
      proteinAdherence: 0,
      trainingAdherence: 0,
      weeklyWeightLossLb: -0.1,
    });

    expect(result.proteinScore).toBe(0);
    expect(result.trainingScore).toBe(0);
    expect(result.paceScore).toBe(60);
    expect(result.muscleRetentionScore).toBe(9);
    expect(result.retentionLabel).toBe("losing_muscle");
  });

  it("classifies label thresholds at their boundaries", () => {
    expect(
      computeMuscleRetentionScore({
        proteinAdherence: 0.5,
        trainingAdherence: 1,
        weeklyWeightLossLb: 0,
      }).retentionLabel,
    ).toBe("keeping_muscle");
    expect(
      computeMuscleRetentionScore({
        proteinAdherence: 0.498,
        trainingAdherence: 1,
        weeklyWeightLossLb: 0,
      }).retentionLabel,
    ).toBe("maintaining");
    expect(
      computeMuscleRetentionScore({
        proteinAdherence: 0.2,
        trainingAdherence: 1,
        weeklyWeightLossLb: 0,
      }).retentionLabel,
    ).toBe("maintaining");
    expect(
      computeMuscleRetentionScore({
        proteinAdherence: 0.198,
        trainingAdherence: 1,
        weeklyWeightLossLb: 0,
      }).retentionLabel,
    ).toBe("losing_some");
    expect(
      computeMuscleRetentionScore({
        proteinAdherence: 0.5,
        trainingAdherence: 0,
        weeklyWeightLossLb: 0,
      }).retentionLabel,
    ).toBe("losing_some");
    expect(
      computeMuscleRetentionScore({
        proteinAdherence: 0.498,
        trainingAdherence: 0,
        weeklyWeightLossLb: 0,
      }).retentionLabel,
    ).toBe("losing_muscle");
  });

  it("scores a realistic mid-user in the maintaining range", () => {
    const result = computeMuscleRetentionScore({
      proteinAdherence: 0.8,
      trainingAdherence: 2 / 3,
      weeklyWeightLossLb: 1.2,
    });

    expect(result.muscleRetentionScore).toBeCloseTo(74.6, 1);
    expect(result.retentionLabel).toBe("maintaining");
  });
});
