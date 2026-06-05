import type { WeightUnit } from "@leanient/shared";

/**
 * FRONTEND config for the Units screen (28). The app has one unit *system*
 * (imperial/metric) rather than independent per-measure units: the only stored
 * field is `profile.goalWeightUnit`, and height/energy follow it. So the three
 * radio groups all reflect a single `UnitSystem`, seeded from the profile.
 */

export type UnitSystem = "imperial" | "metric";

export interface UnitGroup {
  title: string;
  imperial: string; // label for the imperial option
  metric: string; // label for the metric option
}

export const UNIT_GROUPS: UnitGroup[] = [
  { title: "WEIGHT", imperial: "Pounds (lb)", metric: "Kilograms (kg)" },
  { title: "HEIGHT", imperial: "Feet & inches", metric: "Centimeters" },
  { title: "ENERGY", imperial: "Calories (kcal)", metric: "Kilojoules (kJ)" },
];

export function systemFromWeightUnit(unit: WeightUnit): UnitSystem {
  return unit === "kg" ? "metric" : "imperial";
}

export function weightUnitFromSystem(system: UnitSystem): WeightUnit {
  return system === "metric" ? "kg" : "lb";
}

/**
 * Persist a units-system change: PATCH the profile's `goalWeightUnit`, then run
 * the context refresh so the rest of the app (Home, Progress, etc.) picks up the
 * new unit. Kept as a small pure orchestrator so the network contract is testable
 * without rendering the screen (the optimistic toggle + revert-on-error UI lives
 * in UnitsScreen). Rejection propagates so the caller can revert.
 */
export interface PersistWeightUnitDeps {
  patchProfile(body: { goalWeightUnit: WeightUnit }): Promise<unknown>;
  refresh(): Promise<void>;
}

export async function persistWeightUnit(
  system: UnitSystem,
  deps: PersistWeightUnitDeps,
): Promise<void> {
  await deps.patchProfile({ goalWeightUnit: weightUnitFromSystem(system) });
  await deps.refresh();
}
