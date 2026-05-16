import { z } from "zod";

export const whatsappProviderSchema = z.enum(["META_CLOUD_API"]);
export const whatsappMessageTypeSchema = z.enum([
  "INVOICE",
  "PAYMENT_RECEIPT",
  "DELIVERY_CHALLAN",
  "CUSTOM",
]);
export const whatsappMessageStatusSchema = z.enum([
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
]);

export const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const orderParamsSchema = tenantParamsSchema.extend({
  orderId: z.string().uuid("Order ID must be a valid UUID"),
});

export const paymentParamsSchema = tenantParamsSchema.extend({
  paymentId: z.string().uuid("Payment ID must be a valid UUID"),
});

export const dispatchParamsSchema = tenantParamsSchema.extend({
  dispatchId: z.string().uuid("Dispatch ID must be a valid UUID"),
});

export const logParamsSchema = tenantParamsSchema.extend({
  id: z.string().uuid("Message log ID must be a valid UUID"),
});

export const saveWhatsappConfigSchema = z.object({
  provider: whatsappProviderSchema.default("META_CLOUD_API"),
  isEnabled: z.boolean().optional(),
  phoneNumberId: z.string().trim().min(1, "Phone number ID is required"),
  wabaId: z.string().trim().min(1, "WABA ID is required"),
  accessToken: z.string().min(10, "Access token must be at least 10 characters"),
  fromPhoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{9,14}$/, "From phone number must be E.164-like")
    .optional(),
  invoiceTemplateName: z.string().trim().min(1).optional(),
  paymentReceiptTemplateName: z.string().trim().min(1).optional(),
  challansTemplateName: z.string().trim().min(1).optional(),
});

export const updateWhatsappAccessTokenSchema = z.object({
  accessToken: z.string().min(10, "Access token must be at least 10 characters"),
});

export const submitTemplateSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/, "Template name must be snake_case"),
  language: z.string().trim().min(2).default("en"),
  category: z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"]),
  components: z.array(z.record(z.unknown())).min(1),
});

const optionalIsoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime())
  .optional();

export const getLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  messageType: whatsappMessageTypeSchema.optional(),
  messageStatus: whatsappMessageStatusSchema.optional(),
  partyId: z.string().uuid().optional(),
  fromDate: optionalIsoDate,
  toDate: optionalIsoDate,
});

export type TenantParams = z.infer<typeof tenantParamsSchema>;
export type OrderParams = z.infer<typeof orderParamsSchema>;
export type PaymentParams = z.infer<typeof paymentParamsSchema>;
export type DispatchParams = z.infer<typeof dispatchParamsSchema>;
export type LogParams = z.infer<typeof logParamsSchema>;
export type SaveWhatsappConfigInput = z.infer<typeof saveWhatsappConfigSchema>;
export type UpdateWhatsappAccessTokenInput = z.infer<typeof updateWhatsappAccessTokenSchema>;
export type SubmitTemplateInput = z.infer<typeof submitTemplateSchema>;
export type GetLogsQuery = z.infer<typeof getLogsQuerySchema>;
