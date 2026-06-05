import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { issueSessionJwt } from "../auth/jwt";

interface MockObjectId {
  toString: () => string;
}

interface MockWeeklyVerdictDocument {
  _id: MockObjectId;
  userId: string;
  weekOf: string;
  checkinId: MockObjectId | null;
  source: "checkin" | "cron_backfill" | "cron_no_data";
  engineVersion: string;
  copyVersion: string | null;
  explanation: string | null;
  status: "on_track" | "drifting" | "losing_muscle" | "no_data";
  score: number | null;
  estimatedLeanMassRisk: number | null;
  nextActionCode: string;
  headline: string;
  message: string;
  explanationFactors: string[];
  inputsUsed?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const modelMocks = vi.hoisted(() => {
  let verdict: MockWeeklyVerdictDocument | null = null;
  let user: { _id: MockObjectId; onboardingComplete: boolean } | null = {
    _id: { toString: () => "user_1" },
    onboardingComplete: true,
  };

  const WeeklyVerdictModel = {
    findOne: vi.fn((_filter) => ({
      sort: vi.fn(async () => verdict),
    })),
  };

  const UserModel = {
    findById: vi.fn(async () => user),
  };

  return {
    WeeklyVerdictModel,
    UserModel,
    setVerdict: (nextVerdict: MockWeeklyVerdictDocument | null) => {
      verdict = nextVerdict;
    },
    setUser: (nextUser: typeof user) => {
      user = nextUser;
    },
    reset: () => {
      verdict = null;
      user = {
        _id: { toString: () => "user_1" },
        onboardingComplete: true,
      };
      WeeklyVerdictModel.findOne.mockClear();
      UserModel.findById.mockClear();
    },
  };
});

vi.mock("../models/weeklyVerdict.model", () => ({
  WeeklyVerdictModel: modelMocks.WeeklyVerdictModel,
}));

vi.mock("../models/user.model", () => ({
  UserModel: modelMocks.UserModel,
}));

import { createApp } from "../server";

function objectId(id: string): MockObjectId {
  return { toString: () => id };
}

function makeVerdict(): MockWeeklyVerdictDocument {
  return {
    _id: objectId("verdict_1"),
    userId: "user_1",
    weekOf: "2026-06-01",
    checkinId: objectId("checkin_1"),
    source: "checkin",
    engineVersion: "v1.2",
    copyVersion: "v1.0-gpt-4o-mini",
    explanation: "You are on track this week.",
    status: "on_track",
    score: 88,
    estimatedLeanMassRisk: 0.12,
    nextActionCode: "keep_rhythm",
    headline: "Keeping muscle",
    message: "Protein and training are doing their jobs.",
    explanationFactors: ["Protein: strong", "Training: enough"],
    createdAt: new Date("2026-06-03T12:00:00.000Z"),
    updatedAt: new Date("2026-06-03T12:00:00.000Z"),
  };
}

describe("weekly verdict routes", () => {
  let app: Express;
  let authorization: string;

  beforeEach(() => {
    modelMocks.reset();
    app = createApp({ healthCheck: async () => true });
    authorization = `Bearer ${issueSessionJwt("user_1")}`;
  });

  it("returns an available latest verdict response when a verdict exists", async () => {
    modelMocks.setVerdict(makeVerdict());

    const response = await request(app)
      .get("/weekly-verdicts/latest")
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: "available",
      message: null,
      verdict: {
        id: "verdict_1",
        status: "on_track",
        headline: "Keeping muscle",
      },
    });
  });

  it("returns still gathering when onboarding is complete and no verdict exists", async () => {
    const response = await request(app)
      .get("/weekly-verdicts/latest")
      .set("Authorization", authorization);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      status: "still_gathering",
      verdict: null,
      message:
        "Your first verdict is almost ready. Log this week's check-in to see whether you're keeping your muscle. Takes 90 seconds.",
    });
  });

  it("rejects users who have not completed onboarding", async () => {
    modelMocks.setUser({
      _id: objectId("user_1"),
      onboardingComplete: false,
    });

    const response = await request(app)
      .get("/weekly-verdicts/latest")
      .set("Authorization", authorization);

    expect(response.status).toBe(403);
  });
});
