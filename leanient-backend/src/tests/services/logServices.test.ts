import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CreateDoseLogRequest,
  CreateMealLogRequest,
  CreateMeasurementLogRequest,
  CreateSideEffectLogRequest,
  CreateWorkoutLogRequest,
} from "@leanient/shared";

interface MockObjectId {
  toString: () => string;
}

interface MockLogDocument {
  _id: MockObjectId;
  userId: string;
  recordedAt: Date;
  deletedAt: Date | null;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

interface LogFilter {
  _id?: string;
  userId?: string;
  deletedAt?: null;
  idempotencyKey?: string;
  recordedAt?: {
    $gte?: Date;
    $lte?: Date;
  };
}

interface LogUpdate {
  $set: Record<string, unknown>;
}

function matchesFilter(document: MockLogDocument, filter: LogFilter): boolean {
  const gte = filter.recordedAt?.$gte;
  const lte = filter.recordedAt?.$lte;

  return (
    (!filter._id || document._id.toString() === filter._id) &&
    (!filter.userId || document.userId === filter.userId) &&
    (filter.deletedAt === undefined || document.deletedAt === filter.deletedAt) &&
    (!filter.idempotencyKey || document.idempotencyKey === filter.idempotencyKey) &&
    (!gte || document.recordedAt >= gte) &&
    (!lte || document.recordedAt <= lte)
  );
}

const modelMocks = vi.hoisted(() => {
  let nextId = 1;

  function objectId(prefix: string): MockObjectId {
    const id = `${prefix}_${nextId}`;
    nextId += 1;
    return {
      toString: () => id,
    };
  }

  function timestamps() {
    const now = new Date("2026-06-01T12:00:00.000Z");
    return {
      createdAt: now,
      updatedAt: now,
    };
  }

  function createModel(prefix: string) {
    const documents: MockLogDocument[] = [];

    return {
      documents,
      create: vi.fn(async (data: Record<string, unknown>) => {
        if (
          typeof data.idempotencyKey === "string" &&
          documents.some(
            (document) =>
              document.userId === data.userId && document.idempotencyKey === data.idempotencyKey,
          )
        ) {
          throw Object.assign(new Error("duplicate key"), {
            code: 11000,
            keyPattern: { idempotencyKey: 1 },
          });
        }

        const document: MockLogDocument = {
          _id: objectId(prefix),
          ...data,
          userId: String(data.userId),
          recordedAt: data.recordedAt as Date,
          deletedAt: (data.deletedAt as Date | null | undefined) ?? null,
          ...timestamps(),
        };
        documents.push(document);
        return document;
      }),
      findOne: vi.fn(async (filter: LogFilter) => {
        return documents.find((document) => matchesFilter(document, filter)) ?? null;
      }),
      findOneAndUpdate: vi.fn(async (filter: LogFilter, update: LogUpdate) => {
        const document = documents.find((stored) => matchesFilter(stored, filter));

        if (!document) {
          return null;
        }

        Object.assign(document, update.$set, { updatedAt: new Date("2026-06-02T12:00:00.000Z") });
        return document;
      }),
      find: vi.fn((filter: LogFilter) => ({
        sort: vi.fn(() => ({
          limit: vi.fn(async (limit: number) => {
            return documents
              .filter((document) => matchesFilter(document, filter))
              .sort((left, right) => right.recordedAt.getTime() - left.recordedAt.getTime())
              .slice(0, limit);
          }),
        })),
      })),
      reset: () => {
        documents.splice(0, documents.length);
      },
    };
  }

  const meal = createModel("meal");
  const workout = createModel("workout_log");
  const dose = createModel("dose");
  const measurement = createModel("measurement");
  const sideEffect = createModel("side_effect");
  const WorkoutModel = {
    findById: vi.fn(async (id: string) => {
      if (id === "strength_workout") {
        return { _id: { toString: () => id }, category: "strength" };
      }
      if (id === "cardio_workout") {
        return { _id: { toString: () => id }, category: "conditioning" };
      }
      return null;
    }),
  };
  const UserMedicationProtocolModel = {
    findOne: vi.fn(async (filter: { userId?: string; active?: boolean; _id?: string }) => {
      if (filter.userId === "user_1" && filter.active === true) {
        return {
          _id: { toString: () => "active_protocol_1" },
          userId: "user_1",
          active: true,
        };
      }
      return null;
    }),
  };

  return {
    meal,
    workout,
    dose,
    measurement,
    sideEffect,
    WorkoutModel,
    reset: () => {
      nextId = 1;
      meal.reset();
      workout.reset();
      dose.reset();
      measurement.reset();
      sideEffect.reset();
      meal.create.mockClear();
      workout.create.mockClear();
      dose.create.mockClear();
      measurement.create.mockClear();
      sideEffect.create.mockClear();
      meal.findOne.mockClear();
      workout.findOne.mockClear();
      dose.findOne.mockClear();
      measurement.findOne.mockClear();
      sideEffect.findOne.mockClear();
      meal.findOneAndUpdate.mockClear();
      workout.findOneAndUpdate.mockClear();
      dose.findOneAndUpdate.mockClear();
      measurement.findOneAndUpdate.mockClear();
      sideEffect.findOneAndUpdate.mockClear();
      meal.find.mockClear();
      workout.find.mockClear();
      dose.find.mockClear();
      measurement.find.mockClear();
      sideEffect.find.mockClear();
      WorkoutModel.findById.mockClear();
      UserMedicationProtocolModel.findOne.mockClear();
    },
    UserMedicationProtocolModel,
  };
});

vi.mock("../../models/mealLog.model", () => ({
  MealLogModel: modelMocks.meal,
}));

vi.mock("../../models/workoutLog.model", () => ({
  WorkoutLogModel: modelMocks.workout,
}));

vi.mock("../../models/workout.model", () => ({
  WorkoutModel: modelMocks.WorkoutModel,
}));

vi.mock("../../models/doseLog.model", () => ({
  DoseLogModel: modelMocks.dose,
}));

vi.mock("../../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: modelMocks.UserMedicationProtocolModel,
}));

