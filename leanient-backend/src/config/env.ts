import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load a local .env (process cwd, e.g. leanient-backend/.env) if present, then
// backfill from the monorepo root .env. dotenv never overrides already-set
// values, so process env / a local .env always wins over the root file. In
// hosted envs (Render) where vars come from the dashboard, both calls no-op.
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().min(1).default("30d"),
    GOOGLE_CLIENT_ID: z.string().min(1),
    APPLE_CLIENT_ID: z.string().min(1).optional(),
    APPLE_TEAM_ID: z.string().min(1).optional(),
    APPLE_KEY_ID: z.string().min(1).optional(),
    APPLE_PRIVATE_KEY: z.string().optional(),
    APPLE_PRIVATE_KEY_BASE64: z.string().optional(),
    FRONTEND_ORIGIN: z.string().url(),
    AWS_REGION: z.string().min(1).optional(),
    AWS_S3_BUCKET_NAME: z.string().min(1).optional(),
    AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    NUTRITIONIX_APP_ID: z.string().min(1).optional(),
    NUTRITIONIX_APP_KEY: z.string().min(1).optional(),
    REVENUECAT_WEBHOOK_SECRET: z.string().min(1).optional(),
    APPLE_APP_SPECIFIC_SHARED_SECRET: z.string().min(1).optional(),
    SCHEDULER_TIMEZONE: z.string().min(1).default("America/New_York"),
    WEEKLY_VERDICT_CRON: z.string().min(1).default("0 8 * * 1"),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production") {
      const requiredProductionKeys = [
        "AWS_REGION",
        "AWS_S3_BUCKET_NAME",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "REVENUECAT_WEBHOOK_SECRET",
      ] as const;

      for (const key of requiredProductionKeys) {
        if (!value[key]) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required in production`,
          });
        }
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.flatten().fieldErrors;
  console.error("[env] Invalid environment configuration:", formatted);
  throw new Error("Invalid environment configuration");
}

function normalizeApplePrivateKey(value: {
  APPLE_PRIVATE_KEY?: string;
  APPLE_PRIVATE_KEY_BASE64?: string;
}): string {
  const raw = value.APPLE_PRIVATE_KEY_BASE64
    ? Buffer.from(value.APPLE_PRIVATE_KEY_BASE64, "base64").toString("utf8")
    : (value.APPLE_PRIVATE_KEY ?? "");

  return raw.replace(/\\n/g, "\n");
}

const nodeEnv = parsed.data.NODE_ENV;
const applePrivateKey =
  parsed.data.APPLE_PRIVATE_KEY ?? parsed.data.APPLE_PRIVATE_KEY_BASE64;
const apple =
  parsed.data.APPLE_CLIENT_ID &&
  parsed.data.APPLE_TEAM_ID &&
  parsed.data.APPLE_KEY_ID &&
  applePrivateKey
    ? {
        clientId: parsed.data.APPLE_CLIENT_ID,
        teamId: parsed.data.APPLE_TEAM_ID,
        keyId: parsed.data.APPLE_KEY_ID,
        privateKey: normalizeApplePrivateKey(parsed.data),
      }
    : null;

export const env = {
  nodeEnv,
  isDevelopment: nodeEnv === "development",
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: parsed.data.PORT,
  mongoUri: parsed.data.MONGODB_URI,
  jwt: {
    secret: parsed.data.JWT_SECRET,
    expiresIn: parsed.data.JWT_EXPIRES_IN,
  },
  google: {
    clientId: parsed.data.GOOGLE_CLIENT_ID,
  },
  apple,
  frontendOrigin: parsed.data.FRONTEND_ORIGIN,
  aws: {
    region: parsed.data.AWS_REGION,
    bucketName: parsed.data.AWS_S3_BUCKET_NAME,
    accessKeyId: parsed.data.AWS_ACCESS_KEY_ID,
    secretAccessKey: parsed.data.AWS_SECRET_ACCESS_KEY,
  },
  openai: {
    apiKey: parsed.data.OPENAI_API_KEY,
  },
  nutritionix: {
    appId: parsed.data.NUTRITIONIX_APP_ID,
    appKey: parsed.data.NUTRITIONIX_APP_KEY,
  },
  revenueCat: {
    webhookSecret: parsed.data.REVENUECAT_WEBHOOK_SECRET,
  },
  appStore: {
    sharedSecret: parsed.data.APPLE_APP_SPECIFIC_SHARED_SECRET,
  },
  scheduler: {
    timezone: parsed.data.SCHEDULER_TIMEZONE,
    weeklyVerdictCron: parsed.data.WEEKLY_VERDICT_CRON,
  },
} as const;
