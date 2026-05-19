import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional(),
);

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

const positiveDecimalNumber = decimalNumber.refine(
  (value) => value > 0,
  "Value must be greater than 0",
);

const optionalPositiveDecimalNumber = z.preprocess((value) => {
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
}, z.number().finite().positive().optional());

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

const designStatuses = ["ACTIVE", "DISCONTINUED", "DRAFT"] as const;

export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const categoryParamsSchema = tenantParamsSchema.extend({
  id: z.string().uuid("Design category ID must be a valid UUID"),
});

export const designParamsSchema = tenantParamsSchema.extend({
  id: z.string().uuid("Design ID must be a valid UUID"),
});

export const designNeedParamsSchema = designParamsSchema.extend({
  needId: z.string().uuid("Design supplementary need ID must be a valid UUID"),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name must be at least 2 characters").max(120),
  sortOrder: z.coerce.number().int("Sort order must be a whole number").default(0),
});

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(120)
      .optional(),
    sortOrder: z.coerce.number().int("Sort order must be a whole number").optional(),
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

export const createDesignSchema = z.object({
  categoryId: z.string().uuid("Category ID must be a valid UUID"),
  designCode: z.string().trim().min(1, "Design code is required").max(120),
  name: z.string().trim().min(2, "Design name must be at least 2 characters").max(160),
  description: optionalTrimmedString,
  diamondCount: z.coerce
    .number()
    .int("Diamond count must be a whole number")
    .min(0, "Diamond count cannot be negative"),
  pieceRateRs: positiveDecimalNumber,
  salePriceRs: positiveDecimalNumber,
  imageUrl: optionalTrimmedString,
  status: z.enum(designStatuses).default("ACTIVE"),
  notes: optionalTrimmedString,
});

export const updateDesignSchema = z
  .object({
    categoryId: z.string().uuid("Category ID must be a valid UUID").optional(),
    designCode: z.string().trim().min(1, "Design code is required").max(120).optional(),
    name: z
      .string()
      .trim()
      .min(2, "Design name must be at least 2 characters")
      .max(160)
      .optional(),
    description: optionalTrimmedString,
    diamondCount: z.coerce
      .number()
      .int("Diamond count must be a whole number")
      .min(0, "Diamond count cannot be negative")
      .optional(),
    pieceRateRs: optionalPositiveDecimalNumber,
    salePriceRs: optionalPositiveDecimalNumber,
    imageUrl: optionalTrimmedString,
    status: z.enum(designStatuses).optional(),
    notes: optionalTrimmedString,
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided for update",
      });
    }
  });

export const updateDesignStatusSchema = z.object({
  status: z.enum(designStatuses),
});

export const createSupplementaryNeedSchema = z.object({
  materialTypeId: z.string().uuid("Material type ID must be a valid UUID"),
  quantityPerPiece: positiveDecimalNumber,
  notes: optionalTrimmedString,
});

export const updateSupplementaryNeedSchema = z
  .object({
    quantityPerPiece: optionalPositiveDecimalNumber,
    notes: optionalTrimmedString,
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided for update",
      });
    }
  });

export const listDesignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  categoryId: z.string().uuid("Category ID must be a valid UUID").optional(),
  status: z.enum(designStatuses).optional(),
  search: optionalTrimmedString,
});

export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: optionalBoolean,
});

export type TenantParams = z.infer<typeof tenantParamsSchema>;
export type CategoryParams = z.infer<typeof categoryParamsSchema>;
export type DesignParams = z.infer<typeof designParamsSchema>;
export type DesignNeedParams = z.infer<typeof designNeedParamsSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateDesignInput = z.infer<typeof createDesignSchema>;
export type UpdateDesignInput = z.infer<typeof updateDesignSchema>;
export type UpdateDesignStatusInput = z.infer<typeof updateDesignStatusSchema>;
export type CreateSupplementaryNeedInput = z.infer<typeof createSupplementaryNeedSchema>;
export type UpdateSupplementaryNeedInput = z.infer<typeof updateSupplementaryNeedSchema>;
export type ListDesignsQuery = z.infer<typeof listDesignsQuerySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;
