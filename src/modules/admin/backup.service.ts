import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { Prisma } from "@prisma/client";
import { AppError } from "../../common/errors/app-error";
import prisma from "../../lib/prisma";
import logger from "../../utils/logger";

const BACKUP_DIR = process.env.BACKUP_DIR || "/var/backups/flowoid";
const BACKUP_SCRIPT = path.resolve(process.cwd(), "scripts", "backup-db.sh");

let lastInMemoryStatus: {
  status: "success" | "failed" | "running";
  time: Date;
  message?: string;
} | null = null;

const formatFileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)}MB`;

const toErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const toBackupError = (message: string, details?: unknown) =>
  new AppError(503, message, "BACKUP_OPERATION_FAILED", details);

const writeBackupLog = async (
  level: "info" | "error",
  message: string,
  meta: Prisma.InputJsonObject,
) => {
  try {
    await prisma.systemLog.create({
      data: {
        level,
        category: "backup",
        message,
        meta,
      },
    });
  } catch (error) {
    logger.warn("Could not write backup event to database", {
      category: "backup",
      meta: {
        level,
        message,
        error: toErrorMessage(error),
      },
    });
  }
};

export const listBackups = async () => {
  let entries;

  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
  } catch (error) {
    throw toBackupError("Backup directory is not readable or writable", {
      backupDir: BACKUP_DIR,
      error: toErrorMessage(error),
    });
  }

  const backups = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".sql.gz"))
      .map(async (entry) => {
        const filePath = path.join(BACKUP_DIR, entry.name);
        const stat = await fs.stat(filePath);
        return {
          fileName: entry.name,
          path: filePath,
          size: stat.size,
          sizeFormatted: formatFileSize(stat.size),
          date: stat.mtime,
        };
      }),
  );

  return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const runBackup = async () => {
  lastInMemoryStatus = { status: "running", time: new Date() };

  try {
    await fs.access(BACKUP_SCRIPT);
  } catch (error) {
    const message = "Backup script is missing or not accessible";
    lastInMemoryStatus = {
      status: "failed",
      time: new Date(),
      message,
    };
    logger.error(message, {
      category: "backup",
      meta: { backupScript: BACKUP_SCRIPT, error: toErrorMessage(error) },
    });
    throw toBackupError(message, { backupScript: BACKUP_SCRIPT });
  }

  return new Promise<{ status: "success"; finishedAt: Date; output: string }>((resolve, reject) => {
    let settled = false;
    const child = spawn("bash", [BACKUP_SCRIPT], {
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", async (error) => {
      if (settled) return;
      settled = true;

      const message = "Database backup failed to start";
      lastInMemoryStatus = {
        status: "failed",
        time: new Date(),
        message: error.message,
      };
      logger.error(message, {
        category: "backup",
        meta: { backupScript: BACKUP_SCRIPT, error: error.message },
      });
      reject(toBackupError(message, { backupScript: BACKUP_SCRIPT, error: error.message }));
    });

    child.on("close", async (code) => {
      if (settled) return;
      settled = true;

      const finishedAt = new Date();

      if (code === 0) {
        lastInMemoryStatus = { status: "success", time: finishedAt };
        logger.info("Database backup completed", {
          category: "backup",
          meta: { stdout },
        });
        await writeBackupLog("info", "Database backup completed", { stdout });
        resolve({ status: "success", finishedAt, output: stdout });
        return;
      }

      const message = stderr.trim() || `Backup exited with code ${code}`;
      lastInMemoryStatus = {
        status: "failed",
        time: finishedAt,
        message,
      };
      logger.error("Database backup failed", {
        category: "backup",
        meta: { code, stdout, stderr },
      });
      await writeBackupLog("error", "Database backup failed", { code, stdout, stderr });
      reject(toBackupError(message, { code, stdout, stderr }));
    });
  });
};

export const getBackupStatus = async () => {
  let lastBackupLog: Awaited<ReturnType<typeof prisma.systemLog.findFirst>> = null;

  try {
    lastBackupLog = await prisma.systemLog.findFirst({
      where: { category: "backup" },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.warn("Could not read backup status from database", {
      category: "backup",
      meta: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  return {
    lastBackupTime: lastBackupLog?.createdAt ?? lastInMemoryStatus?.time ?? null,
    nextScheduledBackup: process.env.BACKUP_SCHEDULE || "0 2 * * *",
    status:
      lastInMemoryStatus?.status ??
      (lastBackupLog?.level === "error" ? "failed" : lastBackupLog ? "success" : "unknown"),
    message: lastInMemoryStatus?.message ?? lastBackupLog?.message ?? null,
  };
};

export { BACKUP_DIR };
