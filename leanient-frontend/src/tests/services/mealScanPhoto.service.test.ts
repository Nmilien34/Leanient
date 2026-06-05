import { beforeEach, describe, expect, it, vi } from "vitest";

const fileSystemMock = vi.hoisted(() => ({
  readAsStringAsync: vi.fn(),
  EncodingType: {
    Base64: "base64",
  },
}));

vi.mock("expo-file-system/legacy", () => fileSystemMock);

import {
  detectMealScanImageMimeType,
  readMealScanImageFromUri,
} from "../../services/mealScanPhoto.service";

describe("meal scan photo service", () => {
  beforeEach(() => {
    fileSystemMock.readAsStringAsync.mockReset();
  });

  it("detects JPEG meal photos from jpg and jpeg URIs", () => {
    expect(detectMealScanImageMimeType("file:///tmp/plate.jpg")).toBe("image/jpeg");
    expect(detectMealScanImageMimeType("file:///tmp/plate.JPEG?cache=1")).toBe("image/jpeg");
  });

  it("detects PNG meal photos from png URIs", () => {
    expect(detectMealScanImageMimeType("file:///tmp/plate.PNG#preview")).toBe("image/png");
  });

  it("defaults unknown capture extensions to JPEG", () => {
    expect(detectMealScanImageMimeType("file:///tmp/meal")).toBe("image/jpeg");
  });

  it("reads the captured photo as a backend MealScanRequest image payload", async () => {
    fileSystemMock.readAsStringAsync.mockResolvedValueOnce("base64-meal-photo");

    await expect(readMealScanImageFromUri("file:///tmp/plate.png")).resolves.toEqual({
      imageData: "base64-meal-photo",
      imageMimeType: "image/png",
    });

    expect(fileSystemMock.readAsStringAsync).toHaveBeenCalledWith("file:///tmp/plate.png", {
      encoding: "base64",
    });
  });
});
