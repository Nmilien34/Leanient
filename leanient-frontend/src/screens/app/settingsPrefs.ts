import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Device-local settings prefs (settings redesign): the coach's voice and the
 * photo-day anchor. Local v1 — the coach style feeds copy surfaces client-side
 * until the backend prompt pipeline reads it.
 */
export type CoachStyle = "gentle" | "straight";
export type PhotoDay = "shot_day" | "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";

const STYLE_KEY = "leanient.coachStyle";
const PHOTO_KEY = "leanient.photoDay";

export async function loadCoachStyle(): Promise<CoachStyle> {
  try {
    const raw = await AsyncStorage.getItem(STYLE_KEY);
    return raw === "straight" ? "straight" : "gentle";
  } catch {
    return "gentle";
  }
}

export async function saveCoachStyle(style: CoachStyle): Promise<void> {
  try {
    await AsyncStorage.setItem(STYLE_KEY, style);
  } catch {
    // best-effort
  }
}

export async function loadPhotoDay(): Promise<PhotoDay> {
  try {
    const raw = await AsyncStorage.getItem(PHOTO_KEY);
    return (raw as PhotoDay) ?? "shot_day";
  } catch {
    return "shot_day";
  }
}

export async function savePhotoDay(day: PhotoDay): Promise<void> {
  try {
    await AsyncStorage.setItem(PHOTO_KEY, day);
  } catch {
    // best-effort
  }
}

/** Community channels — replace with the real invite links when created. */
export const COMMUNITY_LINKS = {
  discord: "https://discord.gg/leanient",
  whatsapp: "https://chat.whatsapp.com/leanient",
} as const;
