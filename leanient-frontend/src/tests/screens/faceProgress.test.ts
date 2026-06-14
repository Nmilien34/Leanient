import { describe, expect, it } from "vitest";
import type { ProgressPhoto } from "@leanient/shared";
import { buildFaceProgress } from "../../screens/app/faceProgress";
import { faceFullnessLabel } from "../../screens/app/progressPhotoMeta";

const STAMP = "2026-06-01T12:00:00.000Z";

function photo(overrides: Partial<ProgressPhoto>): ProgressPhoto {
  return {
    id: "p",
    userId: "u",
    captureDate: "2026-05-01",
    s3Key: "k",
    contentType: "image/jpeg",
    status: "uploaded",
    kind: "body",
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

// Week 1 starts 2026-04-01; each captureDate maps to a week number from there.
const weekOf = (captureDate: string): number => {
  const start = new Date("2026-04-01T00:00:00").getTime();
  const d = new Date(`${captureDate}T00:00:00`).getTime();
  return Math.floor((d - start) / (7 * 86_400_000)) + 1;
};

describe("faceFullnessLabel", () => {
  it("labels the 1-5 scale and ignores unrated", () => {
    expect(faceFullnessLabel(1)).toBe("Hollow");
    expect(faceFullnessLabel(5)).toBe("Very full");
    expect(faceFullnessLabel(undefined)).toBeNull();
  });
});

describe("buildFaceProgress", () => {
  it("returns null when there are no face checks", () => {
    expect(buildFaceProgress([], weekOf)).toBeNull();
    expect(buildFaceProgress([photo({ kind: "body" })], weekOf)).toBeNull();
  });

  it("lists face checks newest-first with week + fullness labels, ignoring body photos", () => {
    const view = buildFaceProgress(
      [
        photo({ id: "body", kind: "body", captureDate: "2026-05-20" }),
        photo({ id: "f1", kind: "face", captureDate: "2026-04-15", faceFullness: 3 }),
        photo({ id: "f2", kind: "face", captureDate: "2026-05-20", faceFullness: 4 }),
      ],
      weekOf,
    );
    expect(view).not.toBeNull();
    expect(view!.photos.map((p) => p.id)).toEqual(["f2", "f1"]); // newest first
    expect(view!.photos[0]).toMatchObject({ weekLabel: "Wk 8", fullnessLabel: "Fuller" });
    expect(view!.latestFullness).toBe(4);
  });

  it("reads a rising trend from the oldest rated check to the newest", () => {
    const rising = buildFaceProgress(
      [
        photo({ id: "f1", kind: "face", captureDate: "2026-04-15", faceFullness: 2 }),
        photo({ id: "f2", kind: "face", captureDate: "2026-05-20", faceFullness: 4 }),
      ],
      weekOf,
    );
    expect(rising!.trend).toContain("fuller");

    const falling = buildFaceProgress(
      [
        photo({ id: "f1", kind: "face", captureDate: "2026-04-15", faceFullness: 4 }),
        photo({ id: "f2", kind: "face", captureDate: "2026-05-20", faceFullness: 2 }),
      ],
      weekOf,
    );
    expect(falling!.trend).toContain("thinner");

    const single = buildFaceProgress([photo({ kind: "face", faceFullness: 3 })], weekOf);
    expect(single!.trend).toContain("One check");
  });
});
