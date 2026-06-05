import type { BodyMeasurements, MeasurementUnit } from "@leanient/shared";

/**
 * FRONTEND form logic for the Log Measurement screen (38). Each body measurement
 * is scrubbed by dragging (with a tick), so the form holds a value per field.
 * Fields map 1:1 to the shared `BodyMeasurements` contract.
 * `buildMeasurementLogDraft` produces a `MeasurementLog`-shaped payload, omitting
 * fields left blank.
 */

export type MeasureKey = "waist" | "hip" | "chest" | "arm" | "thigh" | "neck";

export interface MeasureField {
  key: MeasureKey;
  label: string;
  /** Starting value when an empty field is first dragged. */
  fallback: number;
}

export const MEASURE_FIELDS: MeasureField[] = [
  { key: "waist", label: "Waist", fallback: 34 },
  { key: "hip", label: "Hips", fallback: 40 },
  { key: "chest", label: "Chest", fallback: 41 },
  { key: "arm", label: "Arm", fallback: 13 },
  { key: "thigh", label: "Thigh", fallback: 22 },
  { key: "neck", label: "Neck", fallback: 14 },
];

export const MEASURE_STEP: Record<MeasurementUnit, number> = { in: 0.1, cm: 0.5 };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function stepMeasure(value: number, dir: 1 | -1, unit: MeasurementUnit): number {
  return round1(Math.max(0, value + dir * MEASURE_STEP[unit]));
}

export type MeasureState = Record<MeasureKey, number | null>;

export const initialMeasureState: MeasureState = {
  waist: 34,
  hip: 40.5,
  chest: 41,
  arm: 13.2,
  thigh: 22,
  neck: null, // empty → shows "Add"
};

export interface MeasurementLogDraft {
  measurements: BodyMeasurements;
  unit: MeasurementUnit;
  recordedAt: string;
}

export function buildMeasurementLogDraft(state: MeasureState, unit: MeasurementUnit, recordedAt: string): MeasurementLogDraft {
  const measurements: BodyMeasurements = {};
  for (const { key } of MEASURE_FIELDS) {
    const v = state[key];
    if (v != null) measurements[key] = round1(v);
  }
  return { measurements, unit, recordedAt };
}
