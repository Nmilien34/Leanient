import { describe, expect, it } from "vitest";
import { AUTH_PROVIDERS } from "./index";

describe("shared constants", () => {
  it("lists the supported auth providers", () => {
    expect(AUTH_PROVIDERS).toEqual(["google", "apple"]);
  });
});
