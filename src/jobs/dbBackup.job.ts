import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import logger from "../utils/logger";
import { runBackup } from "../modules/admin/backup.service";

let scheduledTask: ScheduledTask | null = null;

export const startDbBackupJob = () => {
  if (scheduledTask) {
    return scheduledTask;
  }

  const schedule = process.env.BACKUP_SCHEDULE || "0 2 * * *";

  if (!cron.validate(schedule)) {
    logger.error("Invalid BACKUP_SCHEDULE; database backup job not started", {
      category: "backup",
      meta: { schedule },
    });
    return null;
  }

  scheduledTask = cron.schedule(schedule, async () => {
    try {
      await runBackup();
    } catch (error) {
      logger.error("Scheduled database backup failed", {
        category: "backup",
        meta: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  });

  logger.info("Database backup job scheduled", {
    category: "backup",
    meta: { schedule },
  });

  return scheduledTask;
};
