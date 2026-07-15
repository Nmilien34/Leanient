import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthResponse, User } from "@leanient/shared";
import { AuthProvider, useAuth, type AuthContextValue } from "../../context/AuthContext";
import { AUTH_STORAGE_KEYS } from "../../services/storage.service";
import { testStorage } from "../testStorage";

const appsFlyerServiceMock = vi.hoisted(() => ({
  initialize: vi.fn().mockResolvedValue(true),
  getAppsFlyerUID: vi.fn().mockResolvedValue("af-user-1"),
  setCustomerUserId: vi.fn().mockResolvedValue(undefined),
  logCompleteRegistration: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/appsflyer.service", () => ({
  default: appsFlyerServiceMock,
}));

const revenueCatServiceMock = vi.hoisted(() => ({
  configure: vi.fn().mockResolvedValue(true),
  logOut: vi.fn().mockResolvedValue(undefined),
  syncAppsFlyerAttribution: vi.fn().mockResolvedValue(undefined),
  syncSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/revenueCat.service", () => ({
  default: revenueCatServiceMock,
}));

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
    (globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = true;
    testStorage.clear();
    appsFlyerServiceMock.initialize.mockClear();
    appsFlyerServiceMock.getAppsFlyerUID.mockClear();
    appsFlyerServiceMock.setCustomerUserId.mockClear();
    appsFlyerServiceMock.logCompleteRegistration.mockClear();
    revenueCatServiceMock.configure.mockClear();
    revenueCatServiceMock.logOut.mockClear();
    revenueCatServiceMock.syncAppsFlyerAttribution.mockClear();
    revenueCatServiceMock.syncSubscriptionStatus.mockClear();
  });

  it("configures RevenueCat anonymously without restoring purchases when no session is restored", async () => {
    const api = {
      signInWithGoogle: vi.fn(),
      signInWithApple: vi.fn(),
      linkAppleProvider: vi.fn(),
      logout: vi.fn(),
      getMe: vi.fn(),
      patchMe: vi.fn(),
    };

    await renderAuthHarness(api);
    await act(async () => {
      await Promise.resolve();
    });

    expect(appsFlyerServiceMock.initialize).toHaveBeenCalledWith();
    expect(revenueCatServiceMock.configure).toHaveBeenCalledWith(undefined);
    expect(revenueCatServiceMock.syncSubscriptionStatus).not.toHaveBeenCalled();
  });

  it("stores user and token after Google sign-in", async () => {
    const api = {
      signInWithGoogle: vi.fn().mockResolvedValue({ user, token: "token_1", isNewUser: false }),
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

  it("waits for RevenueCat login before exposing the authenticated user after sign-in", async () => {
    let resolveRevenueCatConfigure: (configured: boolean) => void = () => undefined;
    const revenueCatConfigure = new Promise<boolean>((resolve) => {
      resolveRevenueCatConfigure = resolve;
    });
    const api = {
      signInWithGoogle: vi.fn().mockResolvedValue({ user, token: "token_1", isNewUser: false }),
      signInWithApple: vi.fn(),
      linkAppleProvider: vi.fn(),
      logout: vi.fn(),
      getMe: vi.fn(),
      patchMe: vi.fn(),
    };
    const harness = await renderAuthHarness(api);
    revenueCatServiceMock.configure.mockClear();
    revenueCatServiceMock.configure.mockReturnValueOnce(revenueCatConfigure);

    const signInPromise = harness.value().signInWithGoogle("google-id-token");
    await act(async () => {
      await Promise.resolve();
    });

    expect(revenueCatServiceMock.configure).toHaveBeenCalledWith("user_1");
    expect(harness.value().user).toBeNull();

    resolveRevenueCatConfigure(true);
    await act(async () => {
      await signInPromise;
    });

    expect(harness.value().user?.id).toBe("user_1");
  });

  it("logs AppsFlyer registration only when auth confirms a new user", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const api = {
      signInWithGoogle: vi.fn().mockResolvedValue({ user, token: "token_1", isNewUser: true }),
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

    expect(appsFlyerServiceMock.initialize).toHaveBeenCalledWith("user_1");
    expect(appsFlyerServiceMock.logCompleteRegistration).toHaveBeenCalledWith({
      method: "google",
    });
    expect(log).toHaveBeenCalledWith("[Attribution Debug][temporary] Auth isNewUser flag for google:", true);
    expect(log).toHaveBeenCalledWith("[Attribution Debug][temporary] af_complete_registration sent for google.");
    log.mockRestore();
  });

  it("warns in dev when a confirmed registration event cannot be sent", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    appsFlyerServiceMock.logCompleteRegistration.mockRejectedValueOnce(new Error("appsflyer down"));
    const api = {
      signInWithGoogle: vi.fn().mockResolvedValue({ user, token: "token_1", isNewUser: true }),
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

    expect(appsFlyerServiceMock.logCompleteRegistration).toHaveBeenCalledWith({
      method: "google",
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("af_complete_registration"),
      expect.any(Error),
    );
    warn.mockRestore();
  });

  it("does not log AppsFlyer registration for returning users", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const api = {
      signInWithGoogle: vi.fn().mockResolvedValue({ user, token: "token_1", isNewUser: false }),
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

    expect(appsFlyerServiceMock.initialize).toHaveBeenCalledWith("user_1");
    expect(appsFlyerServiceMock.logCompleteRegistration).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[Attribution Debug][temporary] Auth isNewUser flag for google:", false);
    log.mockRestore();
  });

  it("fails closed when auth responses do not include the new-user flag", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
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

    expect(appsFlyerServiceMock.logCompleteRegistration).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("isNewUser"));
    warn.mockRestore();
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
    expect(revenueCatServiceMock.logOut).toHaveBeenCalledTimes(1);
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
