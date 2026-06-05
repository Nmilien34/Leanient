import { describe, expect, it } from "vitest";
import { WeightLogModel } from "../../models/weightLog.model";

describe("WeightLog model", () => {
  it("enforces one weekly check-in weight log per user and week", () => {
    const weeklyWeightLogIndexes = WeightLogModel.schema.indexes().filter(([fields, options]) => {
      return fields.userId === 1 && fields.weekOf === 1 && options?.unique === true;
    });

    expect(weeklyWeightLogIndexes).toHaveLength(1);
    expect(weeklyWeightLogIndexes[0]?.[1]?.partialFilterExpression).toEqual({
      weekOf: { $exists: true },
    });
  });
});
