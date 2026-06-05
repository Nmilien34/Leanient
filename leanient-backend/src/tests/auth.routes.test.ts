import type { AuthProvider, SubscriptionStatus } from "@leanient/shared";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderIdentity } from "../auth/identity";

interface MockLinkedAuthProvider {
  provider: AuthProvider;
  providerUserId: string;
  linkedAt: Date;
}

interface MockUserInit {
  email?: string;
  emailVerified?: boolean;
  onboardingComplete?: boolean;
  authProviders?: MockLinkedAuthProvider[];
  displayName?: string;
  avatarUrl?: string;
}

interface MockUserDocument {
  _id: {
    toString: () => string;
  };
  email?: string;
  emailVerified: boolean;
  onboardingComplete: boolean;
  authProviders: MockLinkedAuthProvider[];
  displayName?: string;
  avatarUrl?: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionWillRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<MockUserDocument>;
}

interface ProviderLookupQuery {
  authProviders: {
    $elemMatch: {
      provider: AuthProvider;
      providerUserId: string;
    };
  };
}

interface EmailLookupQuery {
  email: string;
  emailVerified?: boolean;
}

type MockFindOneQuery = ProviderLookupQuery | EmailLookupQuery;

const verifierMocks = vi.hoisted(() => ({
  verifyGoogleIdToken: vi.fn(),
  verifyAppleIdentityToken: vi.fn(),
  isAppleSignInAvailable: vi.fn(() => true),
}));

const userModelMock = vi.hoisted(() => {
  let nextId = 1;
  const users: MockUserDocument[] = [];

  function createUserDocument(init: MockUserInit): MockUserDocument {
    const id = `user_${nextId}`;
    const user: MockUserDocument = {
      _id: {
        toString: () => id,
      },
      email: init.email,
      emailVerified: init.emailVerified ?? false,
      onboardingComplete: init.onboardingComplete ?? false,
      authProviders: init.authProviders ? [...init.authProviders] : [],
      displayName: init.displayName,
      avatarUrl: init.avatarUrl,
      subscriptionStatus: "free",
      subscriptionWillRenew: false,
      createdAt: new Date("2026-06-01T12:00:00.000Z"),
      updatedAt: new Date("2026-06-01T12:00:00.000Z"),
      save: async () => user,
    };

    nextId += 1;
    users.push(user);
    return user;
  }

  async function findOne(query: MockFindOneQuery): Promise<MockUserDocument | null> {
    if ("email" in query) {
      return (
        users.find((user) => {
          return (
            user.email === query.email &&
            (query.emailVerified === undefined || user.emailVerified === query.emailVerified)
          );
        }) ?? null
      );
    }

    const providerMatch = query.authProviders.$elemMatch;
    return (
      users.find((user) => {
        return user.authProviders.some((authProvider) => {
          return (
            authProvider.provider === providerMatch.provider &&
            authProvider.providerUserId === providerMatch.providerUserId
          );
        });
      }) ?? null
    );
  }

  function MockUserModel(init: MockUserInit): MockUserDocument {
    return createUserDocument(init);
  }

  return {
    users,
    UserModel: Object.assign(MockUserModel, { findOne }),
    createUserDocument,
    reset: () => {
      nextId = 1;
      users.splice(0, users.length);
    },
  };
});

vi.mock("../auth/google", () => ({
  verifyGoogleIdToken: verifierMocks.verifyGoogleIdToken,
}));

vi.mock("../auth/apple", () => ({
  isAppleSignInAvailable: verifierMocks.isAppleSignInAvailable,
  verifyAppleIdentityToken: verifierMocks.verifyAppleIdentityToken,
}));

vi.mock("../models/user.model", () => ({
  UserModel: userModelMock.UserModel,
}));

import { createApp } from "../server";

function makeIdentity(overrides: Partial<ProviderIdentity> = {}): ProviderIdentity {
  return {
    provider: "google",
    providerUserId: "google_1",
    email: "nick@gmail.com",
    emailVerified: true,
    name: "Nick",
    picture: "https://example.com/avatar.png",
    ...overrides,
  };
}

function makeLinkedProvider(
  provider: AuthProvider,
  providerUserId: string,
): MockLinkedAuthProvider {
  return {
    provider,
    providerUserId,
    linkedAt: new Date("2026-05-01T12:00:00.000Z"),
  };
}

