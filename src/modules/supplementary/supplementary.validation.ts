import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional(),
);

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  return value;
}, z.boolean().optional());

const decimalNumber = z.preprocess((value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().finite());

const optionalNonNegativeDecimalNumber = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().finite().nonnegative().optional());

export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const supplementaryTypeParamsSchema = tenantParamsSchema.extend({
  id: z.string().uuid("Supplementary material type ID must be a valid UUID"),
});

export const createSupplementaryTypeSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(160),
  unit: z.string().trim().min(1, "Unit is required").max(60),
  description: optionalTrimmedString,
  stockQuantity: optionalNonNegativeDecimalNumber.default(0),
});

export const updateSupplementaryTypeSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(160).optional(),
    unit: z.string().trim().min(1, "Unit is required").max(60).optional(),
    description: optionalTrimmedString,
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided for update",
      });
    }
  });

export const adjustStockSchema = z.object({
  adjustment: decimalNumber,
  notes: optionalTrimmedString,
});

export const listSupplementaryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalTrimmedString,
  isActive: optionalBoolean,
});

export type TenantParams = z.infer<typeof tenantParamsSchema>;
export type SupplementaryTypeParams = z.infer<typeof supplementaryTypeParamsSchema>;
export type CreateSupplementaryTypeInput = z.infer<typeof createSupplementaryTypeSchema>;
export type UpdateSupplementaryTypeInput = z.infer<typeof updateSupplementaryTypeSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ListSupplementaryQuery = z.infer<typeof listSupplementaryQuerySchema>;
