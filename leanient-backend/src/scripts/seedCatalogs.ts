import { connect, disconnect } from "../db/mongo";
import { logger } from "../lib/logger";

async function main(): Promise<void> {
  await connect();
  await disconnect();
  logger.info("[seed] Leanient catalogs ensured");
}

main().catch(async (error) => {
  logger.error({ error }, "[seed] failed to seed Leanient catalogs");
  await disconnect();
  process.exit(1);
});
