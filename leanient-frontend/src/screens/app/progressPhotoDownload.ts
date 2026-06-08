import type { ProgressPhoto } from "@leanient/shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface ProgressPhotoShareContent {
  title: string;
  message: string;
  url: string;
}

export function progressPhotoDisplayLabel(photo: Pick<ProgressPhoto, "captureDate">): string {
  const [year, month, day] = photo.captureDate.split("-").map((part) => Number(part));
  const monthLabel = MONTHS[month - 1];

  if (!year || !monthLabel || !day) {
    return photo.captureDate;
  }

  return `${monthLabel} ${day}, ${year}`;
}

export function getProgressPhotoOpenUrl(photo: Pick<ProgressPhoto, "viewUrl">): string | null {
  const url = photo.viewUrl?.trim();
  return url ? url : null;
}

export function buildProgressPhotoShareContent(
  photo: Pick<ProgressPhoto, "captureDate" | "viewUrl">,
): ProgressPhotoShareContent | null {
  const url = getProgressPhotoOpenUrl(photo);
  if (!url) return null;

  const label = progressPhotoDisplayLabel(photo);

  return {
    title: `Leanient progress photo ${label}`,
    message: `Progress photo from ${label}: ${url}`,
    url,
  };
}
