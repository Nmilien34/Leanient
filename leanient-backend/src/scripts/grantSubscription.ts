/**
 * Grant (or revoke) a subscription entitlement for a single user, for testing.
 *
 * The coach chat and stall diagnostic are gated behind an active subscription
 * (subscriptionStatus in {"trialing","active"}). New accounts default to "free",
 * so a fresh test account cannot reach those features until its status is set.
 * This script flips one user to a given status without going through RevenueCat.
 *
 * Intentionally does NOT import ../config/env (which fail-fasts on the full
 * required set). It loads .env directly, like checkIntegrations.ts.
 *
 * Run from leanient-backend/:
 *   npm run grant:subscription -- <email-or-userId> [status] [days]
 * or from repo root:
 *   npx tsx leanient-backend/src/scripts/grantSubscription.ts <email-or-userId> [status] [days]
 *
 * Examples:
 *   npm run grant:subscription -- nickson.milien@lawnstack.com
 *   npm run grant:subscription -- nickson.milien@lawnstack.com trialing 30
 *   npm run grant:subscription -- 665f0c2a1b2c3d4e5f6a7b8c active 365
 *   npm run grant:subscription -- nickson.milien@lawnstack.com free      # revoke
 *
 * On Render: open the leanient-backend service Shell and run the npx form
 * (MONGODB_URI is already in that environment).
 */
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";

const repoRoot = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(repoRoot, ".env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });
dotenv.config({ override: false });

const VALID_STATUSES = [
  "free",
  "trialing",
  "active",
  "active_canceled",
  "past_due",
  "canceled",
  "refunded",
] as const;
type Status = (typeof VALID_STATUSES)[number];

const ENTITLED_STATUSES = new Set<Status>(["trialing", "active", "active_canceled"]);

async function main(): Promise<void> {
  const [identifierArg, statusArg = "trialing", daysArg = "30"] = process.argv.slice(2);

  if (!identifierArg) {
    console.error(
      "Usage: grant:subscription -- <email-or-userId> [status] [days]\n" +
        `  status one of: ${VALID_STATUSES.join(", ")} (default: trialing)\n` +
        "  days: entitlement length for entitled statuses (default: 30)",
    );
    process.exit(1);
  }

  const status = statusArg as Status;
  if (!VALID_STATUSES.includes(status)) {
    console.error(`Invalid status "${statusArg}". Valid: ${VALID_STATUSES.join(", ")}`);
    process.exit(1);
  }

  const days = Number.parseInt(daysArg, 10);
  if (Number.isNaN(days) || days <= 0) {
    console.error(`Invalid days "${daysArg}". Provide a positive integer.`);
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Run from Render shell or set it in .env.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  });

  try {
    // Query the collection directly so we do not need to import the full model
    // (and its schema-validation side effects) for a one-off admin write.
    const users = mongoose.connection.collection("users");
    const isObjectId = mongoose.isValidObjectId(identifierArg);
    const query = isObjectId
      ? { _id: new mongoose.Types.ObjectId(identifierArg) }
      : { email: identifierArg.trim().toLowerCase() };

    const before = await users.findOne(query);
    if (!before) {
      console.error(
        `No user matched ${isObjectId ? "_id" : "email"} "${identifierArg}".\n` +
          "Tip: pass the exact email used to sign up, or the user's _id.",
      );
      process.exit(1);
    }

    const entitled = ENTITLED_STATUSES.has(status);
    const entitlementExpiresAt = entitled
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;

    await users.updateOne(query, {
      $set: {
        subscriptionStatus: status,
        subscriptionWillRenew: status === "active" || status === "trialing",
        entitlementExpiresAt,
        updatedAt: new Date(),
      },
    });

    const after = await users.findOne(query);
    console.log("User updated:");
    console.log(`  _id:     ${String(after?._id)}`);
    console.log(`  email:   ${after?.email ?? "(none)"}`);
    console.log(`  status:  ${before.subscriptionStatus} -> ${after?.subscriptionStatus}`);
    console.log(
      `  expires: ${
        after?.entitlementExpiresAt
          ? new Date(after.entitlementExpiresAt).toISOString()
          : "(none)"
      }`,
    );
    console.log(
      entitled
        ? "\nDone. The coach chat and stall diagnostic are now reachable for this user."
        : "\nDone. Entitlement revoked for this user.",
    );
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error("grant:subscription failed:", error);
  process.exitCode = 1;
  void mongoose.disconnect();
});
