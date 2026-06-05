type EnergyValue = "good" | "mid" | "low";

interface CheckinLike {
  sideEffects: string[];
}

interface ProfileLike {
  sideEffectBaseline?: string[] | null;
}

const FEEL_FINE = new Set(["feel_fine", "Honestly, I feel fine"]);
const LOW_ENERGY = new Set(["low_energy", "Constant low energy"]);
const FOOD_AVERSION = new Set(["food_aversion", "Food sounds gross most of the time"]);
const ROUGH_SHOT_DAYS = new Set(["rough_shot_days", "Pretty rough on shot days"]);
const LOW_PROTEIN_INTAKE = new Set(["low_protein_intake", "I can barely hit protein"]);

function containsAny(values: Set<string>, sideEffects: Set<string>): boolean {
  return [...values].some((value) => sideEffects.has(value));
}

function deriveEnergyFromValues(values: string[] | null | undefined): EnergyValue | null {
  if (!values) {
    return null;
  }

  // TODO: normalize WeeklyCheckin.sideEffects to a strict enum at the schema level,
  // then remove defensive display-string fallback here.
  const sideEffects = new Set(values);

  if (containsAny(FEEL_FINE, sideEffects)) {
    return "good";
  }

  if (containsAny(LOW_ENERGY, sideEffects) || containsAny(FOOD_AVERSION, sideEffects)) {
    return "low";
  }

  if (containsAny(ROUGH_SHOT_DAYS, sideEffects) && containsAny(LOW_PROTEIN_INTAKE, sideEffects)) {
    return "low";
  }

  return "mid";
}

export function deriveEnergyFromCheckin(
  checkin: CheckinLike | null,
  profile: ProfileLike | null = null,
): EnergyValue | null {
  const checkinEnergy = checkin ? deriveEnergyFromValues(checkin.sideEffects) : null;

  if (checkinEnergy === "good" || checkinEnergy === "low") {
    return checkinEnergy;
  }

  const profileEnergy = profile ? deriveEnergyFromValues(profile.sideEffectBaseline ?? []) : null;

  if (profileEnergy) {
    return profileEnergy;
  }

  return checkinEnergy;
}