vi.mock("../../models/measurementLog.model", () => ({
  MeasurementLogModel: modelMocks.measurement,
}));

vi.mock("../../models/sideEffectLog.model", () => ({
  SideEffectLogModel: modelMocks.sideEffect,
}));

import { doseLogService } from "../../services/doseLog.service";
import { mealLogService } from "../../services/mealLog.service";
import { measurementLogService } from "../../services/measurementLog.service";
import { sideEffectLogService } from "../../services/sideEffectLog.service";
import { workoutLogService } from "../../services/workoutLog.service";
import type { DailyLogService } from "../../services/logCrud.service";

type CreateBody =
  | CreateMealLogRequest
  | CreateWorkoutLogRequest
  | CreateDoseLogRequest
  | CreateMeasurementLogRequest
  | CreateSideEffectLogRequest;

interface ServiceCase<TCreate extends CreateBody> {
  name: string;
  service: DailyLogService<TCreate, Partial<TCreate>, unknown>;
  documents: MockLogDocument[];
  body: TCreate;
  update: Partial<TCreate>;
  updatedField: string;
  updatedValue: unknown;
}

const cases: ServiceCase<CreateBody>[] = [
  {
    name: "meal logs",
    service: mealLogService,
    documents: modelMocks.meal.documents,
    body: {
      recordedAt: "2026-06-01T13:00:00.000Z",
      idempotencyKey: "idem-1",
      source: "manual",
      foodName: "Greek yogurt",
      protein: 35,
      calories: 250,
    },
    update: {
      foodName: "Greek yogurt bowl",
    },
    updatedField: "foodName",
    updatedValue: "Greek yogurt bowl",
  },
  {
    name: "workout logs",
    service: workoutLogService,
    documents: modelMocks.workout.documents,
    body: {
      recordedAt: "2026-06-01T18:00:00.000Z",
      idempotencyKey: "idem-1",
      customWorkoutName: "Hotel lift",
      exercises: [
        {
          name: "Goblet squat",
          sets: [{ reps: 10, weight: 35, unit: "lb" }],
          muscleGroups: ["legs"],
        },
      ],
      durationMinutes: 32,
    },
    update: {
      durationMinutes: 40,
    },
    updatedField: "durationMinutes",
    updatedValue: 40,
  },
  {
    name: "dose logs",
    service: doseLogService,
    documents: modelMocks.dose.documents,
    body: {
      recordedAt: "2026-06-01T08:00:00.000Z",
      idempotencyKey: "idem-1",
      medicationProtocolId: "protocol_1",
      doseAmount: 5,
      doseUnit: "mg",
      injectionSite: "abdomen_left",
    },
    update: {
      injectionSite: "thigh_right",
    },
    updatedField: "injectionSite",
    updatedValue: "thigh_right",
  },
  {
    name: "measurement logs",
    service: measurementLogService,
    documents: modelMocks.measurement.documents,
    body: {
      recordedAt: "2026-06-01T07:00:00.000Z",
      idempotencyKey: "idem-1",
      measurements: {
        waist: 34,
      },
      unit: "in",
    },
    update: {
      measurements: {
        waist: 33.5,
      },
    },
    updatedField: "measurements",
    updatedValue: {
      waist: 33.5,
    },
  },
  {
    name: "side effect logs",
    service: sideEffectLogService,
    documents: modelMocks.sideEffect.documents,
    body: {
      recordedAt: "2026-06-01T09:00:00.000Z",
      idempotencyKey: "idem-1",
      symptom: "nausea",
      severity: 2,
      relatedToDose: true,
    },
    update: {
      severity: 3,
    },
    updatedField: "severity",
    updatedValue: 3,
  },
];

