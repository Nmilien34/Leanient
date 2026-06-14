import type { ProgressPhoto } from "@leanient/shared";
import { faceFullnessLabel } from "./progressPhotoMeta";

/**
 * FRONTEND-ONLY view model for the Progress tab "Face progress" timeline. Splits
 * the face checks out of the photo list, labels each with its week and self-rated
 * fullness, and reads a one-line trend from the rated checks so the user sees
 * whether their face is holding (the honest, no-AI Ozempic-face signal).
 */

export interface FaceProgressPhoto {
  id: string;
  viewUrl?: string;
  weekLabel: string;
  fullnessLabel: string | null;
}

export interface FaceProgressView {
  /** Newest first, to match the body photo strip. */
  photos: FaceProgressPhoto[];
  latestFullness: number | null;
  trend: string | null;
}

export function buildFaceProgress(
  photos: ProgressPhoto[],
  weekOf: (captureDate: string) => number | null,
): FaceProgressView | null {
  const face = photos.filter((photo) => photo.kind === "face");
  if (face.length === 0) return null;

  const newestFirst = [...face].sort((a, b) => (a.captureDate < b.captureDate ? 1 : -1));
  const view: FaceProgressPhoto[] = newestFirst.map((photo) => {
    const wk = weekOf(photo.captureDate);
    return {
      id: photo.id,
      viewUrl: photo.viewUrl,
      weekLabel: wk != null ? `Wk ${wk}` : "Face",
      fullnessLabel: faceFullnessLabel(photo.faceFullness),
    };
  });

  const rated = face
    .filter((photo) => photo.faceFullness != null)
    .sort((a, b) => (a.captureDate < b.captureDate ? -1 : 1));
  const latestFullness = rated.length ? (rated[rated.length - 1].faceFullness ?? null) : null;

  let trend: string | null = null;
  if (rated.length >= 2) {
    const first = rated[0].faceFullness ?? 0;
    const last = rated[rated.length - 1].faceFullness ?? 0;
    if (last > first) trend = "Reading fuller than your first check. Your protein is protecting it.";
    else if (last === first) trend = "Fullness holding steady. Keep the protein up.";
    else trend = "Reading a little thinner. More protein and a gentler pace help your face hold.";
  } else if (rated.length === 1) {
    trend = "One check logged. A few weeks of these will show the trend.";
  }

  return { photos: view, latestFullness, trend };
}
