import type { ProgressPhoto } from "@leanient/shared";

const STAMP = "2026-06-01T12:00:00.000Z";

/** Uploaded progress photos (typed fixture), used by the Privacy screen preview. */
export const mockProgressPhotos: ProgressPhoto[] = [
  { id: "pp_wk6", userId: "user_demo", captureDate: "2026-05-30", s3Key: "demo/wk6.jpg", contentType: "image/jpeg", status: "uploaded", kind: "body", createdAt: STAMP, updatedAt: STAMP },
  { id: "pp_wk4", userId: "user_demo", captureDate: "2026-05-16", s3Key: "demo/wk4.jpg", contentType: "image/jpeg", status: "uploaded", kind: "body", createdAt: STAMP, updatedAt: STAMP },
  { id: "pp_wk2", userId: "user_demo", captureDate: "2026-05-02", s3Key: "demo/wk2.jpg", contentType: "image/jpeg", status: "uploaded", kind: "body", createdAt: STAMP, updatedAt: STAMP },
  { id: "fc_wk6", userId: "user_demo", captureDate: "2026-05-30", s3Key: "demo/face6.jpg", contentType: "image/jpeg", status: "uploaded", kind: "face", faceFullness: 4, createdAt: STAMP, updatedAt: STAMP },
  { id: "fc_wk2", userId: "user_demo", captureDate: "2026-05-02", s3Key: "demo/face2.jpg", contentType: "image/jpeg", status: "uploaded", kind: "face", faceFullness: 3, createdAt: STAMP, updatedAt: STAMP },
];
