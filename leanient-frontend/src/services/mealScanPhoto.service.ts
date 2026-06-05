import * as FileSystem from "expo-file-system/legacy";
import type { MealScanImageMimeType, MealScanRequest } from "@leanient/shared";

export function detectMealScanImageMimeType(uri: string): MealScanImageMimeType {
  const normalized = uri.split(/[?#]/)[0]?.toLowerCase() ?? "";
  return normalized.endsWith(".png") ? "image/png" : "image/jpeg";
}

export async function readMealScanImageFromUri(uri: string): Promise<MealScanRequest> {
  const imageData = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    imageData,
    imageMimeType: detectMealScanImageMimeType(uri),
  };
}
