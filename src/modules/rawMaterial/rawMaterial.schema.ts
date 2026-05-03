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

const requiredDate = z.preprocess((value) => {
	if (value instanceof Date) {
		return value;
	}

	if (typeof value === "string" || typeof value === "number") {
		return new Date(value);
	}

	return value;
}, z.date());

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

const rawMaterialUnits = ["KG", "GRAM", "PIECE", "METER", "DOZEN"] as const;
const rawMaterialPurchaseStatuses = [
	"PENDING",
	"RECEIVED",
	"CANCELLED",
] as const;

export const tenantParamsSchema = z.object({
	tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

export const materialTypeParamsSchema = tenantParamsSchema.extend({
	materialTypeId: z.string().uuid("Material type ID must be a valid UUID"),
});

export const purchaseParamsSchema = tenantParamsSchema.extend({
	purchaseId: z.string().uuid("Purchase ID must be a valid UUID"),
});

export const issuanceParamsSchema = tenantParamsSchema.extend({
	issuanceId: z.string().uuid("Issuance ID must be a valid UUID"),
});

export const createMaterialTypeSchema = z.object({
	name: z.string().trim().min(2, "Material type name must be at least 2 characters").max(120),
	unit: z.enum(rawMaterialUnits),
	description: optionalTrimmedString,
});

export const updateMaterialTypeSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, "Material type name must be at least 2 characters")
			.max(120)
			.optional(),
		unit: z.enum(rawMaterialUnits).optional(),
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

export const createPurchaseSchema = z
	.object({
		materialTypeId: z.string().uuid("Material type ID must be a valid UUID"),
		supplierId: z.string().uuid("Supplier ID must be a valid UUID"),
		quantity: positiveDecimalNumber,
		costPerUnit: positiveDecimalNumber,
		purchaseDate: requiredDate,
		status: z.enum(rawMaterialPurchaseStatuses).default("RECEIVED"),
		invoiceNumber: optionalTrimmedString,
		notes: optionalTrimmedString,
		totalCost: optionalDecimalNumber,
	})
	.superRefine((data, ctx) => {
		if (data.totalCost !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["totalCost"],
				message: "totalCost must not be provided",
			});
		}
	});

export const updatePurchaseSchema = z
	.object({
		quantity: optionalPositiveDecimalNumber,
		costPerUnit: optionalPositiveDecimalNumber,
		purchaseDate: optionalDate,
		invoiceNumber: optionalTrimmedString,
		notes: optionalTrimmedString,
		status: z.enum(rawMaterialPurchaseStatuses).optional(),
		materialTypeId: z.string().uuid().optional(),
		supplierId: z.string().uuid().optional(),
	})
	.superRefine((data, ctx) => {
		if (Object.keys(data).length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "At least one field must be provided for update",
			});
		}

		if (data.materialTypeId !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["materialTypeId"],
				message: "materialTypeId cannot be updated",
			});
		}

		if (data.supplierId !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["supplierId"],
				message: "supplierId cannot be updated",
			});
		}
	});

export const createIssuanceSchema = z
	.object({
		materialTypeId: z.string().uuid("Material type ID must be a valid UUID"),
		quantity: positiveDecimalNumber,
		issuedAt: optionalDate,
		issuedTo: optionalTrimmedString,
		notes: optionalTrimmedString,
		referenceId: optionalTrimmedString,
		referenceType: optionalTrimmedString,
	})
	.superRefine((data, ctx) => {
		if (data.referenceId !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["referenceId"],
				message: "referenceId must not be provided",
			});
		}

		if (data.referenceType !== undefined) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["referenceType"],
				message: "referenceType must not be provided",
			});
		}
	});

export const listMaterialTypesQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	search: optionalTrimmedString,
	isActive: optionalBoolean,
});

export const listPurchasesQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		materialTypeId: z.string().uuid().optional(),
		supplierId: z.string().uuid().optional(),
		status: z.enum(rawMaterialPurchaseStatuses).optional(),
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

export const listIssuancesQuerySchema = z
	.object({
		page: z.coerce.number().int().min(1).default(1),
		limit: z.coerce.number().int().min(1).max(100).default(20),
		materialTypeId: z.string().uuid().optional(),
		referenceId: optionalTrimmedString,
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
export type MaterialTypeParams = z.infer<typeof materialTypeParamsSchema>;
export type PurchaseParams = z.infer<typeof purchaseParamsSchema>;
export type IssuanceParams = z.infer<typeof issuanceParamsSchema>;
export type CreateMaterialTypeInput = z.infer<typeof createMaterialTypeSchema>;
export type UpdateMaterialTypeInput = z.infer<typeof updateMaterialTypeSchema>;
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;
export type CreateIssuanceInput = z.infer<typeof createIssuanceSchema>;
export type ListMaterialTypesQuery = z.infer<typeof listMaterialTypesQuerySchema>;
export type ListPurchasesQuery = z.infer<typeof listPurchasesQuerySchema>;
export type ListIssuancesQuery = z.infer<typeof listIssuancesQuerySchema>;
