import type { SubscriptionStatus } from "@leanient/shared";
import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockUserDocument {
  _id: {
    toString: () => string;
  };
  subscriptionStatus: SubscriptionStatus;
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
  status: SubscriptionStatus;
}

const modelMocks = vi.hoisted(() => {
  const users: MockUserDocument[] = [];
  const subscriptionEvents: MockSubscriptionEventDocument[] = [];

  function duplicateEventError(eventId: string) {
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
      subscriptionStatus: "free" as const,
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
      if (
        data.revenueCatEventId &&
        subscriptionEvents.some((event) => event.revenueCatEventId === data.revenueCatEventId)
      ) {
        throw duplicateEventError(data.revenueCatEventId);
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
    countEventsById: (eventId: string) =>
      subscriptionEvents.filter((event) => event.revenueCatEventId === eventId).length,
    reset: () => {
      users.splice(0, users.length);
      subscriptionEvents.splice(0, subscriptionEvents.length);
      UserModel.findById.mockClear();
      SubscriptionEventModel.create.mockClear();
    },
  };
});

vi.mock("../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

vi.mock("../models/subscriptionEvent.model", () => ({
  SubscriptionEventModel: modelMocks.SubscriptionEventModel,
}));

import { createApp } from "../server";

function makeRevenueCatPayload(eventId: string) {
  return {
    event: {
      id: eventId,
      type: "RENEWAL",
      app_user_id: "user_1",
      entitlement_id: "leanient_pro",
      expiration_at_ms: Date.UTC(2026, 5, 10),
    },
  };
}

describe("RevenueCat webhook routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    modelMocks.reset();
    modelMocks.createUser("user_1");
    app = createApp({ healthCheck: async () => true });
    authorization = "Bearer test-revenuecat-secret";
  });

  it("processes a fresh RevenueCat webhook and stores one subscription event", async () => {
    const response = await request(app)
      .post("/webhooks/revenuecat")
      .set("Authorization", authorization)
      .send(makeRevenueCatPayload("event_1"));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      status: "active",
      userId: "user_1",
      alreadyProcessed: false,
    });
    expect(modelMocks.countEventsById("event_1")).toBe(1);
    expect(modelMocks.users[0]?.save).toHaveBeenCalledTimes(1);
  });

  it("acknowledges duplicate RevenueCat webhooks without storing or updating twice", async () => {
    const firstResponse = await request(app)
      .post("/webhooks/revenuecat")
      .set("Authorization", authorization)
      .send(makeRevenueCatPayload("event_1"));
    const secondResponse = await request(app)
      .post("/webhooks/revenuecat")
      .set("Authorization", authorization)
      .send(makeRevenueCatPayload("event_1"));

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.data).toEqual({
      status: "active",
      userId: "user_1",
      alreadyProcessed: true,
    });
    expect(modelMocks.countEventsById("event_1")).toBe(1);
    expect(modelMocks.users[0]?.save).toHaveBeenCalledTimes(1);
  });

  it("handles concurrent duplicate RevenueCat deliveries with one event and one user update", async () => {
    const [firstResponse, secondResponse] = await Promise.all([
      request(app)
        .post("/webhooks/revenuecat")
        .set("Authorization", authorization)
        .send(makeRevenueCatPayload("event_1")),
      request(app)
        .post("/webhooks/revenuecat")
        .set("Authorization", authorization)
        .send(makeRevenueCatPayload("event_1")),
    ]);

    expect([firstResponse.status, secondResponse.status].sort()).toEqual([200, 200]);
    expect(modelMocks.countEventsById("event_1")).toBe(1);
    expect(modelMocks.users[0]?.save).toHaveBeenCalledTimes(1);
    expect([firstResponse.body.data.alreadyProcessed, secondResponse.body.data.alreadyProcessed]).toEqual(
      expect.arrayContaining([false, true]),
    );
  });
});
