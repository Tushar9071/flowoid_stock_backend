import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import logger, { sanitize } from "../utils/logger";

const SENSITIVE_MODELS = new Set(["User", "Role", "Permission"]);

const delegateName = (model: string) =>
  `${model.charAt(0).toLowerCase()}${model.slice(1)}`;

const getCallerUserId = (args: any) =>
  args?.callerUserId ?? args?.deletedBy ?? args?.data?.updatedBy ?? null;

const logAuditEvent = async (
  basePrisma: PrismaClient,
  payload: {
    level?: "warn" | "error";
    message: string;
    model?: string;
    operation: string;
    count?: number;
    callerUserId?: string | null;
    meta?: Record<string, unknown>;
  },
) => {
  const level = payload.level ?? "warn";
  const meta = sanitize({
    model: payload.model,
    operation: payload.operation,
    count: payload.count,
    callerUserId: payload.callerUserId,
    timestamp: new Date().toISOString(),
    ...(payload.meta ?? {}),
  });

  logger.log(level, payload.message, {
    category: "db_audit",
    userId: payload.callerUserId ?? undefined,
    meta,
  });

  try {
    await (basePrisma as any).systemLog.create({
      data: {
        level,
        category: "db_audit",
        message: payload.message,
        userId: payload.callerUserId ?? null,
        meta: meta as any,
      },
    });
  } catch {
    // The Winston DB transport also attempts persistence; avoid throwing from audit hooks.
  }
};

export const createAuditLogExtension = (basePrisma: PrismaClient) =>
  Prisma.defineExtension({
    name: "audit-log-protection",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);

          if (!model) {
            return result;
          }

          const callerUserId = getCallerUserId(args);

          if (
            (operation === "delete" || operation === "deleteMany") &&
            Boolean((args as any)?.forceDelete)
          ) {
            const count =
              operation === "deleteMany"
                ? (result as { count?: number })?.count
                : 1;

            await logAuditEvent(basePrisma, {
              message: operation === "deleteMany" ? "Bulk delete attempted" : "Record deleted",
              model,
              operation,
              count,
              callerUserId,
            });
          }

          if (operation === "updateMany") {
            const count = (result as { count?: number })?.count ?? 0;
            if (count > 10) {
              await logAuditEvent(basePrisma, {
                message: "Bulk update affected more than 10 rows",
                model,
                operation,
                count,
                callerUserId,
              });
            }
          }

          if (
            SENSITIVE_MODELS.has(model) &&
            (operation === "create" ||
              operation === "update" ||
              operation === "upsert" ||
              operation === "updateMany")
          ) {
            await logAuditEvent(basePrisma, {
              message: "Sensitive model modified",
              model,
              operation,
              count: operation === "updateMany" ? (result as any)?.count : 1,
              callerUserId,
            });
          }

          return result;
        },
      },
    },
  });
