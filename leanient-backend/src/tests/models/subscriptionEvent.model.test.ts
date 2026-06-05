import { describe, expect, it } from "vitest";
import { SubscriptionEventModel } from "../../models/subscriptionEvent.model";

describe("SubscriptionEvent model", () => {
  it("enforces RevenueCat event IDs with a unique sparse index", () => {
    const revenueCatEventIndexes = SubscriptionEventModel.schema.indexes().filter(([fields]) => {
      return fields.revenueCatEventId === 1;
    });

    expect(revenueCatEventIndexes).toEqual(
      expect.arrayContaining([
        [
          { revenueCatEventId: 1 },
          expect.objectContaining({
            unique: true,
            sparse: true,
          }),
        ],
      ]),
    );
  });
});
