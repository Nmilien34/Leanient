import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { ERROR_CODES } from "@leanient/shared";
import { env } from "./config/env";
import { connect, disconnect, isDatabaseReachable } from "./db/mongo";
import { AppError } from "./lib/errors";
import { logger } from "./lib/logger";
import { createHealthRouter } from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import diagnosticsRoutes from "./routes/diagnostics.routes";
import doseLogRoutes from "./routes/doseLog.routes";
import homeRoutes from "./routes/home.routes";
import mealLogRoutes from "./routes/mealLog.routes";
import mealScansRoutes from "./routes/mealScans.routes";
import measurementLogRoutes from "./routes/measurementLog.routes";
import meRoutes from "./routes/me.routes";
import medicationRoutes from "./routes/medication.routes";
import onboardingRoutes from "./routes/onboarding.routes";
import progressRoutes from "./routes/progress.routes";
import progressPhotoRoutes from "./routes/progressPhoto.routes";
import sideEffectLogRoutes from "./routes/sideEffectLog.routes";
import trainingRoutes from "./routes/training.routes";
import webhookRoutes from "./routes/webhook.routes";
import weeklyCheckinRoutes from "./routes/weeklyCheckin.routes";
import weeklyVerdictRoutes from "./routes/weeklyVerdict.routes";
import weightLogRoutes from "./routes/weightLog.routes";
import workoutLogRoutes from "./routes/workoutLog.routes";
import workoutRoutes from "./routes/workout.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { createInMemoryRateLimiter } from "./middleware/rateLimit.middleware";
import { requestLogger } from "./middleware/requestLogger.middleware";
import { LeanientScheduler } from "./services/scheduler.service";

interface CreateAppOptions {
  healthCheck?: () => Promise<boolean>;
}

const LOCAL_ORIGIN_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

function corsOptions(): CorsOptions {
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowedOrigin = origin === env.frontendOrigin;
      const isLocalDevOrigin = env.isDevelopment && LOCAL_ORIGIN_PATTERN.test(origin);

      if (isAllowedOrigin || isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      callback(
        new AppError({
          code: ERROR_CODES.badRequest,
          message: "Origin is not allowed by CORS",
          statusCode: 403,
        }),
      );
    },
  };
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const healthCheck = options.healthCheck ?? isDatabaseReachable;

  app.disable("x-powered-by");
  app.disable("etag");
  app.use(helmet());
  app.use(cors(corsOptions()));
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(requestLogger);
  app.use("/meal-scans", express.json({ limit: "14mb" }), mealScansRoutes);
  app.use(express.json({ limit: "1mb" }));

  app.use(createHealthRouter(healthCheck));
  app.use("/auth", createInMemoryRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 30 }));
  app.use("/auth", authRoutes);
  app.use("/me", meRoutes);
  app.use("/onboarding", onboardingRoutes);
  app.use("/home", homeRoutes);
  app.use("/weight-logs", weightLogRoutes);
  app.use("/meal-logs", mealLogRoutes);
  app.use("/workout-logs", workoutLogRoutes);
  app.use("/dose-logs", doseLogRoutes);
  app.use("/measurement-logs", measurementLogRoutes);
  app.use("/side-effect-logs", sideEffectLogRoutes);
  app.use("/weekly-checkins", weeklyCheckinRoutes);
  app.use("/weekly-verdicts", weeklyVerdictRoutes);
  app.use("/diagnostics", diagnosticsRoutes);
  app.use("/progress", progressRoutes);
  app.use("/training", trainingRoutes);
  app.use("/workouts", workoutRoutes);
  app.use("/medications", medicationRoutes);
  app.use("/progress-photos", progressPhotoRoutes);
  app.use("/webhooks", webhookRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function start(): Promise<void> {
  await connect();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, "[server] Leanient API listening");
  });
  const scheduler = LeanientScheduler.getInstance();

  if (!env.isTest) {
    scheduler.start();
  }

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info({ signal }, "[server] shutting down");
    server.close(async () => {
      scheduler.stop();
      await disconnect();
      process.exit(0);
    });
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

if (require.main === module) {
  start().catch((error) => {
    logger.error({ error }, "[server] failed to start");
    process.exit(1);
  });
}

export default createApp;
