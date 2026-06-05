/**
 * Geist font registry. Pass `fontAssets` to expo-font's useFonts(), and use
 * the `font.*` family names in styles. Matches the prototype's Geist weights.
 */
import {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} from "@expo-google-fonts/geist";

export const fontAssets = {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
  Geist_800ExtraBold,
} as const;

export const font = {
  light: "Geist_300Light",
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  bold: "Geist_700Bold",
  extrabold: "Geist_800ExtraBold",
} as const;
