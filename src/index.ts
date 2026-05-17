import "dotenv/config";

import http from "http";
import app from "./app";
import { startDbBackupJob } from "./jobs/dbBackup.job";
import prisma from "./lib/prisma";
import { initializeMonitoringSocket } from "./socket/monitoring.socket";
import logger from "./utils/logger";

const PORT = process.env.PORT || 8000;

async function main() {
  await prisma.$connect();
  logger.info("PostgreSQL connected via Prisma", { category: "system" });

  const server = http.createServer(app);
  initializeMonitoringSocket(server);
  startDbBackupJob();

  const shutdown = (reason: string, error?: unknown) => {
    logger.error(reason, {
      category: "system",
      meta: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    });

    server.close(async () => {
      await prisma.$disconnect();
      process.exit(1);
    });

    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("uncaughtException", (error) => {
    shutdown("Uncaught exception", error);
  });

  process.on("unhandledRejection", (reason) => {
    shutdown("Unhandled promise rejection", reason);
  });

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`, { category: "system" });
  });
}

main().catch((error) => {
  logger.error("Failed to start server", {
    category: "system",
    meta: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  });
  process.exit(1);
});
