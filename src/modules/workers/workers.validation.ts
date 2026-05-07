import { z } from "zod";

const assignmentStatuses = [
  "ISSUED",
  "IN_PROGRESS",
  "PARTIALLY_RETURNED",
  "COMPLETED",
  "CLOSED",
] as const;

const workerPaymentTypes = [
  "EARNING_SETTLEMENT",
  "ADVANCE",
  "ADVANCE_RECOVERY",
] as const;

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

const positiveDecimalNumber = z.preprocess((value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return value;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().finite().positive());

const optionalPhone = optionalTrimmedString.refine(
  (value) => !value || /^[0-9+\-() ]{6,20}$/.test(value),
  "Phone must contain 6 to 20 valid characters",
);

const baseWorkerSchema = z.object({
  name: z.string().trim().min(2, "Worker name must be at least 2 characters").max(160),
  phone: optionalPhone,
  alternatePhone: optionalPhone,
  address: optionalTrimmedString,
  city: optionalTrimmedString,
  idProofType: optionalTrimmedString,
  idProofNumber: optionalTrimmedString,
  openingBalance: optionalNonNegativeDecimalNumber.default(0),
  openingBalanceType: z.enum(["PAYABLE", "RECEIVABLE"]).optional(),
  openingBalanceDate: optionalDate,
  notes: optionalTrimmedString,
});

export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const workerParamsSchema = tenantParamsSchema.extend({
  id: z.string().uuid("Worker ID must be a valid UUID"),
});

export const workerPaymentParamsSchema = tenantParamsSchema.extend({
  paymentId: z.string().uuid("Worker payment ID must be a valid UUID"),
});

export const createWorkerSchema = baseWorkerSchema.extend({
  openingBalanceType: z.enum(["PAYABLE", "RECEIVABLE"]).default("PAYABLE"),
});

export const updateWorkerSchema = baseWorkerSchema.partial().superRefine((data, ctx) => {
  if (Object.keys(data).length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one field must be provided for update",
    });
  }
});

export const listWorkersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: optionalBoolean,
  search: optionalTrimmedString,
  city: optionalTrimmedString,
});

export const listAssignmentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(assignmentStatuses).optional(),
});

export const createWorkerPaymentSchema = z.object({
  workerId: z.string().uuid("Worker ID must be a valid UUID"),
  amount: positiveDecimalNumber,
  paymentType: z.enum(workerPaymentTypes),
  paymentMode: z.preprocess(
    (value) => {
      if (value === undefined || value === null) {
        return undefined;
      }

      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    },
    z.string().default("CASH"),
  ),
  paidAt: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return new Date();
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === "string" || typeof value === "number") {
      return new Date(value);
    }

    return value;
  }, z.date()),
  notes: optionalTrimmedString,
});

const paymentListQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  paymentType: z.enum(workerPaymentTypes).optional(),
  dateFrom: optionalDate,
  dateTo: optionalDate,
};

const refinePaymentDateRange = (
  data: { dateFrom?: Date; dateTo?: Date },
  ctx: z.RefinementCtx,
) => {
  if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dateTo"],
      message: "dateTo must be greater than or equal to dateFrom",
    });
  }
};

export const listPaymentsQuerySchema = z
  .object(paymentListQueryShape)
  .superRefine(refinePaymentDateRange);

export const listWorkerPaymentsQuerySchema = z
  .object({
    ...paymentListQueryShape,
    workerId: z.string().uuid("Worker ID must be a valid UUID").optional(),
  })
  .superRefine(refinePaymentDateRange);

export type TenantParams = z.infer<typeof tenantParamsSchema>;
export type WorkerParams = z.infer<typeof workerParamsSchema>;
export type WorkerPaymentParams = z.infer<typeof workerPaymentParamsSchema>;
export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
export type UpdateWorkerInput = z.infer<typeof updateWorkerSchema>;
export type CreateWorkerPaymentInput = z.infer<typeof createWorkerPaymentSchema>;
export type ListWorkersQuery = z.infer<typeof listWorkersQuerySchema>;
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type ListWorkerPaymentsQuery = z.infer<typeof listWorkerPaymentsQuerySchema>;
