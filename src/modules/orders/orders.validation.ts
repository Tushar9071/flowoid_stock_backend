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

const optionalMoney = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().finite().nonnegative().optional());

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

const orderStatuses = [
  "DRAFT",
  "CONFIRMED",
  "PACKED",
  "PARTIALLY_DISPATCHED",
  "DISPATCHED",
  "CANCELLED",
] as const;

export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const orderParamsSchema = tenantParamsSchema.extend({
  orderId: z.string().uuid("Order ID must be a valid UUID"),
});

export const orderItemParamsSchema = orderParamsSchema.extend({
  itemId: z.string().uuid("Order item ID must be a valid UUID"),
});

const createOrderItemSchema = z.object({
  designId: z.string().uuid("Design ID must be a valid UUID"),
  quantityDozens: z.coerce
    .number()
    .int("Quantity must be a whole number of dozens")
    .positive("Quantity dozens must be greater than 0"),
  pricePerDozen: optionalMoney,
  notes: optionalTrimmedString,
});

export const createOrderSchema = z
  .object({
    dealerId: z.string().uuid("Dealer ID must be a valid UUID"),
    isCreditOrder: z.boolean(),
    items: z.array(createOrderItemSchema).min(1, "At least one order item is required"),
    discountAmount: optionalMoney.default(0),
    notes: optionalTrimmedString,
  })
  .strict()
  .superRefine((data, ctx) => {
    const seenDesignIds = new Set<string>();
    for (const [index, item] of data.items.entries()) {
      if (seenDesignIds.has(item.designId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "designId"],
          message: "Each design can appear only once in an order",
        });
      }
      seenDesignIds.add(item.designId);
    }
  });

export const updateOrderSchema = z
  .object({
    discountAmount: optionalMoney,
    notes: optionalTrimmedString,
    isCreditOrder: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided for update",
      });
    }
  });

export const addOrderItemSchema = createOrderItemSchema.strict();

export const updateOrderItemSchema = z
  .object({
    quantityDozens: z.coerce
      .number()
      .int("Quantity must be a whole number of dozens")
      .positive("Quantity dozens must be greater than 0")
      .optional(),
    pricePerDozen: positiveMoney.optional(),
    notes: optionalTrimmedString,
  })
  .strict()
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided for update",
      });
    }
  });

export const dispatchOrderSchema = z
  .object({
    transportMode: z.string().trim().min(1, "Transport mode is required").max(120),
    trackingRef: optionalTrimmedString,
    dispatchedAt: optionalDate,
    items: z
      .array(
        z
          .object({
            itemId: z.string().uuid("Order item ID must be a valid UUID"),
            dozens: z.coerce
              .number()
              .int("Dispatched dozens must be a whole number")
              .positive("Dispatched dozens must be greater than 0"),
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.items) return;

    const seenItemIds = new Set<string>();
    for (const [index, item] of data.items.entries()) {
      if (seenItemIds.has(item.itemId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["items", index, "itemId"],
          message: "Each order item can appear only once in a dispatch",
        });
      }
      seenItemIds.add(item.itemId);
    }
  });

export const cancelOrderSchema = z
  .object({
    cancelReason: z.string().trim().min(1, "Cancellation reason is required").max(500),
  })
  .strict();

export const listOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    dealerId: z.string().uuid("Dealer ID must be a valid UUID").optional(),
    status: z.enum(orderStatuses).optional(),
    isCreditOrder: optionalBoolean,
    isOverdue: optionalBoolean,
    dateFrom: optionalDate,
    dateTo: optionalDate,
    search: optionalTrimmedString,
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
export type OrderParams = z.infer<typeof orderParamsSchema>;
export type OrderItemParams = z.infer<typeof orderItemParamsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
export type AddOrderItemInput = z.infer<typeof addOrderItemSchema>;
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;
export type DispatchOrderInput = z.infer<typeof dispatchOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
