import type { Model } from "mongoose";
import { describe, expect, it } from "vitest";
import { DoseLogModel } from "../../models/doseLog.model";
import { MealLogModel } from "../../models/mealLog.model";
import { MealScanModel } from "../../models/mealScan.model";
import { MeasurementLogModel } from "../../models/measurementLog.model";
import { SideEffectLogModel } from "../../models/sideEffectLog.model";
import { WorkoutLogModel } from "../../models/workoutLog.model";

const IDEMPOTENCY_FILTER = {
  idempotencyKey: { $type: "string" },
};

const MODELS_WITH_OPTIONAL_IDEMPOTENCY_KEYS: Array<[string, Model<unknown>]> = [
  ["DoseLog", DoseLogModel as Model<unknown>],
  ["MealLog", MealLogModel as Model<unknown>],
  ["MealScan", MealScanModel as Model<unknown>],
  ["MeasurementLog", MeasurementLogModel as Model<unknown>],
  ["SideEffectLog", SideEffectLogModel as Model<unknown>],
  ["WorkoutLog", WorkoutLogModel as Model<unknown>],
];

describe("optional idempotency indexes", () => {
  it.each(MODELS_WITH_OPTIONAL_IDEMPOTENCY_KEYS)(
    "%s only enforces uniqueness when an idempotency key is present",
    (_name, model) => {
      const idempotencyIndex = model.schema.indexes().find(([fields]) => {
        return fields.userId === 1 && fields.idempotencyKey === 1;
      });

      expect(idempotencyIndex).toBeDefined();
      expect(idempotencyIndex?.[1]).toMatchObject({
        unique: true,
        partialFilterExpression: IDEMPOTENCY_FILTER,
      });
      expect(idempotencyIndex?.[1]).not.toHaveProperty("sparse");
    },
  );
});
