import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
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

export const listBackups = async () => {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
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

  return new Promise<{ status: "success"; finishedAt: Date; output: string }>((resolve, reject) => {
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
      lastInMemoryStatus = {
        status: "failed",
        time: new Date(),
        message: error.message,
      };
      logger.error("Database backup failed to start", {
        category: "backup",
        meta: { error: error.message },
      });
      reject(error);
    });

    child.on("close", async (code) => {
      const finishedAt = new Date();

      if (code === 0) {
        lastInMemoryStatus = { status: "success", time: finishedAt };
        logger.info("Database backup completed", {
          category: "backup",
          meta: { stdout },
        });
        await prisma.systemLog.create({
          data: {
            level: "info",
            category: "backup",
            message: "Database backup completed",
            meta: { stdout },
          },
        });
        resolve({ status: "success", finishedAt, output: stdout });
        return;
      }

      lastInMemoryStatus = {
        status: "failed",
        time: finishedAt,
        message: stderr || `Backup exited with code ${code}`,
      };
      logger.error("Database backup failed", {
        category: "backup",
        meta: { code, stdout, stderr },
      });
      await prisma.systemLog.create({
        data: {
          level: "error",
          category: "backup",
          message: "Database backup failed",
          meta: { code, stdout, stderr },
        },
      });
      reject(new Error(stderr || `Backup exited with code ${code}`));
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
