import { describe, expect, it } from "vitest";
import { UserModel } from "../../models/user.model";

describe("User model", () => {
  it("defaults emailVerified to false", () => {
    const user = new UserModel({});

    expect(user.emailVerified).toBe(false);
  });

  it("defaults onboarding completion fields to an incomplete state", () => {
    const user = new UserModel({});

    expect(user.onboardingComplete).toBe(false);
    expect(user.onboardingCompletedAt).toBeUndefined();
  });

  it("only enforces unique emails for verified email owners", () => {
    const uniqueEmailIndexes = UserModel.schema.indexes().filter(([fields, options]) => {
      return fields.email === 1 && options?.unique === true;
    });

    expect(uniqueEmailIndexes).toHaveLength(1);
    expect(uniqueEmailIndexes[0]?.[1]?.partialFilterExpression).toEqual({
      email: { $exists: true },
      emailVerified: true,
    });
  });
});
