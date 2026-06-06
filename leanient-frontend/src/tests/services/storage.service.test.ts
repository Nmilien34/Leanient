import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_STORAGE_KEYS,
  clearAuthStorage,
  getStoredAuthToken,
  getStoredUser,
  setStoredAuth,
} from "../../services/storage.service";
import { testStorage } from "../testStorage";

describe("storage service", () => {
  beforeEach(() => {
    testStorage.clear();
  });

  it("stores auth using versioned Leanient keys", async () => {
    await setStoredAuth(
      {
        id: "user_1",
        emailVerified: true,
        onboardingComplete: false,
        authProviders: [],
        hasAvatar: false,
        subscriptionStatus: "free",
        subscriptionWillRenew: false,
        createdAt: "2026-05-29T12:00:00.000Z",
        updatedAt: "2026-05-29T12:00:00.000Z",
      },
      "session-token",
    );

    expect(testStorage.snapshot()).toMatchObject({
      [AUTH_STORAGE_KEYS.user]: expect.stringContaining("user_1"),
      [AUTH_STORAGE_KEYS.token]: "session-token",
    });
    await expect(getStoredAuthToken()).resolves.toBe("session-token");
    await expect(getStoredUser()).resolves.toMatchObject({ id: "user_1" });
  });

  it("clears stored auth in one operation", async () => {
    await testStorage.setItem(AUTH_STORAGE_KEYS.user, "{}");
    await testStorage.setItem(AUTH_STORAGE_KEYS.token, "token");

    await clearAuthStorage();

    expect(testStorage.snapshot()).toEqual({});
  });
});