describe.each(cases)("$name service", (serviceCase) => {
  beforeEach(() => {
    modelMocks.reset();
  });

  it("creates a log with ownership set", async () => {
    const result = await serviceCase.service.create("user_1", serviceCase.body);

    expect(result).toMatchObject({
      userId: "user_1",
      idempotencyKey: "idem-1",
      deletedAt: null,
    });
    expect(serviceCase.documents).toHaveLength(1);
    expect(serviceCase.documents[0]?.userId).toBe("user_1");
  });

  it("returns the existing record when the same idempotency key is submitted twice", async () => {
    const first = await serviceCase.service.create("user_1", serviceCase.body);
    const second = await serviceCase.service.create("user_1", serviceCase.body);

    expect(first).toMatchObject(second as Record<string, unknown>);
    expect(serviceCase.documents).toHaveLength(1);
  });

  it("lists logs in range and excludes soft-deleted logs", async () => {
    await serviceCase.service.create("user_1", serviceCase.body);
    await serviceCase.service.create("user_1", {
      ...serviceCase.body,
      recordedAt: "2026-05-01T12:00:00.000Z",
      idempotencyKey: "idem-old",
    });
    serviceCase.documents[0]!.deletedAt = new Date("2026-06-02T12:00:00.000Z");

    const result = await serviceCase.service.list("user_1", {
      from: "2026-05-15T00:00:00.000Z",
      to: "2026-06-03T00:00:00.000Z",
      limit: 100,
    });

    expect(result).toHaveLength(0);
  });

  it("gets a log by id for the owner", async () => {
    await serviceCase.service.create("user_1", serviceCase.body);
    const id = serviceCase.documents[0]!._id.toString();

    const result = await serviceCase.service.getById("user_1", id);

    expect(result).toMatchObject({ id, userId: "user_1" });
  });

  it("returns 404 semantics for the wrong owner", async () => {
    await serviceCase.service.create("user_1", serviceCase.body);
    const id = serviceCase.documents[0]!._id.toString();

    await expect(serviceCase.service.getById("user_2", id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("updates a log for the owner", async () => {
    await serviceCase.service.create("user_1", serviceCase.body);
    const id = serviceCase.documents[0]!._id.toString();

    const result = await serviceCase.service.update("user_1", id, serviceCase.update);

    expect(result).toMatchObject({
      [serviceCase.updatedField]: serviceCase.updatedValue,
    });
  });

  it("returns 404 semantics when a non-owner updates", async () => {
    await serviceCase.service.create("user_1", serviceCase.body);
    const id = serviceCase.documents[0]!._id.toString();

    await expect(serviceCase.service.update("user_2", id, serviceCase.update)).rejects.toMatchObject(
      {
        statusCode: 404,
      },
    );
  });

  it("soft deletes a log for the owner", async () => {
    await serviceCase.service.create("user_1", serviceCase.body);
    const id = serviceCase.documents[0]!._id.toString();

    const result = await serviceCase.service.softDelete("user_1", id);

    expect(result).toMatchObject({ id });
    expect(serviceCase.documents[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it("keeps soft-deleted logs out of list responses", async () => {
    await serviceCase.service.create("user_1", serviceCase.body);
    const id = serviceCase.documents[0]!._id.toString();
    await serviceCase.service.softDelete("user_1", id);

    const result = await serviceCase.service.list("user_1", {
      from: "2026-05-15T00:00:00.000Z",
      to: "2026-06-03T00:00:00.000Z",
      limit: 100,
    });

    expect(result).toHaveLength(0);
  });
});

describe("workout log countsAsResistance", () => {
  beforeEach(() => {
    modelMocks.reset();
  });

  it("persists an explicit true countsAsResistance override", async () => {
    const result = await workoutLogService.create("user_1", {
      recordedAt: "2026-06-01T18:00:00.000Z",
      customWorkoutName: "Heavy conditioning",
      exercises: [],
      durationMinutes: 24,
      countsAsResistance: true,
    } as CreateWorkoutLogRequest);

    expect(result).toMatchObject({ countsAsResistance: true });
    expect(modelMocks.workout.documents[0]?.countsAsResistance).toBe(true);
  });

  it("persists an explicit false countsAsResistance override", async () => {
    const result = await workoutLogService.create("user_1", {
      recordedAt: "2026-06-01T18:00:00.000Z",
      customWorkoutName: "Light strength",
      exercises: [],
      durationMinutes: 12,
      countsAsResistance: false,
    } as CreateWorkoutLogRequest);

    expect(result).toMatchObject({ countsAsResistance: false });
    expect(modelMocks.workout.documents[0]?.countsAsResistance).toBe(false);
  });

  it("defaults omitted countsAsResistance to true for strength workout catalog entries", async () => {
    const result = await workoutLogService.create("user_1", {
      recordedAt: "2026-06-01T18:00:00.000Z",
      workoutId: "strength_workout",
      exercises: [],
      durationMinutes: 22,
    });

    expect(modelMocks.WorkoutModel.findById).toHaveBeenCalledWith("strength_workout");
    expect(result).toMatchObject({ countsAsResistance: true });
  });

  it("defaults omitted countsAsResistance to false for non-strength workout catalog entries", async () => {
    const result = await workoutLogService.create("user_1", {
      recordedAt: "2026-06-01T18:00:00.000Z",
      workoutId: "cardio_workout",
      exercises: [],
      durationMinutes: 22,
    });

    expect(modelMocks.WorkoutModel.findById).toHaveBeenCalledWith("cardio_workout");
    expect(result).toMatchObject({ countsAsResistance: false });
  });
});

describe("dose log protocol resolution", () => {
  beforeEach(() => {
    modelMocks.reset();
  });

  it("attaches a stale string protocol id to the user's active protocol before saving", async () => {
    await doseLogService.create("user_1", {
      recordedAt: "2026-06-01T08:00:00.000Z",
      medicationProtocolId: "med_demo",
      doseAmount: 5,
      doseUnit: "mg",
      injectionSite: "abdomen_left",
    });

    expect(modelMocks.UserMedicationProtocolModel.findOne).toHaveBeenCalledWith({
      userId: "user_1",
      active: true,
    });
    expect(modelMocks.dose.documents[0]?.medicationProtocolId?.toString()).toBe(
      "active_protocol_1",
    );
  });
});
