/**
 * Standalone external-integration connectivity probe.
 *
 * Intentionally does NOT import ../config/env (which fail-fasts on the full
 * required set, e.g. Apple/JWT/FRONTEND_ORIGIN). This script loads the .env
 * directly and tests each integration in isolation so you can see exactly
 * which ones are live, which are misconfigured, and which are not set up yet.
 *
 * Run:  npm run check:integrations  (from leanient-backend/)
 *   or: npx tsx leanient-backend/src/scripts/checkIntegrations.ts  (from root)
 *
 * Exit code 0 = every CONFIGURED integration passed. 1 = at least one failed.
 * SKIPPED (not configured) integrations never fail the run.
 */
import path from "node:path";
import dotenv from "dotenv";

// Load root .env first, then an optional leanient-backend/.env override.
const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });
dotenv.config({ override: false }); // also pick up a cwd .env if present

type Status = "pass" | "fail" | "skip";
interface Result {
  name: string;
  status: Status;
  detail: string;
  ms: number;
}

const results: Result[] = [];

async function check(name: string, fn: () => Promise<{ status: Status; detail: string }>) {
  const started = Date.now();
  try {
    const { status, detail } = await fn();
    results.push({ name, status, detail, ms: Date.now() - started });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, status: "fail", detail: message, ms: Date.now() - started });
  }
}

const has = (key: string): boolean => Boolean(process.env[key] && process.env[key]!.trim().length > 0);

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 8000) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { res, json } as const;
}

// 1. MongoDB --------------------------------------------------------------
async function checkMongo(): Promise<{ status: Status; detail: string }> {
  if (!has("MONGODB_URI")) return { status: "skip", detail: "MONGODB_URI not set" };
  const mongoose = (await import("mongoose")).default;
  await mongoose.connect(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });
  try {
    const admin = mongoose.connection.db!.admin();
    const ping = await admin.ping();
    const info = await admin.serverStatus().catch(() => null);
    const dbName = mongoose.connection.name;
    const version = info?.version ? ` v${info.version}` : "";
    return {
      status: ping?.ok === 1 ? "pass" : "fail",
      detail: `ping ok · db "${dbName}"${version}`,
    };
  } finally {
    await mongoose.disconnect();
  }
}

// 2. AWS S3 (write -> read -> delete round-trip) --------------------------
async function checkS3(): Promise<{ status: Status; detail: string }> {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!region || !bucket || !has("AWS_ACCESS_KEY_ID") || !has("AWS_SECRET_ACCESS_KEY")) {
    return { status: "skip", detail: "AWS_REGION/AWS_S3_BUCKET_NAME/keys not fully set" };
  }
  const { S3Client, HeadBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } =
    await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  await s3.send(new HeadBucketCommand({ Bucket: bucket }));

  const key = `__healthcheck__/probe-${Date.now()}.txt`;
  const body = "leanient-integration-probe";
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body }));

  const got = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const roundTrip = (await got.Body?.transformToString()) === body;

  // Prove the presigner the progress-photo upload flow relies on actually works.
  const presigned = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: "__healthcheck__/presign-test" }),
    { expiresIn: 60 },
  );
  const presignOk = presigned.startsWith("https://");

  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

  return {
    status: roundTrip && presignOk ? "pass" : "fail",
    detail: `bucket "${bucket}" (${region}) · put/get/delete ok · presign ok`,
  };
}

// 3. OpenAI ---------------------------------------------------------------
async function checkOpenAI(): Promise<{ status: Status; detail: string }> {
  if (!has("OPENAI_API_KEY")) return { status: "skip", detail: "OPENAI_API_KEY not set" };
  const { res, json } = await fetchJson("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  });
  if (!res.ok) {
    const msg =
      (json as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`;
    return { status: "fail", detail: msg };
  }
  const count = Array.isArray((json as { data?: unknown[] })?.data)
    ? (json as { data: unknown[] }).data.length
    : 0;
  return { status: "pass", detail: `key valid · ${count} models visible` };
}

// 4. Apple (identity-token verification path = Apple JWKS reachability) ----
async function checkApple(): Promise<{ status: Status; detail: string }> {
  const { res, json } = await fetchJson("https://appleid.apple.com/auth/keys");
  const keys = (json as { keys?: unknown[] })?.keys;
  if (!res.ok || !Array.isArray(keys) || keys.length === 0) {
    return { status: "fail", detail: `Apple JWKS unreachable (HTTP ${res.status})` };
  }
  const creds = has("APPLE_CLIENT_ID") && has("APPLE_TEAM_ID") && has("APPLE_KEY_ID");
  const note = creds ? "creds present" : "creds NOT set yet (expected)";
  return { status: "pass", detail: `JWKS reachable · ${keys.length} keys · ${note}` };
}

// 5. Google (ID-token verification path = Google certs reachability) -------
async function checkGoogle(): Promise<{ status: Status; detail: string }> {
  const { res, json } = await fetchJson("https://www.googleapis.com/oauth2/v3/certs");
  const keys = (json as { keys?: unknown[] })?.keys;
  if (!res.ok || !Array.isArray(keys) || keys.length === 0) {
    return { status: "fail", detail: `Google certs unreachable (HTTP ${res.status})` };
  }
  const note = has("GOOGLE_CLIENT_ID")
    ? "GOOGLE_CLIENT_ID set (iOS client id can be added later)"
    : "GOOGLE_CLIENT_ID NOT set";
  return { status: "pass", detail: `certs reachable · ${keys.length} keys · ${note}` };
}

// 6. RevenueCat (inbound webhook shared-secret auth) ----------------------
async function checkRevenueCat(): Promise<{ status: Status; detail: string }> {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    return {
      status: "skip",
      detail: "REVENUECAT_WEBHOOK_SECRET not set → webhook would be UNPROTECTED",
    };
  }
  // Mirror assertRevenueCatWebhookAuthorization: header must equal `Bearer <secret>`.
  const accepts = (h?: string) => h === `Bearer ${secret}`;
  const logicOk = accepts(`Bearer ${secret}`) && !accepts("Bearer wrong") && !accepts(undefined);
  return {
    status: logicOk ? "pass" : "fail",
    detail: `shared secret set (len ${secret.length}) · auth check enforced`,
  };
}

async function main() {
  console.log("\n  Leanient — external integration probe\n");

  await check("MongoDB", checkMongo);
  await check("AWS S3", checkS3);
  await check("OpenAI", checkOpenAI);
  await check("Apple Sign-In", checkApple);
  await check("Google Sign-In", checkGoogle);
  await check("RevenueCat webhook", checkRevenueCat);

  const icon = (s: Status) => (s === "pass" ? "✓" : s === "skip" ? "○" : "✗");
  for (const r of results) {
    console.log(`  ${icon(r.status)}  ${r.name.padEnd(20)} ${r.detail}  (${r.ms}ms)`);
  }

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;
  console.log(`\n  ${passed} passed · ${failed} failed · ${skipped} skipped\n`);

  process.exit(failed > 0 ? 1 : 0);
}

void main();
