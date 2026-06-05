import { describe, expect, it, vi } from "vitest";
import { persistAccountEdit } from "../../screens/app/accountSettings";
import { mockUser } from "../../mocks/user";

describe("persistAccountEdit", () => {
  it("patches /me with the update, then applies the returned user to auth", async () => {
    const updatedUser = { ...mockUser, displayName: "Avery Stone" };
    const calls: string[] = [];
    const patchMe = vi.fn(async () => {
      calls.push("patch");
      return updatedUser;
    });
    const applyUser = vi.fn(async () => {
      calls.push("apply");
    });

    const result = await persistAccountEdit({ displayName: "Avery Stone" }, { patchMe, applyUser });

    expect(patchMe).toHaveBeenCalledWith({ displayName: "Avery Stone" });
    // The auth user is updated with the server's response, after the patch.
    expect(applyUser).toHaveBeenCalledWith(updatedUser);
    expect(calls).toEqual(["patch", "apply"]);
    expect(result).toBe(updatedUser);
  });

  it("propagates the error and does NOT touch auth when the patch fails", async () => {
    const patchMe = vi.fn(async () => {
      throw new Error("network down");
    });
    const applyUser = vi.fn(async () => undefined);

    await expect(
      persistAccountEdit({ displayName: "Avery Stone" }, { patchMe, applyUser }),
    ).rejects.toThrow("network down");
    expect(applyUser).not.toHaveBeenCalled();
  });
});
