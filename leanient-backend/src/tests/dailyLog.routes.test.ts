import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSessionJwt } from "../auth/jwt";

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
  const UserMedicationProtocolModel = {
    findOne: vi.fn(async (filter: { userId?: string; active?: boolean }) => {
      if (filter.active !== true || !filter.userId) {
        return null;
      }

      return {
        _id: { toString: () => `active_protocol_${filter.userId}` },
        userId: filter.userId,
        active: true,
      };
    }),
  };

  return {
    meal,
    workout,
    dose,
    measurement,
    sideEffect,
    UserMedicationProtocolModel,
    reset: () => {
      nextId = 1;
      for (const model of [meal, workout, dose, measurement, sideEffect]) {
        model.reset();
        model.create.mockClear();
        model.findOne.mockClear();
        model.findOneAndUpdate.mockClear();
        model.find.mockClear();
      }
      UserMedicationProtocolModel.findOne.mockClear();
    },
  };
});

vi.mock("../models/mealLog.model", () => ({
  MealLogModel: modelMocks.meal,
}));

vi.mock("../models/workoutLog.model", () => ({
  WorkoutLogModel: modelMocks.workout,
}));

vi.mock("../models/doseLog.model", () => ({
  DoseLogModel: modelMocks.dose,
}));

vi.mock("../models/userMedicationProtocol.model", () => ({
  UserMedicationProtocolModel: modelMocks.UserMedicationProtocolModel,
}));

vi.mock("../models/measurementLog.model", () => ({
  MeasurementLogModel: modelMocks.measurement,
}));

vi.mock("../models/sideEffectLog.model", () => ({
  SideEffectLogModel: modelMocks.sideEffect,
}));

import { createApp } from "../server";

interface RouteCase {
  path: string;
  documents: MockLogDocument[];
  body: Record<string, unknown>;
}

const routeCases: RouteCase[] = [
  {
    path: "/meal-logs",
    documents: modelMocks.meal.documents,
    body: {
      recordedAt: "2026-06-01T13:00:00.000Z",
      idempotencyKey: "idem-1",
      source: "manual",
      foodName: "Greek yogurt",
      protein: 35,
      calories: 250,
    },
  },
  {
    path: "/workout-logs",
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
  },
  {
    path: "/dose-logs",
    documents: modelMocks.dose.documents,
    body: {
      recordedAt: "2026-06-01T08:00:00.000Z",
      idempotencyKey: "idem-1",
      medicationProtocolId: "protocol_1",
      doseAmount: 5,
      doseUnit: "mg",
      injectionSite: "abdomen_left",
    },
  },
  {
    path: "/measurement-logs",
    documents: modelMocks.measurement.documents,
    body: {
      recordedAt: "2026-06-01T07:00:00.000Z",
      idempotencyKey: "idem-1",
      measurements: {
        waist: 34,
      },
      unit: "in",
    },
  },
  {
    path: "/side-effect-logs",
    documents: modelMocks.sideEffect.documents,
    body: {
      recordedAt: "2026-06-01T09:00:00.000Z",
      idempotencyKey: "idem-1",
      symptom: "nausea",
      severity: 2,
      relatedToDose: true,
    },
  },
];

describe.each(routeCases)("$path", (routeCase) => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    modelMocks.reset();
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("requires authentication on create", async () => {
    const response = await request(app).post(routeCase.path).send(routeCase.body);

    expect(response.status).toBe(401);
  });

  it("creates a log for the authenticated user", async () => {
    const response = await request(app)
      .post(routeCase.path)
      .set("Authorization", authorization)
      .send(routeCase.body);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      userId: "user_1",
      idempotencyKey: "idem-1",
      deletedAt: null,
    });
    expect(routeCase.documents).toHaveLength(1);
  });

  it("honors idempotency keys and stores one record", async () => {
    const first = await request(app)
      .post(routeCase.path)
      .set("Authorization", authorization)
      .send(routeCase.body);
    const second = await request(app)
      .post(routeCase.path)
      .set("Authorization", authorization)
      .send(routeCase.body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(first.body.data.id).toBe(second.body.data.id);
    expect(routeCase.documents).toHaveLength(1);
  });

  it("lists only the authenticated user's logs", async () => {
    await request(app).post(routeCase.path).set("Authorization", authorization).send(routeCase.body);
    await request(app)
      .post(routeCase.path)
      .set("Authorization", `Bearer ${issueSessionJwt("user_2")}`)
      .send({
        ...routeCase.body,
        idempotencyKey: "idem-other-user",
      });

    const response = await request(app)
      .get(`${routeCase.path}?from=2026-05-01T00:00:00.000Z&to=2026-06-30T00:00:00.000Z`)
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userId).toBe("user_1");
  });

  it("soft deletes and then returns 404 on get", async () => {
    const created = await request(app)
      .post(routeCase.path)
      .set("Authorization", authorization)
      .send(routeCase.body);
    const id = created.body.data.id as string;

    const deleted = await request(app)
      .delete(`${routeCase.path}/${id}`)
      .set("Authorization", authorization);
    const fetched = await request(app).get(`${routeCase.path}/${id}`).set("Authorization", authorization);

    expect(deleted.status).toBe(200);
    expect(routeCase.documents[0]?.deletedAt).toBeInstanceOf(Date);
    expect(fetched.status).toBe(404);
  });
});
