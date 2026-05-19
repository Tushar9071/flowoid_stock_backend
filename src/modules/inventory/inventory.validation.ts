import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional(),
);

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }

  return value;
}, z.date().optional());


export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const stockParamsSchema = tenantParamsSchema.extend({
  designId: z.string().uuid("Design ID must be a valid UUID"),
});

export const packagingBatchParamsSchema = tenantParamsSchema.extend({
  batchId: z.string().uuid("Packaging batch ID must be a valid UUID"),
});

export const listStockQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  designId: z.string().uuid("Design ID must be a valid UUID").optional(),
  categoryId: z.string().uuid("Category ID must be a valid UUID").optional(),
});

export const createPackagingBatchSchema = z
  .object({
    designId: z.string().uuid("Design ID must be a valid UUID"),
    piecesPackaged: z.coerce
      .number()
      .int("Pieces packaged must be a whole number")
      .positive("Pieces packaged must be greater than 0"),
    notes: optionalTrimmedString,
  })
  .strict();

export const listPackagingBatchesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    designId: z.string().uuid("Design ID must be a valid UUID").optional(),
    dateFrom: optionalDate,
    dateTo: optionalDate,
  })
  .superRefine((data, ctx) => {
    if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "dateTo must be greater than or equal to dateFrom",
      });
    }
  });

export const createStockAdjustmentSchema = z
  .object({
    type: z.enum(["UNPACKAGED", "PACKAGED"]),
    adjustment: z.coerce
      .number()
      .int("Adjustment must be a whole number")
      .refine((value) => value !== 0, "Adjustment cannot be zero"),
    notes: z.string().trim().min(1, "Adjustment notes are required"),
  })
  .strict();

export type TenantParams = z.infer<typeof tenantParamsSchema>;
export type StockParams = z.infer<typeof stockParamsSchema>;
export type PackagingBatchParams = z.infer<typeof packagingBatchParamsSchema>;
export type ListStockQuery = z.infer<typeof listStockQuerySchema>;
export type CreatePackagingBatchInput = z.infer<typeof createPackagingBatchSchema>;
export type ListPackagingBatchesQuery = z.infer<
  typeof listPackagingBatchesQuerySchema
>;
export type CreateStockAdjustmentInput = z.infer<typeof createStockAdjustmentSchema>;
