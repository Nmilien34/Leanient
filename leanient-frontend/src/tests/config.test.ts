import { describe, expect, it } from "vitest";
import { APP_NAME } from "../config";

describe("frontend config", () => {
  it("exposes the app name", () => {
    expect(APP_NAME).toBe("Leanient");
  });
});
