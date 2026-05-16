import { Prisma, PrismaClient } from "@prisma/client";
import logger from "../utils/logger";

const SOFT_DELETE_MODELS = new Set([
  "User",
  "Tenant",
  "Party",
  "RawMaterialType",
  "RawMaterialPurchase",
  "Permission",
  "Role",
  "Worker",
  "Design",
  "SupplementaryMaterialType",
  "Order",
  "Payment",
]);

const delegateName = (model: string) =>
  `${model.charAt(0).toLowerCase()}${model.slice(1)}`;

const addDeletedAtFilter = (args: any) => ({
  ...args,
  where: {
    ...(args?.where ?? {}),
    deletedAt: args?.where?.deletedAt ?? null,
  },
});

export const createSoftDeleteExtension = (basePrisma: PrismaClient) =>
  Prisma.defineExtension({
    name: "soft-delete-protection",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SOFT_DELETE_MODELS.has(model)) {
            return query(args);
          }

          const delegate = (basePrisma as any)[delegateName(model)];

          if (operation === "delete" || operation === "deleteMany") {
            const forceDelete = Boolean((args as any)?.forceDelete);
            const callerRole = (args as any)?.callerRole;
            const deletedBy = (args as any)?.deletedBy ?? (args as any)?.callerUserId;
            const { forceDelete: _forceDelete, callerRole: _callerRole, callerUserId: _callerUserId, deletedBy: _deletedBy, ...cleanArgs } =
              args as any;

            if (forceDelete && callerRole === "SUPER_ADMIN") {
              return query(cleanArgs);
            }

            logger.warn(operation === "deleteMany" ? "Bulk delete attempted" : "Record deleted", {
              category: "db_audit",
              userId: deletedBy,
              meta: {
                model,
                operation,
                callerUserId: deletedBy,
                timestamp: new Date().toISOString(),
              },
            });

            const data = {
              deletedAt: new Date(),
              ...(deletedBy ? { deletedBy } : {}),
            };

            if (operation === "delete") {
              return delegate.update({
                where: cleanArgs.where,
                data,
              });
            }

            return delegate.updateMany({
              where: cleanArgs.where,
              data,
            });
          }

          if (
            operation === "findMany" ||
            operation === "findFirst" ||
            operation === "count" ||
            operation === "aggregate" ||
            operation === "groupBy"
          ) {
            return query(addDeletedAtFilter(args));
          }

          if (operation === "findUnique" || operation === "findUniqueOrThrow") {
            const result = await query(args);
            if (result && (result as any).deletedAt) {
              return operation === "findUniqueOrThrow"
                ? Promise.reject(new Prisma.PrismaClientKnownRequestError("Record not found", {
                    code: "P2025",
                    clientVersion: Prisma.prismaVersion.client,
                  }))
                : null;
            }
            return result;
          }

          return query(args);
        },
      },
    },
  });

export { SOFT_DELETE_MODELS };
