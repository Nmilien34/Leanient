import { describe, expect, it, vi } from "vitest";
import { runAppleSignIn, shouldRenderAppleSignIn } from "../../screens/appleSignIn";

const scopes = {
  FULL_NAME: 0,
  EMAIL: 1,
} as const;

describe("Apple Sign-In orchestration", () => {
  it("renders only on iOS", () => {
    expect(shouldRenderAppleSignIn("ios")).toBe(true);
    expect(shouldRenderAppleSignIn("android")).toBe(false);
    expect(shouldRenderAppleSignIn("web")).toBe(false);
  });

  it("requests Apple identity scopes and signs in with the backend", async () => {
    const signInAsync = vi.fn().mockResolvedValue({
      identityToken: "apple.identity.token",
      fullName: {
        givenName: "Maya",
        familyName: "Stone",
      },
    });
    const signInWithApple = vi.fn().mockResolvedValue(undefined);

    const result = await runAppleSignIn({
      appleAuth: { AppleAuthenticationScope: scopes, signInAsync },
      signInWithApple,
    });

    expect(result).toBe("signed_in");
    expect(signInAsync).toHaveBeenCalledWith({
      requestedScopes: [scopes.FULL_NAME, scopes.EMAIL],
    });
    expect(signInWithApple).toHaveBeenCalledWith("apple.identity.token", {
      givenName: "Maya",
      familyName: "Stone",
    });
  });

  it("silently returns when the user cancels Apple's native sheet", async () => {
    const signInAsync = vi.fn().mockRejectedValue(Object.assign(new Error("cancelled"), { code: "ERR_REQUEST_CANCELED" }));
    const signInWithApple = vi.fn();

    const result = await runAppleSignIn({
      appleAuth: { AppleAuthenticationScope: scopes, signInAsync },
      signInWithApple,
    });

    expect(result).toBe("cancelled");
    expect(signInWithApple).not.toHaveBeenCalled();
  });

  it("throws when Apple does not return an identity token", async () => {
    const signInAsync = vi.fn().mockResolvedValue({ identityToken: null });
    const signInWithApple = vi.fn();

    await expect(
      runAppleSignIn({
        appleAuth: { AppleAuthenticationScope: scopes, signInAsync },
        signInWithApple,
      }),
    ).rejects.toThrow("Apple did not return a sign-in token.");
    expect(signInWithApple).not.toHaveBeenCalled();
  });
});
