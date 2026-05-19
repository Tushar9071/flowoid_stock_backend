import { z } from "zod";

const paymentMethods = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;
const paymentStatuses = ["PENDING", "CLEARED", "BOUNCED", "CANCELLED"] as const;
const paymentNatures = [
  "DEALER_RECEIPT",
  "SUPPLIER_PAYMENT",
  "DEALER_ADVANCE",
  "SUPPLIER_ADVANCE",
] as const;

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

const positiveMoney = z.preprocess((value) => {
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

export const paymentParamsSchema = tenantParamsSchema.extend({
  paymentId: z.string().uuid("Payment ID must be a valid UUID"),
});

export const partyParamsSchema = tenantParamsSchema.extend({
  partyId: z.string().uuid("Party ID must be a valid UUID"),
});

export const partyOrderOutstandingQuerySchema = z.object({
  includePaid: z.coerce.boolean().default(false),
});

const paymentAllocationSchema = z
  .object({
    orderId: z.string().uuid("Order ID must be a valid UUID"),
    amount: positiveMoney,
  })
  .strict();

export const createDealerPaymentSchema = z
  .object({
    partyId: z.string().uuid("Party ID must be a valid UUID"),
    amount: positiveMoney,
    paymentMethod: z.enum(paymentMethods),
    paymentDate: optionalDate,
    referenceNumber: optionalTrimmedString,
    bankName: optionalTrimmedString,
    accountNumber: optionalTrimmedString,
    notes: optionalTrimmedString,
    allocations: z.array(paymentAllocationSchema).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.allocations) return;

    if (data.allocations.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allocations"],
        message: "Allocations must contain at least one order when provided",
      });
    }

    const seenOrderIds = new Set<string>();
    for (const [index, allocation] of data.allocations.entries()) {
      if (seenOrderIds.has(allocation.orderId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allocations", index, "orderId"],
          message: "Each order can appear only once in a payment allocation",
        });
      }
      seenOrderIds.add(allocation.orderId);
    }
  });

export const createSupplierPaymentSchema = z
  .object({
    partyId: z.string().uuid("Party ID must be a valid UUID"),
    amount: positiveMoney,
    paymentMethod: z.enum(paymentMethods),
    paymentDate: optionalDate,
    referenceNumber: optionalTrimmedString,
    bankName: optionalTrimmedString,
    accountNumber: optionalTrimmedString,
    notes: optionalTrimmedString,
  })
  .strict();

export const updatePaymentStatusSchema = z
  .object({
    paymentStatus: z.enum(paymentStatuses),
    notes: optionalTrimmedString,
  })
  .strict()
  .superRefine((data, ctx) => {
    if ((data.paymentStatus === "BOUNCED" || data.paymentStatus === "CANCELLED") && !data.notes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notes"],
        message: "Notes are required when marking a payment as bounced or cancelled",
      });
    }
  });

export const listPaymentsQuerySchema = z
  .object({
    partyId: z.string().uuid("Party ID must be a valid UUID").optional(),
    paymentNature: z.enum(paymentNatures).optional(),
    paymentMethod: z.enum(paymentMethods).optional(),
    paymentStatus: z.enum(paymentStatuses).optional(),
    dateFrom: optionalDate,
    dateTo: optionalDate,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
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

export const agingReportQuerySchema = z.object({
  asOfDate: optionalDate,
});

export const dailyCashFlowQuerySchema = z.object({
  date: optionalDate,
});

export type TenantParams = z.infer<typeof tenantParamsSchema>;
export type PaymentParams = z.infer<typeof paymentParamsSchema>;
export type PartyParams = z.infer<typeof partyParamsSchema>;
export type PartyOrderOutstandingQuery = z.infer<typeof partyOrderOutstandingQuerySchema>;
export type CreateDealerPaymentInput = z.infer<typeof createDealerPaymentSchema>;
export type CreateSupplierPaymentInput = z.infer<typeof createSupplierPaymentSchema>;
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
export type AgingReportQuery = z.infer<typeof agingReportQuerySchema>;
export type DailyCashFlowQuery = z.infer<typeof dailyCashFlowQuerySchema>;
