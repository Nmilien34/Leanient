import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockUserDocument {
  _id: {
    toString: () => string;
  };
  subscriptionStatus: string;
  entitlementExpiresAt?: Date;
  subscriptionWillRenew: boolean;
  revenueCatCustomerId?: string;
  revenueCatEntitlement?: string;
  save: ReturnType<typeof vi.fn>;
}

interface MockSubscriptionEventDocument {
  revenueCatEventId?: string;
  userId?: unknown;
  eventType: string;
  status: string;
}

const modelMocks = vi.hoisted(() => {
  let failSubscriptionEventCreateWith: unknown;
  const users: MockUserDocument[] = [];
  const subscriptionEvents: MockSubscriptionEventDocument[] = [];

  function createDuplicateEventError(eventId: string) {
    return Object.assign(new Error(`Duplicate RevenueCat event ${eventId}`), {
      code: 11000,
      keyPattern: {
        revenueCatEventId: 1,
      },
    });
  }

  function createUser(userId: string): MockUserDocument {
    const user = {
      _id: {
        toString: () => userId,
      },
      subscriptionStatus: "free",
      subscriptionWillRenew: false,
      save: vi.fn(async () => user),
    };
    users.push(user);
    return user;
  }

  const UserModel = {
    findById: vi.fn(async (userId: string) => {
      return users.find((user) => user._id.toString() === userId) ?? null;
    }),
  };

  const SubscriptionEventModel = {
    create: vi.fn(async (data) => {
      if (failSubscriptionEventCreateWith) {
        throw failSubscriptionEventCreateWith;
      }

      if (
        data.revenueCatEventId &&
        subscriptionEvents.some((event) => event.revenueCatEventId === data.revenueCatEventId)
      ) {
        throw createDuplicateEventError(data.revenueCatEventId);
      }

      const event = {
        revenueCatEventId: data.revenueCatEventId,
        userId: data.userId,
        eventType: data.eventType,
        status: data.status,
      };
      subscriptionEvents.push(event);
      return event;
    }),
  };

  return {
    users,
    subscriptionEvents,
    UserModel,
    SubscriptionEventModel,
    createUser,
    createDuplicateEventError,
    countEventsById: (eventId: string) =>
      subscriptionEvents.filter((event) => event.revenueCatEventId === eventId).length,
    setCreateFailure: (error: unknown) => {
      failSubscriptionEventCreateWith = error;
    },
    reset: () => {
      failSubscriptionEventCreateWith = undefined;
      users.splice(0, users.length);
      subscriptionEvents.splice(0, subscriptionEvents.length);
      UserModel.findById.mockClear();
      SubscriptionEventModel.create.mockClear();
    },
  };
});

vi.mock("../../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

vi.mock("../../models/subscriptionEvent.model", () => ({
  SubscriptionEventModel: modelMocks.SubscriptionEventModel,
}));

import {
  handleRevenueCatWebhook,
  mapRevenueCatEventToSubscription,
} from "../../services/revenueCat.service";

describe("RevenueCat service", () => {
  beforeEach(() => {
    modelMocks.reset();
  });

  it("maps trial and active lifecycle events to Leanient statuses", () => {
    expect(
      mapRevenueCatEventToSubscription({
        type: "INITIAL_PURCHASE",
        period_type: "TRIAL",
        expiration_at_ms: 1_780_000_000_000,
      }).status,
    ).toBe("trialing");

    expect(
      mapRevenueCatEventToSubscription({
        type: "RENEWAL",
        period_type: "NORMAL",
        expiration_at_ms: 1_780_000_000_000,
      }).status,
    ).toBe("active");
  });

  it("keeps access for canceled subscriptions until the entitlement expires", () => {
    const entitlementExpiryMs = Date.UTC(2026, 4, 29, 16, 26, 40);
    const mapped = mapRevenueCatEventToSubscription({
      type: "CANCELLATION",
      expiration_at_ms: entitlementExpiryMs,
      cancel_reason: "UNSUBSCRIBE",
    });

    expect(mapped.status).toBe("active_canceled");
    expect(mapped.subscriptionWillRenew).toBe(false);
    expect(mapped.entitlementExpiresAt).toBe("2026-05-29T16:26:40.000Z");
  });

  it("maps billing and refund events explicitly", () => {
    expect(mapRevenueCatEventToSubscription({ type: "BILLING_ISSUE" }).status).toBe("past_due");
    expect(mapRevenueCatEventToSubscription({ type: "REFUND" }).status).toBe("refunded");
  });

  it("marks canceled subscriptions without remaining access as canceled", () => {
    const mapped = mapRevenueCatEventToSubscription({
      type: "CANCELLATION",
      cancel_reason: "UNSUBSCRIBE",
    });

    expect(mapped).toEqual({
      status: "canceled",
      entitlementExpiresAt: undefined,
      subscriptionWillRenew: false,
    });
  });

  it("acknowledges unknown RevenueCat events as free without renewing access", () => {
    const mapped = mapRevenueCatEventToSubscription({
      type: "UNKNOWN_EVENT",
    });

    expect(mapped).toEqual({
      status: "free",
      entitlementExpiresAt: undefined,
      subscriptionWillRenew: false,
    });
  });

  it("stores a fresh webhook event and updates the user subscription state", async () => {
    const user = modelMocks.createUser("user_1");

    const result = await handleRevenueCatWebhook({
      event: {
        id: "event_1",
        type: "INITIAL_PURCHASE",
        app_user_id: "user_1",
        period_type: "TRIAL",
        entitlement_id: "leanient_pro",
        expiration_at_ms: Date.UTC(2026, 5, 10),
      },
    });

    expect(result).toEqual({
      status: "trialing",
      userId: "user_1",
      alreadyProcessed: false,
    });
    expect(modelMocks.countEventsById("event_1")).toBe(1);
    expect(user.subscriptionStatus).toBe("trialing");
    expect(user.revenueCatCustomerId).toBe("user_1");
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it("treats duplicate RevenueCat event inserts as already processed without updating twice", async () => {
    const user = modelMocks.createUser("user_1");
    const payload = {
      event: {
        id: "event_1",
        type: "RENEWAL",
        app_user_id: "user_1",
        entitlement_id: "leanient_pro",
      },
    };

    const firstResult = await handleRevenueCatWebhook(payload);
    const secondResult = await handleRevenueCatWebhook(payload);

    expect(firstResult.alreadyProcessed).toBe(false);
    expect(secondResult).toEqual({
      status: "active",
      userId: "user_1",
      alreadyProcessed: true,
    });
    expect(modelMocks.countEventsById("event_1")).toBe(1);
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it("propagates non-RevenueCat duplicate-key errors", async () => {
    modelMocks.createUser("user_1");
    modelMocks.setCreateFailure(
      Object.assign(new Error("Duplicate different key"), {
        code: 11000,
        keyPattern: {
          revenueCatCustomerId: 1,
        },
      }),
    );

    await expect(
      handleRevenueCatWebhook({
        event: {
          id: "event_1",
          type: "RENEWAL",
          app_user_id: "user_1",
        },
      }),
    ).rejects.toThrow("Duplicate different key");

    expect(modelMocks.countEventsById("event_1")).toBe(0);
    expect(modelMocks.users[0]?.save).not.toHaveBeenCalled();
  });
});
