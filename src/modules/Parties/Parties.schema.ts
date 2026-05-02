import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().optional(),
);

const optionalDecimalNumber = z.preprocess((value) => {
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

const requiredDecimalNumber = z.preprocess((value) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().finite().nonnegative());

const basePartySchema = z.object({
  type: z.enum(["DEALER", "SUPPLIER"]),
  name: z.string().trim().min(2, "Party name must be at least 2 characters").max(120),
  code: optionalTrimmedString,
  contactPerson: optionalTrimmedString,
  phone: optionalTrimmedString.refine(
    (value) => !value || /^[0-9+\-() ]{6,20}$/.test(value),
    "Phone must contain 6 to 20 valid characters",
  ),
  alternatePhone: optionalTrimmedString.refine(
    (value) => !value || /^[0-9+\-() ]{6,20}$/.test(value),
    "Alternate phone must contain 6 to 20 valid characters",
  ),
  email: optionalTrimmedString.refine(
    (value) => !value || z.string().email().safeParse(value).success,
    "Invalid email address",
  ),
  gstin: optionalTrimmedString.refine(
    (value) => !value || /^[0-9A-Z]{15}$/.test(value.toUpperCase()),
    "GSTIN must be a valid 15-character code",
  ),
  pan: optionalTrimmedString.refine(
    (value) => !value || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase()),
    "PAN must be a valid 10-character code",
  ),
  addressLine1: optionalTrimmedString,
  addressLine2: optionalTrimmedString,
  city: optionalTrimmedString,
  state: optionalTrimmedString,
  country: optionalTrimmedString,
  postalCode: optionalTrimmedString,
  creditPeriodDays: z.coerce
    .number()
    .int("Credit period must be a whole number")
    .min(0, "Credit period cannot be negative")
    .max(3650, "Credit period is too large")
    .optional(),
  creditLimit: optionalDecimalNumber,
  openingBalance: optionalDecimalNumber.default(0),
  openingBalanceType: z.enum(["RECEIVABLE", "PAYABLE"]).optional(),
  openingBalanceDate: optionalDate,
  notes: optionalTrimmedString,
  isActive: z.boolean().optional(),
});

const validateOpeningBalance = (
  data: {
    openingBalance?: number;
    openingBalanceDate?: Date;
    openingBalanceType?: "RECEIVABLE" | "PAYABLE";
  },
  ctx: z.RefinementCtx,
) => {
  const amount = data.openingBalance ?? 0;

  if (amount > 0 && !data.openingBalanceDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["openingBalanceDate"],
      message: "Opening balance date is required when opening balance is greater than 0",
    });
  }

  if (amount > 0 && !data.openingBalanceType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["openingBalanceType"],
      message: "Opening balance type is required when opening balance is greater than 0",
    });
  }
};

export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const partyParamsSchema = tenantParamsSchema.extend({
  partyId: z.string().uuid("Party ID must be a valid UUID"),
});

export const createPartySchema = basePartySchema
  .extend({
    openingBalanceType: z.enum(["RECEIVABLE", "PAYABLE"]).default("RECEIVABLE"),
  })
  .superRefine(validateOpeningBalance);

export const updatePartySchema = basePartySchema
  .partial()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided for update",
      });
      return;
    }

    validateOpeningBalance(data, ctx);
  });

export const listPartiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: optionalTrimmedString,
  type: z.enum(["DEALER", "SUPPLIER"]).optional(),
  isActive: z.preprocess((value) => {
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
  }, z.boolean().optional()),
});

export const openingBalanceSchema = z
  .object({
    openingBalance: requiredDecimalNumber.refine(
      (value) => value > 0,
      "Opening balance must be greater than 0",
    ),
    openingBalanceType: z.enum(["RECEIVABLE", "PAYABLE"]),
    openingBalanceDate: optionalDate,
    notes: optionalTrimmedString,
  })
  .superRefine((data, ctx) => {
    if (!data.openingBalanceDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["openingBalanceDate"],
        message: "Opening balance date is required",
      });
    }
  });

export const updatePartyStatusSchema = z.object({
  isActive: z.boolean(),
});

export const dropdownPartiesQuerySchema = z.object({
  search: optionalTrimmedString,
  type: z.enum(["DEALER", "SUPPLIER"]).optional(),
  isActive: z.preprocess((value) => {
    if (value === undefined || value === null || value === "") {
      return true;
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
  }, z.boolean().default(true)),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const checkDuplicatePartyQuerySchema = z
  .object({
    name: optionalTrimmedString,
    phone: optionalTrimmedString,
    code: optionalTrimmedString,
    gstin: optionalTrimmedString,
    excludePartyId: z.string().uuid("excludePartyId must be a valid UUID").optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.name && !data.phone && !data.code && !data.gstin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one of name, phone, code, or gstin",
      });
    }
  });

export const updateOpeningBalanceSchema = z
  .object({
    openingBalance: optionalDecimalNumber,
    openingBalanceType: z.enum(["RECEIVABLE", "PAYABLE"]).optional(),
    openingBalanceDate: optionalDate,
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

export const statementQuerySchema = z
  .object({
    fromDate: optionalDate,
    toDate: optionalDate,
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    includeOpeningEntry: z.preprocess((value) => {
      if (value === undefined || value === null || value === "") {
        return true;
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
    }, z.boolean().default(true)),
  })
  .superRefine((data, ctx) => {
    if (data.fromDate && data.toDate && data.fromDate > data.toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: "toDate must be greater than or equal to fromDate",
      });
    }
  });

export type CreatePartyInput = z.infer<typeof createPartySchema>;
export type UpdatePartyInput = z.infer<typeof updatePartySchema>;
export type ListPartiesQuery = z.infer<typeof listPartiesQuerySchema>;
export type OpeningBalanceInput = z.infer<typeof openingBalanceSchema>;
export type UpdateOpeningBalanceInput = z.infer<typeof updateOpeningBalanceSchema>;
export type StatementQuery = z.infer<typeof statementQuerySchema>;
export type UpdatePartyStatusInput = z.infer<typeof updatePartyStatusSchema>;
export type DropdownPartiesQuery = z.infer<typeof dropdownPartiesQuerySchema>;
export type CheckDuplicatePartyQuery = z.infer<typeof checkDuplicatePartyQuerySchema>;
export type TenantParams = z.infer<typeof tenantParamsSchema>;
export type PartyParams = z.infer<typeof partyParamsSchema>;
