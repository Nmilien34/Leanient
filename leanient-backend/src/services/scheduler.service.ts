import cron, { type ScheduledTask } from "node-cron";
import { env } from "../config/env";
import { activeUserQuery } from "../lib/activeUserQuery";
import { toDateOnly, previousUtcWeekStart } from "../lib/week";
import { logger } from "../lib/logger";
import { UserModel } from "../models/user.model";
import { UserProfileModel } from "../models/userProfile.model";
import { WeeklyCheckinModel } from "../models/weeklyCheckin.model";
import { WeeklyVerdictModel } from "../models/weeklyVerdict.model";
import {
  calculateWeeklyVerdictWithExplanation,
  createNoDataVerdict,
  resolveWeeklyVerdictInputs,
} from "./verdict.service";

interface WeekTarget {
  weekOf: string;
}

interface NoDataDecisionInput {
  hasCheckin: boolean;
  hasVerdict: boolean;
}

export function getPreviousLeanientWeek(now = new Date()): WeekTarget {
  return {
    weekOf: toDateOnly(previousUtcWeekStart(now)),
  };
}

export function shouldCreateNoDataVerdict(input: NoDataDecisionInput): boolean {
  return !input.hasCheckin && !input.hasVerdict;
}

export async function runVerdictMaintenance(now = new Date()): Promise<{
  weekOf: string;
  computed: number;
  noData: number;
}> {
  const { weekOf } = getPreviousLeanientWeek(now);
  const users = await UserModel.find(activeUserQuery()).select("_id");
  let computed = 0;
  let noData = 0;

  for (const user of users) {
    const userId = user._id.toString();
    const [checkin, verdict] = await Promise.all([
      WeeklyCheckinModel.findOne({ userId, weekOf }),
      WeeklyVerdictModel.findOne({ userId, weekOf }),
    ]);

    if (checkin && !verdict) {
      const verdictInputs = await resolveWeeklyVerdictInputs({
        userId,
        weekOf,
        proteinGramsPerDay: checkin.proteinGramsPerDay,
        resistanceWorkoutsCompleted: checkin.resistanceWorkoutsCompleted,
      });

      const draft = await calculateWeeklyVerdictWithExplanation({
        userId,
        checkinId: checkin._id.toString(),
        weekOf,
        weight: checkin.weight,
        proteinGramsPerDay: verdictInputs.proteinGramsPerDay,
        resistanceWorkoutsCompleted: verdictInputs.resistanceWorkoutsCompleted,
        dataSource: verdictInputs.dataSource,
        userContextSnapshot: checkin.userContextSnapshot,
        source: "cron_backfill",
      });

      await WeeklyVerdictModel.create({
        ...draft,
        checkinId: checkin._id,
      });
      computed += 1;
      continue;
    }

    if (shouldCreateNoDataVerdict({ hasCheckin: Boolean(checkin), hasVerdict: Boolean(verdict) })) {
      const profile = await UserProfileModel.findOne({ userId });
      const draft = createNoDataVerdict({
        userId,
        weekOf,
        timezone: profile?.timezone ?? env.scheduler.timezone,
      });

      await WeeklyVerdictModel.create(draft);
      noData += 1;
    }
  }

  return {
    weekOf,
    computed,
    noData,
  };
}

export class LeanientScheduler {
  private static instance: LeanientScheduler;
  private task?: ScheduledTask;

  private constructor() {}

  public static getInstance(): LeanientScheduler {
    if (!LeanientScheduler.instance) {
      LeanientScheduler.instance = new LeanientScheduler();
    }

    return LeanientScheduler.instance;
  }

  public start(): void {
    if (this.task) {
      logger.info("[scheduler] Leanient scheduler already started");
      return;
    }

    this.task = cron.schedule(
      env.scheduler.weeklyVerdictCron,
      async () => {
        try {
          const result = await runVerdictMaintenance();
          logger.info(result, "[scheduler] weekly verdict maintenance complete");
        } catch (error) {
          logger.error({ error }, "[scheduler] weekly verdict maintenance failed");
        }
      },
      {
        timezone: env.scheduler.timezone,
      },
    );

    logger.info(
      {
        cron: env.scheduler.weeklyVerdictCron,
        timezone: env.scheduler.timezone,
      },
      "[scheduler] Leanient scheduler started",
    );
  }

  public stop(): void {
    this.task?.stop();
    this.task = undefined;
    logger.info("[scheduler] Leanient scheduler stopped");
  }
}
