import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthResponse, User } from "@leanient/shared";
import { AuthProvider, useAuth, type AuthContextValue } from "../../context/AuthContext";
import { AUTH_STORAGE_KEYS } from "../../services/storage.service";
import { testStorage } from "../testStorage";

const user: User = {
  id: "user_1",
  emailVerified: true,
  onboardingComplete: false,
  authProviders: [],
  hasAvatar: false,
  subscriptionStatus: "free",
  subscriptionWillRenew: false,
  createdAt: "2026-05-29T12:00:00.000Z",
  updatedAt: "2026-05-29T12:00:00.000Z",
};

async function renderAuthHarness(api: {
  signInWithGoogle: (idToken: string) => Promise<AuthResponse>;
  signInWithApple: (body: {
    identityToken: string;
    fullName?: { givenName?: string; familyName?: string };
  }) => Promise<AuthResponse>;
  linkAppleProvider: (body: {
    identityToken: string;
    fullName?: { givenName?: string; familyName?: string };
  }) => Promise<User>;
  logout: () => Promise<void>;
  getMe: () => Promise<User>;
  patchMe: (body: { displayName?: string; avatarUrl?: string }) => Promise<User>;
}) {
  let current: AuthContextValue | undefined;

  function Harness() {
    current = useAuth();
    return null;
  }

  await act(async () => {
    TestRenderer.create(
      <AuthProvider api={api}>
        <Harness />
      </AuthProvider>,
    );
  });

  return {
    value: () => {
      if (!current) {
        throw new Error("Auth context did not render");
      }
      return current;
    },
  };
}

describe("AuthContext", () => {
  beforeEach(() => {
    testStorage.clear();
  });

  it("stores user and token after Google sign-in", async () => {
    const api = {
      signInWithGoogle: vi.fn().mockResolvedValue({ user, token: "token_1" }),
      signInWithApple: vi.fn(),
      linkAppleProvider: vi.fn(),
      logout: vi.fn(),
      getMe: vi.fn(),
      patchMe: vi.fn(),
    };
    const harness = await renderAuthHarness(api);

    await act(async () => {
      await harness.value().signInWithGoogle("google-id-token");
    });

    expect(harness.value().user?.id).toBe("user_1");
    expect(harness.value().token).toBe("token_1");
    expect(testStorage.snapshot()[AUTH_STORAGE_KEYS.token]).toBe("token_1");
  });

  it("clears local auth even when backend logout fails", async () => {
    await testStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
    await testStorage.setItem(AUTH_STORAGE_KEYS.token, "token_1");
    const api = {
      signInWithGoogle: vi.fn(),
      signInWithApple: vi.fn(),
      linkAppleProvider: vi.fn(),
      logout: vi.fn().mockRejectedValue(new Error("network")),
      getMe: vi.fn().mockResolvedValue(user),
      patchMe: vi.fn(),
    };
    const harness = await renderAuthHarness(api);

    await act(async () => {
      await harness.value().logout();
    });

    expect(harness.value().user).toBeNull();
    expect(harness.value().token).toBeNull();
    expect(testStorage.snapshot()).toEqual({});
  });

  it("updates the cached user after linking Apple without replacing the session token", async () => {
    await testStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
    await testStorage.setItem(AUTH_STORAGE_KEYS.token, "token_1");
    const linkedUser: User = {
      ...user,
      authProviders: [
        {
          provider: "google",
          providerUserId: "google_1",
          linkedAt: "2026-06-01T12:00:00.000Z",
        },
        {
          provider: "apple",
          providerUserId: "apple_1",
          linkedAt: "2026-06-10T12:00:00.000Z",
        },
      ],
    };
    const api = {
      signInWithGoogle: vi.fn(),
      signInWithApple: vi.fn(),
      linkAppleProvider: vi.fn().mockResolvedValue(linkedUser),
      logout: vi.fn(),
      getMe: vi.fn().mockResolvedValue(user),
      patchMe: vi.fn(),
    };
    const harness = await renderAuthHarness(api);

    await act(async () => {
      await harness.value().hydrateAuth();
    });

    await act(async () => {
      await harness.value().linkAppleProvider("apple.identity.token", { givenName: "Maya" });
    });

    expect(api.linkAppleProvider).toHaveBeenCalledWith({
      identityToken: "apple.identity.token",
      fullName: { givenName: "Maya" },
    });
    expect(harness.value().user?.authProviders.map((provider) => provider.provider)).toEqual([
      "google",
      "apple",
    ]);
    expect(harness.value().token).toBe("token_1");
    expect(testStorage.snapshot()[AUTH_STORAGE_KEYS.token]).toBe("token_1");
  });
});
