import type { AuthProvider, SubscriptionStatus } from "@leanient/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderIdentity } from "../../auth/identity";

interface MockLinkedAuthProvider {
  provider: AuthProvider;
  providerUserId: string;
  linkedAt: Date;
}

interface MockUserInit {
  email?: string;
  emailVerified?: boolean;
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

const userModelMock = vi.hoisted(() => {
  let nextId = 1;
  const users: MockUserDocument[] = [];
  const findOneCalls: MockFindOneQuery[] = [];

  function createUserDocument(init: MockUserInit): MockUserDocument {
    const id = `user_${nextId}`;
    const user: MockUserDocument = {
      _id: {
        toString: () => id,
      },
      email: init.email,
      emailVerified: init.emailVerified ?? false,
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
    findOneCalls.push(query);

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
    findOneCalls,
    UserModel: Object.assign(MockUserModel, { findOne }),
    createUserDocument,
    reset: () => {
      nextId = 1;
      users.splice(0, users.length);
      findOneCalls.splice(0, findOneCalls.length);
    },
  };
});

vi.mock("../../models/user.model", () => ({
  UserModel: userModelMock.UserModel,
}));

import { upsertUserFromIdentity } from "../../services/user.service";

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

function emailLookupCalls(): EmailLookupQuery[] {
  return userModelMock.findOneCalls.filter(
    (query): query is EmailLookupQuery => "email" in query,
  );
}

describe("user service", () => {
  beforeEach(() => {
    userModelMock.reset();
  });

  it("creates a new user with a verified Google email when no user exists", async () => {
    const user = await upsertUserFromIdentity(makeIdentity());

    expect(user.email).toBe("nick@gmail.com");
    expect(user.emailVerified).toBe(true);
    expect(user.authProviders).toMatchObject([
      {
        provider: "google",
        providerUserId: "google_1",
      },
    ]);
    expect(userModelMock.users).toHaveLength(1);
  });

  it("links a verified Google identity to an existing verified email owner", async () => {
    const existingUser = userModelMock.createUserDocument({
      email: "nick@gmail.com",
      emailVerified: true,
      authProviders: [makeLinkedProvider("apple", "apple_1")],
    });

    const user = await upsertUserFromIdentity(makeIdentity());

    expect(user).toBe(existingUser);
    expect(existingUser.authProviders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: "apple", providerUserId: "apple_1" }),
        expect.objectContaining({ provider: "google", providerUserId: "google_1" }),
      ]),
    );
    expect(userModelMock.users).toHaveLength(1);
  });

  it("creates a separate user when a verified Google email matches an unverified stored email", async () => {
    const unverifiedUser = userModelMock.createUserDocument({
      email: "nick@gmail.com",
      emailVerified: false,
      authProviders: [makeLinkedProvider("apple", "apple_1")],
    });

    const user = await upsertUserFromIdentity(makeIdentity());

    expect(user).not.toBe(unverifiedUser);
    expect(user.email).toBe("nick@gmail.com");
    expect(user.emailVerified).toBe(true);
    expect(unverifiedUser.authProviders).toHaveLength(1);
    expect(userModelMock.users).toHaveLength(2);
  });

  it("creates an unverified user without looking up by email when incoming Google email is unverified", async () => {
    const user = await upsertUserFromIdentity(
      makeIdentity({
        emailVerified: false,
      }),
    );

    expect(user.email).toBe("nick@gmail.com");
    expect(user.emailVerified).toBe(false);
    expect(emailLookupCalls()).toHaveLength(0);
    expect(userModelMock.users).toHaveLength(1);
  });

  it("creates a separate unverified user when the same email already exists", async () => {
    const existingUser = userModelMock.createUserDocument({
      email: "nick@gmail.com",
      emailVerified: true,
      authProviders: [makeLinkedProvider("apple", "apple_1")],
    });

    const user = await upsertUserFromIdentity(
      makeIdentity({
        providerUserId: "google_2",
        emailVerified: false,
      }),
    );

    expect(user).not.toBe(existingUser);
    expect(user.emailVerified).toBe(false);
    expect(existingUser.authProviders).toHaveLength(1);
    expect(emailLookupCalls()).toHaveLength(0);
    expect(userModelMock.users).toHaveLength(2);
  });

  it("returns a user by provider identity before considering email state", async () => {
    const existingUser = userModelMock.createUserDocument({
      email: "nick@gmail.com",
      emailVerified: false,
      authProviders: [makeLinkedProvider("google", "google_1")],
    });

    const user = await upsertUserFromIdentity(
      makeIdentity({
        emailVerified: true,
      }),
    );

    expect(user).toBe(existingUser);
    expect(userModelMock.users).toHaveLength(1);
  });

  it("treats an Apple private relay email as a verified email", async () => {
    const user = await upsertUserFromIdentity(
      makeIdentity({
        provider: "apple",
        providerUserId: "apple_relay_1",
        email: "abc123@privaterelay.appleid.com",
        emailVerified: true,
        picture: undefined,
      }),
    );

    expect(user.email).toBe("abc123@privaterelay.appleid.com");
    expect(user.emailVerified).toBe(true);
    expect(user.authProviders).toMatchObject([
      {
        provider: "apple",
        providerUserId: "apple_relay_1",
      },
    ]);
  });
});
