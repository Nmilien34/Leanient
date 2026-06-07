import { describe, expect, it, vi } from "vitest";
import { createOpenProgressPhotoAction } from "../../screens/app/homeActions";

describe("home actions", () => {
  it("opens progress photo capture from the body photo CTA", () => {
    const openProgressPhoto = vi.fn();

    createOpenProgressPhotoAction(openProgressPhoto)();

    expect(openProgressPhoto).toHaveBeenCalledTimes(1);
  });
});