describe("auth routes", () => {
  let app: Express;

  beforeEach(() => {
    userModelMock.reset();
    verifierMocks.verifyGoogleIdToken.mockReset();
    verifierMocks.verifyAppleIdentityToken.mockReset();
    verifierMocks.isAppleSignInAvailable.mockReset();
    verifierMocks.isAppleSignInAvailable.mockReturnValue(true);
    app = createApp({ healthCheck: async () => true });
  });

  it("creates a user from a verified Google token", async () => {
    verifierMocks.verifyGoogleIdToken.mockResolvedValue(makeIdentity());

    const response = await request(app).post("/auth/google").send({
      idToken: "verified-google-token",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      email: "nick@gmail.com",
      emailVerified: true,
      onboardingComplete: false,
      authProviders: [
        {
          provider: "google",
          providerUserId: "google_1",
        },
      ],
    });
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(userModelMock.users).toHaveLength(1);
  });

  it("returns onboardingComplete true for an existing completed user", async () => {
    userModelMock.createUserDocument({
      email: "nick@gmail.com",
      emailVerified: true,
      onboardingComplete: true,
      authProviders: [makeLinkedProvider("google", "google_1")],
    });
    verifierMocks.verifyGoogleIdToken.mockResolvedValue(makeIdentity());

    const response = await request(app).post("/auth/google").send({
      idToken: "completed-google-token",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      email: "nick@gmail.com",
      onboardingComplete: true,
    });
  });

  it("creates a separate user from an unverified Google token without linking by email", async () => {
    const existingUser = userModelMock.createUserDocument({
      email: "nick@gmail.com",
      emailVerified: true,
      authProviders: [makeLinkedProvider("apple", "apple_1")],
    });
    verifierMocks.verifyGoogleIdToken.mockResolvedValue(
      makeIdentity({
        providerUserId: "google_unverified",
        emailVerified: false,
      }),
    );

    const response = await request(app).post("/auth/google").send({
      idToken: "unverified-google-token",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).not.toBe(existingUser._id.toString());
    expect(response.body.data.user).toMatchObject({
      email: "nick@gmail.com",
      emailVerified: false,
      authProviders: [
        {
          provider: "google",
          providerUserId: "google_unverified",
        },
      ],
    });
    expect(existingUser.authProviders).toHaveLength(1);
    expect(userModelMock.users).toHaveLength(2);
  });

  it("creates a user from an Apple token with a verified email", async () => {
    verifierMocks.verifyAppleIdentityToken.mockResolvedValue(
      makeIdentity({
        provider: "apple",
        providerUserId: "apple_1",
        email: "abc123@privaterelay.appleid.com",
        emailVerified: true,
        name: undefined,
        picture: undefined,
      }),
    );

    const response = await request(app)
      .post("/auth/apple")
      .send({
        identityToken: "verified-apple-token",
        fullName: {
          givenName: "Nick",
          familyName: "Relay",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      email: "abc123@privaterelay.appleid.com",
      emailVerified: true,
      displayName: "Nick Relay",
      authProviders: [
        {
          provider: "apple",
          providerUserId: "apple_1",
        },
      ],
    });
    expect(userModelMock.users).toHaveLength(1);
  });

  it("returns a graceful unavailable error when Apple sign-in is not configured", async () => {
    verifierMocks.isAppleSignInAvailable.mockReturnValue(false);

    const response = await request(app)
      .post("/auth/apple")
      .send({
        identityToken: "verified-apple-token",
      });

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: "APPLE_SIGN_IN_NOT_AVAILABLE",
        message: "Apple Sign-In is not currently available.",
      },
    });
    expect(verifierMocks.verifyAppleIdentityToken).not.toHaveBeenCalled();
  });

  it("creates separate users for the same provider with different provider user IDs", async () => {
    verifierMocks.verifyGoogleIdToken
      .mockResolvedValueOnce(
        makeIdentity({
          providerUserId: "google_1",
          email: "first@example.com",
        }),
      )
      .mockResolvedValueOnce(
        makeIdentity({
          providerUserId: "google_2",
          email: "second@example.com",
        }),
      );

    const firstResponse = await request(app).post("/auth/google").send({
      idToken: "first-google-token",
    });
    const secondResponse = await request(app).post("/auth/google").send({
      idToken: "second-google-token",
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(firstResponse.body.data.user.id).not.toBe(secondResponse.body.data.user.id);
    expect(userModelMock.users).toHaveLength(2);
  });
});
