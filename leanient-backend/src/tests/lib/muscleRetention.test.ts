import { describe, expect, it } from "vitest";
import {
  composeWeightLoss,
  computeMuscleRetentionScore,
  estimateLeanFractionOfLoss,
} from "../../lib/muscleRetention";

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

describe("estimateLeanFractionOfLoss", () => {
  it("maps a perfect score to the protected floor and a zero score to the ceiling", () => {
    expect(estimateLeanFractionOfLoss(100)).toBeCloseTo(0.12, 4);
    expect(estimateLeanFractionOfLoss(0)).toBeCloseTo(0.4, 4);
    expect(estimateLeanFractionOfLoss(50)).toBeCloseTo(0.26, 4);
  });

  it("clamps out-of-range scores", () => {
    expect(estimateLeanFractionOfLoss(140)).toBeCloseTo(0.12, 4);
    expect(estimateLeanFractionOfLoss(-20)).toBeCloseTo(0.4, 4);
  });
});

describe("composeWeightLoss", () => {
  it("splits cumulative loss with a loss-weighted lean fraction that reconciles to the total", () => {
    const result = composeWeightLoss({
      totalLostLb: 12.4,
      weeklyLosses: [
        { weeklyWeightLossLb: 2.0, muscleRetentionScore: 100 }, // protected, fraction 0.12
        { weeklyWeightLossLb: 2.0, muscleRetentionScore: 0 }, // unprotected, fraction 0.40
      ],
      fallbackScore: 70,
    });

    // Loss-weighted fraction = (2*0.12 + 2*0.40) / 4 = 0.26
    expect(result.estimatedMuscleLostLb).toBeCloseTo(3.2, 1); // 12.4 * 0.26
    expect(result.estimatedFatLostLb).toBeCloseTo(9.2, 1);
    expect(result.estimatedFatLostLb + result.estimatedMuscleLostLb).toBeCloseTo(12.4, 1);
    expect(result.fatShareOfLossPct).toBe(74);
  });

  it("ignores maintenance and gain weeks when weighting", () => {
    const result = composeWeightLoss({
      totalLostLb: 5,
      weeklyLosses: [
        { weeklyWeightLossLb: 1, muscleRetentionScore: 100 }, // 0.12
        { weeklyWeightLossLb: -0.5, muscleRetentionScore: 0 }, // gain, ignored
        { weeklyWeightLossLb: 0, muscleRetentionScore: 0 }, // flat, ignored
      ],
      fallbackScore: 50,
    });
    expect(result.leanFractionOfLoss).toBeCloseTo(0.12, 4);
    expect(result.estimatedMuscleLostLb).toBeCloseTo(0.6, 1);
  });

  it("falls back to the latest score when no week posted a loss", () => {
    const result = composeWeightLoss({
      totalLostLb: 3,
      weeklyLosses: [{ weeklyWeightLossLb: 0, muscleRetentionScore: 100 }],
      fallbackScore: 0, // ceiling fraction 0.40
    });
    expect(result.leanFractionOfLoss).toBeCloseTo(0.4, 4);
    expect(result.estimatedMuscleLostLb).toBeCloseTo(1.2, 1);
  });

  it("returns zeros for no loss", () => {
    const result = composeWeightLoss({ totalLostLb: 0, weeklyLosses: [], fallbackScore: 80 });
    expect(result.estimatedFatLostLb).toBe(0);
    expect(result.estimatedMuscleLostLb).toBe(0);
    expect(result.fatShareOfLossPct).toBe(0);
  });
});
