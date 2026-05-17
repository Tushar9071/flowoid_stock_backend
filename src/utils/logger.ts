import fs from "fs";
import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import TransportStream from "winston-transport";

type LogCategory =
  | "http"
  | "auth"
  | "db"
  | "db_audit"
  | "system"
  | "job"
  | "backup";

const LOG_DIR = path.resolve(process.cwd(), "logs");
const SERVICE_NAME = process.env.SERVICE_NAME || "flowoid-backend";
const DB_LEVELS = new Set(["warn", "error"]);
let dbLogWriteCount = 0;

fs.mkdirSync(LOG_DIR, { recursive: true });

const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "set-cookie",
  "secret",
  "apiKey",
  "access_token",
  "refresh_token",
];

const sanitize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEYS.some((sensitiveKey) =>
          key.toLowerCase().includes(sensitiveKey.toLowerCase()),
        )
          ? REDACTED
          : sanitize(item),
      ]),
    );
  }

  return value;
};

const normalizeMeta = (info: winston.Logform.TransformableInfo) => {
  const {
    level,
    message,
    timestamp,
    service,
    requestId,
    userId,
    category,
    meta,
    ip,
    endpoint,
    statusCode,
    duration,
    ...rest
  } = info;

  return {
    timestamp,
    level,
    service,
    requestId: requestId ?? null,
    userId: userId ?? null,
    category: category ?? "system",
    message,
    meta: sanitize(meta ?? rest ?? {}),
    ip,
    endpoint,
    statusCode,
    duration,
  };
};

class DbLoggerTransport extends TransportStream {
  log(info: winston.Logform.TransformableInfo, callback: () => void): void {
    setImmediate(() => this.emit("logged", info));

    if (process.env.LOG_TO_DB === "false") {
      callback();
      return;
    }

    const normalized = normalizeMeta(info);
    const shouldPersist =
      DB_LEVELS.has(String(normalized.level)) ||
      normalized.category === "db_audit" ||
      normalized.category === "backup";

    if (!shouldPersist) {
      callback();
      return;
    }

    import("../lib/prisma.js")
      .then((module) => {
        const prisma = (module as any).default;
        if (!prisma?.systemLog?.create) {
          return Promise.resolve();
        }

        return prisma.systemLog.create({
          data: {
            level: String(normalized.level),
            category: String(normalized.category),
            message: String(normalized.message),
            meta: normalized.meta as any,
            requestId: normalized.requestId ? String(normalized.requestId) : null,
            userId: normalized.userId ? String(normalized.userId) : null,
            ip: normalized.ip ? String(normalized.ip) : null,
            endpoint: normalized.endpoint ? String(normalized.endpoint) : null,
            statusCode:
              typeof normalized.statusCode === "number"
                ? normalized.statusCode
                : null,
            duration:
              typeof normalized.duration === "number" ? normalized.duration : null,
          },
        }).then(async () => {
          dbLogWriteCount += 1;
          const maxRows = Number.parseInt(process.env.DB_LOGS_MAX_ROWS || "100000", 10);
          if (dbLogWriteCount % 100 === 0 && Number.isFinite(maxRows) && maxRows > 0) {
            await prisma.$executeRawUnsafe(
              'DELETE FROM "system_logs" WHERE "id" IN (SELECT "id" FROM "system_logs" ORDER BY "createdAt" DESC OFFSET $1)',
              maxRows,
            );
          }
        });
      })
      .catch((error) => {
        process.stderr.write(
          `Failed to persist system log: ${
            error instanceof Error ? error.message : String(error)
          }\n`,
        );
      })
      .finally(callback);
  }
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format((info) => {
    info.service = SERVICE_NAME;
    if (!info.category) {
      info.category = "system";
    }
    return info;
  })(),
  winston.format.printf((info) => JSON.stringify(normalizeMeta(info))),
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: SERVICE_NAME },
  transports: [
    new winston.transports.Console({ format: jsonFormat }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      format: jsonFormat,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      format: jsonFormat,
    }),
    new DailyRotateFile({
      filename: path.join(LOG_DIR, "application-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      maxSize: "20m",
      format: jsonFormat,
    }),
    new DbLoggerTransport(),
  ],
});

export type { LogCategory };
export { sanitize };
export default logger;
