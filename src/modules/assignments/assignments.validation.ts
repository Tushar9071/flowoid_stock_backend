import { z } from "zod";

const assignmentStatuses = [
  "ISSUED",
  "IN_PROGRESS",
  "PARTIALLY_RETURNED",
  "COMPLETED",
  "CLOSED",
] as const;

const manualAssignmentStatuses = ["IN_PROGRESS"] as const;

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

const positiveDecimalNumber = z.preprocess((value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().finite().positive());

export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const assignmentParamsSchema = tenantParamsSchema.extend({
  id: z.string().uuid("Assignment ID must be a valid UUID"),
});

export const goodsReturnParamsSchema = tenantParamsSchema.extend({
  returnId: z.string().uuid("Goods return ID must be a valid UUID"),
});

export const createAssignmentSchema = z.object({
  workerId: z.string().uuid("Worker ID must be a valid UUID"),
  designId: z.string().uuid("Design ID must be a valid UUID"),
  rawMaterials: z
    .array(
      z.object({
        rawMaterialTypeId: z.string().uuid("Raw material type ID must be a valid UUID"),
        rawMaterialQty: positiveDecimalNumber,
      }),
    )
    .min(1, "At least one raw material is required")
    .superRefine((items, ctx) => {
      const seenMaterialTypeIds = new Set<string>();

      items.forEach((item, index) => {
        if (seenMaterialTypeIds.has(item.rawMaterialTypeId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, "rawMaterialTypeId"],
            message: "Raw material type cannot be repeated in the same assignment",
          });
          return;
        }

        seenMaterialTypeIds.add(item.rawMaterialTypeId);
      });
    }),
  expectedPieces: z.coerce
    .number()
    .int("Expected pieces must be a whole number")
    .positive("Expected pieces must be greater than 0"),
  expectedReturnDate: optionalDate,
  notes: optionalTrimmedString,
});

export const updateAssignmentSchema = z
  .object({
    expectedReturnDate: optionalDate,
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

export const updateAssignmentStatusSchema = z.object({
  status: z.enum(manualAssignmentStatuses),
});

export const closeAssignmentSchema = z.object({
  notes: z.string().trim().min(1, "Closure reason is required"),
});

export const createGoodsReturnSchema = z
  .object({
    piecesReturned: z.coerce
      .number()
      .int("Pieces returned must be a whole number")
      .positive("Pieces returned must be greater than 0"),
    rejectedPieces: z.coerce
      .number()
      .int("Rejected pieces must be a whole number")
      .min(0, "Rejected pieces cannot be negative")
      .default(0),
    rejectionNotes: optionalTrimmedString,
    notes: optionalTrimmedString,
    returnedAt: optionalDate,
  })
  .superRefine((data, ctx) => {
    if (data.rejectedPieces > data.piecesReturned) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectedPieces"],
        message: "Rejected pieces cannot exceed pieces returned",
      });
    }

    if (data.rejectedPieces > 0 && !data.rejectionNotes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionNotes"],
        message: "Rejection notes are required when rejected pieces are greater than 0",
      });
    }
  });

export const listAssignmentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    workerId: z.string().uuid("Worker ID must be a valid UUID").optional(),
    designId: z.string().uuid("Design ID must be a valid UUID").optional(),
    status: z.enum(assignmentStatuses).optional(),
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

export const listGoodsReturnsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    assignmentId: z.string().uuid("Assignment ID must be a valid UUID").optional(),
    workerId: z.string().uuid("Worker ID must be a valid UUID").optional(),
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

export type TenantParams = z.infer<typeof tenantParamsSchema>;
export type AssignmentParams = z.infer<typeof assignmentParamsSchema>;
export type GoodsReturnParams = z.infer<typeof goodsReturnParamsSchema>;
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;
export type CloseAssignmentInput = z.infer<typeof closeAssignmentSchema>;
export type CreateGoodsReturnInput = z.infer<typeof createGoodsReturnSchema>;
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;
export type ListGoodsReturnsQuery = z.infer<typeof listGoodsReturnsQuerySchema>;
