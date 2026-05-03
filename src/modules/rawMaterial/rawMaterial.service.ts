import { Prisma } from "@prisma/client";

import {
	forbiddenError,
	notFoundError,
	validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import type {
	CreateIssuanceInput,
	CreateMaterialTypeInput,
	CreatePurchaseInput,
	ListIssuancesQuery,
	ListMaterialTypesQuery,
	ListPurchasesQuery,
	UpdateMaterialTypeInput,
	UpdatePurchaseInput,
} from "./rawMaterial.schema";

type CurrentUser = {
	userId: string;
	role: string;
};

const MATERIAL_TYPE_SELECT = {
	id: true,
	tenantId: true,
	name: true,
	unit: true,
	description: true,
	isActive: true,
	deletedAt: true,
	createdAt: true,
	updatedAt: true,
} as const;

const PARTY_SELECT = {
	id: true,
	tenantId: true,
	type: true,
	name: true,
	code: true,
	contactPerson: true,
	phone: true,
	alternatePhone: true,
	email: true,
	gstin: true,
	pan: true,
	addressLine1: true,
	addressLine2: true,
	city: true,
	state: true,
	country: true,
	postalCode: true,
	creditPeriodDays: true,
	creditLimit: true,
	openingBalance: true,
	openingBalanceType: true,
	openingBalanceDate: true,
	notes: true,
	isActive: true,
	deletedAt: true,
	createdAt: true,
	updatedAt: true,
} as const;

const PURCHASE_INCLUDE = {
	materialType: { select: MATERIAL_TYPE_SELECT },
	supplier: { select: PARTY_SELECT },
} as const;

const ISSUANCE_INCLUDE = {
	materialType: { select: MATERIAL_TYPE_SELECT },
} as const;

const LOW_STOCK_THRESHOLD = new Prisma.Decimal(10);

const normalizeOptionalString = (value?: string): string | null => {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
};

const normalizeName = (value: string): string =>
	value.trim().replace(/\s+/g, " ");

const decimalOrZero = (value: Prisma.Decimal | null | undefined): Prisma.Decimal =>
	value ?? new Prisma.Decimal(0);

const assertTenantAccess = async (tenantId: string, currentUser: CurrentUser) => {
	const tenant = await prisma.tenant.findUnique({
		where: { id: tenantId },
		select: { id: true, name: true },
	});

	if (!tenant) {
		throw notFoundError("Tenant not found");
	}

	if (currentUser.role === "SUPER_ADMIN") {
		return tenant;
	}

	const membership = await prisma.tenantUser.findFirst({
		where: {
			tenantId,
			userId: currentUser.userId,
			isActive: true,
		},
		select: { id: true },
	});

	if (!membership) {
		throw forbiddenError("You do not have access to this tenant");
	}

	return tenant;
};

const findMaterialTypeOrThrow = async (tenantId: string, materialTypeId: string) => {
	const materialType = await prisma.rawMaterialType.findFirst({
		where: {
			id: materialTypeId,
			tenantId,
			deletedAt: null,
		},
		select: MATERIAL_TYPE_SELECT,
	});

	if (!materialType) {
		throw notFoundError("Material type not found");
	}

	return materialType;
};

const getMaterialTypeStock = async (tenantId: string, materialTypeId: string) => {
	const [purchases, issuances] = await Promise.all([
		prisma.rawMaterialPurchase.aggregate({
			where: {
				tenantId,
				materialTypeId,
				status: "RECEIVED",
				deletedAt: null,
			},
			_sum: { quantity: true },
		}),
		prisma.rawMaterialIssuance.aggregate({
			where: {
				tenantId,
				materialTypeId,
			},
			_sum: { quantity: true },
		}),
	]);

	return decimalOrZero(purchases._sum.quantity).minus(
		decimalOrZero(issuances._sum.quantity),
	);
};

const attachStockToMaterialTypes = async (
	tenantId: string,
	types: Array<{ id: string } & Record<string, unknown>>,
) => {
	if (types.length === 0) return [];

	const typeIds = types.map((type) => type.id);

	const [purchaseSums, issuanceSums] = await Promise.all([
		prisma.rawMaterialPurchase.groupBy({
			by: ["materialTypeId"],
			where: {
				tenantId,
				materialTypeId: { in: typeIds },
				status: "RECEIVED",
				deletedAt: null,
			},
			_sum: { quantity: true },
		}),
		prisma.rawMaterialIssuance.groupBy({
			by: ["materialTypeId"],
			where: {
				tenantId,
				materialTypeId: { in: typeIds },
			},
			_sum: { quantity: true },
		}),
	]);

	const purchaseMap = new Map<string, Prisma.Decimal>();
	for (const row of purchaseSums) {
		purchaseMap.set(row.materialTypeId, decimalOrZero(row._sum.quantity));
	}

	const issuanceMap = new Map<string, Prisma.Decimal>();
	for (const row of issuanceSums) {
		issuanceMap.set(row.materialTypeId, decimalOrZero(row._sum.quantity));
	}

	return types.map((type) => {
		const purchased = purchaseMap.get(type.id) ?? new Prisma.Decimal(0);
		const issued = issuanceMap.get(type.id) ?? new Prisma.Decimal(0);
		const currentStock = purchased.minus(issued);
		return {
			...type,
			currentStock,
		};
	});
};

export const getAllMaterialTypes = async (
	tenantId: string,
	query: ListMaterialTypesQuery,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const where: Prisma.RawMaterialTypeWhereInput = {
		tenantId,
		deletedAt: null,
		isActive: query.isActive,
	};

	if (query.search) {
		where.name = { contains: query.search, mode: "insensitive" };
	}

	const skip = (query.page - 1) * query.limit;

	const [items, totalItems] = await prisma.$transaction([
		prisma.rawMaterialType.findMany({
			where,
			orderBy: [{ name: "asc" }, { id: "asc" }],
			skip,
			take: query.limit,
			select: MATERIAL_TYPE_SELECT,
		}),
		prisma.rawMaterialType.count({ where }),
	]);

	const itemsWithStock = await attachStockToMaterialTypes(tenantId, items);
	const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));

	return {
		items: itemsWithStock,
		pagination: {
			page: query.page,
			limit: query.limit,
			totalItems,
			totalPages,
			hasNextPage: query.page < totalPages,
			hasPreviousPage: query.page > 1,
		},
	};
};

export const getMaterialTypeById = async (
	tenantId: string,
	materialTypeId: string,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const materialType = await findMaterialTypeOrThrow(tenantId, materialTypeId);
	const currentStock = await getMaterialTypeStock(tenantId, materialTypeId);

	return {
		...materialType,
		currentStock,
	};
};

export const createMaterialType = async (
	tenantId: string,
	input: CreateMaterialTypeInput,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const normalizedName = normalizeName(input.name);
	const existing = await prisma.rawMaterialType.findFirst({
		where: {
			tenantId,
			deletedAt: null,
			name: { equals: normalizedName, mode: "insensitive" },
		},
		select: { id: true },
	});

	if (existing) {
		throw validationError("Material type with this name already exists");
	}

	const created = await prisma.rawMaterialType.create({
		data: {
			tenantId,
			name: normalizedName,
			unit: input.unit,
			description: normalizeOptionalString(input.description),
		},
		select: MATERIAL_TYPE_SELECT,
	});

	return {
		...created,
		currentStock: new Prisma.Decimal(0),
	};
};

export const updateMaterialType = async (
	tenantId: string,
	materialTypeId: string,
	input: UpdateMaterialTypeInput,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const materialType = await findMaterialTypeOrThrow(tenantId, materialTypeId);
	const normalizedName = input.name ? normalizeName(input.name) : materialType.name;

	if (input.name && normalizedName.toLowerCase() !== materialType.name.toLowerCase()) {
		const duplicate = await prisma.rawMaterialType.findFirst({
			where: {
				tenantId,
				deletedAt: null,
				name: { equals: normalizedName, mode: "insensitive" },
				id: { not: materialTypeId },
			},
			select: { id: true },
		});

		if (duplicate) {
			throw validationError("Material type with this name already exists");
		}
	}

	const updated = await prisma.rawMaterialType.update({
		where: { id: materialTypeId },
		data: {
			name: input.name ? normalizedName : undefined,
			unit: input.unit,
			description:
				input.description !== undefined
					? normalizeOptionalString(input.description)
					: undefined,
			isActive: input.isActive,
		},
		select: MATERIAL_TYPE_SELECT,
	});

	const currentStock = await getMaterialTypeStock(tenantId, materialTypeId);
	return {
		...updated,
		currentStock,
	};
};

export const softDeleteMaterialType = async (
	tenantId: string,
	materialTypeId: string,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);
	const materialType = await findMaterialTypeOrThrow(tenantId, materialTypeId);

	const currentStock = await getMaterialTypeStock(tenantId, materialTypeId);
	if (currentStock.gt(0)) {
		throw validationError(
			`Cannot deactivate material type with remaining stock: ${currentStock.toString()} ${materialType.unit}`,
		);
	}

	await prisma.rawMaterialType.update({
		where: { id: materialTypeId },
		data: {
			deletedAt: new Date(),
			isActive: false,
		},
	});
};

export const getAllPurchases = async (
	tenantId: string,
	query: ListPurchasesQuery,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const where: Prisma.RawMaterialPurchaseWhereInput = {
		tenantId,
		deletedAt: null,
		materialTypeId: query.materialTypeId,
		supplierId: query.supplierId,
		status: query.status,
	};

	if (query.dateFrom || query.dateTo) {
		where.purchaseDate = {
			gte: query.dateFrom,
			lte: query.dateTo,
		};
	}

	const skip = (query.page - 1) * query.limit;

	const [items, totalItems] = await prisma.$transaction([
		prisma.rawMaterialPurchase.findMany({
			where,
			orderBy: [{ purchaseDate: "desc" }, { id: "desc" }],
			skip,
			take: query.limit,
			include: PURCHASE_INCLUDE,
		}),
		prisma.rawMaterialPurchase.count({ where }),
	]);

	const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));

	return {
		items,
		pagination: {
			page: query.page,
			limit: query.limit,
			totalItems,
			totalPages,
			hasNextPage: query.page < totalPages,
			hasPreviousPage: query.page > 1,
		},
	};
};

export const getPurchaseById = async (
	tenantId: string,
	purchaseId: string,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const purchase = await prisma.rawMaterialPurchase.findFirst({
		where: {
			id: purchaseId,
			tenantId,
			deletedAt: null,
		},
		include: PURCHASE_INCLUDE,
	});

	if (!purchase) {
		throw notFoundError("Purchase not found");
	}

	return purchase;
};

export const createPurchase = async (
	tenantId: string,
	input: CreatePurchaseInput,
	createdById: string,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const materialType = await prisma.rawMaterialType.findFirst({
		where: {
			id: input.materialTypeId,
			tenantId,
			deletedAt: null,
		},
		select: { id: true, unit: true },
	});

	if (!materialType) {
		throw notFoundError("Material type not found");
	}

	const supplier = await prisma.party.findFirst({
		where: {
			id: input.supplierId,
			tenantId,
			deletedAt: null,
		},
		select: { id: true, type: true },
	});

	if (!supplier) {
		throw notFoundError("Supplier not found");
	}

	if (supplier.type !== "SUPPLIER") {
		throw validationError("Selected party is not a supplier");
	}

	const quantity = new Prisma.Decimal(input.quantity);
	const costPerUnit = new Prisma.Decimal(input.costPerUnit);
	const totalCost = quantity.mul(costPerUnit);

	return prisma.rawMaterialPurchase.create({
		data: {
			tenantId,
			materialTypeId: input.materialTypeId,
			supplierId: input.supplierId,
			quantity,
			costPerUnit,
			totalCost,
			status: input.status,
			purchaseDate: input.purchaseDate,
			invoiceNumber: normalizeOptionalString(input.invoiceNumber),
			notes: normalizeOptionalString(input.notes),
			createdById,
		},
		include: PURCHASE_INCLUDE,
	});
};

export const updatePurchase = async (
	tenantId: string,
	purchaseId: string,
	input: UpdatePurchaseInput,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const existing = await prisma.rawMaterialPurchase.findFirst({
		where: {
			id: purchaseId,
			tenantId,
			deletedAt: null,
		},
		include: PURCHASE_INCLUDE,
	});

	if (!existing) {
		throw notFoundError("Purchase not found");
	}

	const resolvedQuantity =
		input.quantity !== undefined
			? new Prisma.Decimal(input.quantity)
			: existing.quantity;
	const resolvedCostPerUnit =
		input.costPerUnit !== undefined
			? new Prisma.Decimal(input.costPerUnit)
			: existing.costPerUnit;

	const updateData: Prisma.RawMaterialPurchaseUpdateInput = {
		quantity: input.quantity !== undefined ? resolvedQuantity : undefined,
		costPerUnit: input.costPerUnit !== undefined ? resolvedCostPerUnit : undefined,
		purchaseDate: input.purchaseDate,
		invoiceNumber:
			input.invoiceNumber !== undefined
				? normalizeOptionalString(input.invoiceNumber)
				: undefined,
		notes: input.notes !== undefined ? normalizeOptionalString(input.notes) : undefined,
		status: input.status,
	};

	if (input.quantity !== undefined || input.costPerUnit !== undefined) {
		updateData.totalCost = resolvedQuantity.mul(resolvedCostPerUnit);
	}

	return prisma.rawMaterialPurchase.update({
		where: { id: purchaseId },
		data: updateData,
		include: PURCHASE_INCLUDE,
	});
};

export const softDeletePurchase = async (
	tenantId: string,
	purchaseId: string,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const purchase = await prisma.rawMaterialPurchase.findFirst({
		where: {
			id: purchaseId,
			tenantId,
			deletedAt: null,
		},
		select: {
			id: true,
			materialTypeId: true,
			quantity: true,
			status: true,
		},
	});

	if (!purchase) {
		throw notFoundError("Purchase not found");
	}

	const [receivedTotals, issuanceTotals] = await Promise.all([
		prisma.rawMaterialPurchase.aggregate({
			where: {
				tenantId,
				materialTypeId: purchase.materialTypeId,
				status: "RECEIVED",
				deletedAt: null,
			},
			_sum: { quantity: true },
		}),
		prisma.rawMaterialIssuance.aggregate({
			where: {
				tenantId,
				materialTypeId: purchase.materialTypeId,
			},
			_sum: { quantity: true },
		}),
	]);

	const totalReceived = decimalOrZero(receivedTotals._sum.quantity);
	const totalIssued = decimalOrZero(issuanceTotals._sum.quantity);
	const removableQuantity =
		purchase.status === "RECEIVED" ? purchase.quantity : new Prisma.Decimal(0);
	const remainingIfDeleted = totalReceived.minus(removableQuantity);

	if (totalIssued.gt(remainingIfDeleted)) {
		throw validationError(
			"Cannot delete purchase because issued quantity exceeds remaining stock",
		);
	}

	await prisma.rawMaterialPurchase.update({
		where: { id: purchaseId },
		data: { deletedAt: new Date() },
	});
};

export const getRawMaterialStock = async (
	tenantId: string,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const types = await prisma.rawMaterialType.findMany({
		where: {
			tenantId,
			deletedAt: null,
			isActive: true,
		},
		orderBy: [{ name: "asc" }, { id: "asc" }],
		select: {
			id: true,
			name: true,
			unit: true,
		},
	});

	if (types.length === 0) {
		return [];
	}

	const typeIds = types.map((type) => type.id);

	const [purchaseSums, issuanceSums] = await Promise.all([
		prisma.rawMaterialPurchase.groupBy({
			by: ["materialTypeId"],
			where: {
				tenantId,
				materialTypeId: { in: typeIds },
				status: "RECEIVED",
				deletedAt: null,
			},
			_sum: { quantity: true },
		}),
		prisma.rawMaterialIssuance.groupBy({
			by: ["materialTypeId"],
			where: {
				tenantId,
				materialTypeId: { in: typeIds },
			},
			_sum: { quantity: true },
		}),
	]);

	const purchaseMap = new Map<string, Prisma.Decimal>();
	for (const row of purchaseSums) {
		purchaseMap.set(row.materialTypeId, decimalOrZero(row._sum.quantity));
	}

	const issuanceMap = new Map<string, Prisma.Decimal>();
	for (const row of issuanceSums) {
		issuanceMap.set(row.materialTypeId, decimalOrZero(row._sum.quantity));
	}

	const stock = types.map((type) => {
		const totalPurchased = purchaseMap.get(type.id) ?? new Prisma.Decimal(0);
		const totalIssued = issuanceMap.get(type.id) ?? new Prisma.Decimal(0);
		const currentStock = totalPurchased.minus(totalIssued);

		return {
			materialTypeId: type.id,
			name: type.name,
			unit: type.unit,
			totalPurchased,
			totalIssued,
			currentStock,
			isLow: currentStock.lt(LOW_STOCK_THRESHOLD),
		};
	});

	stock.sort((a, b) => a.currentStock.comparedTo(b.currentStock));

	return stock;
};

export const getAllIssuances = async (
	tenantId: string,
	query: ListIssuancesQuery,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const where: Prisma.RawMaterialIssuanceWhereInput = {
		tenantId,
		materialTypeId: query.materialTypeId,
		referenceId: query.referenceId,
	};

	if (query.dateFrom || query.dateTo) {
		where.issuedAt = {
			gte: query.dateFrom,
			lte: query.dateTo,
		};
	}

	const skip = (query.page - 1) * query.limit;

	const [items, totalItems] = await prisma.$transaction([
		prisma.rawMaterialIssuance.findMany({
			where,
			orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
			skip,
			take: query.limit,
			include: ISSUANCE_INCLUDE,
		}),
		prisma.rawMaterialIssuance.count({ where }),
	]);

	const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));

	return {
		items,
		pagination: {
			page: query.page,
			limit: query.limit,
			totalItems,
			totalPages,
			hasNextPage: query.page < totalPages,
			hasPreviousPage: query.page > 1,
		},
	};
};

export const getIssuanceById = async (
	tenantId: string,
	issuanceId: string,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const issuance = await prisma.rawMaterialIssuance.findFirst({
		where: {
			id: issuanceId,
			tenantId,
		},
		include: ISSUANCE_INCLUDE,
	});

	if (!issuance) {
		throw notFoundError("Issuance not found");
	}

	return issuance;
};

export const createIssuance = async (
	tenantId: string,
	input: CreateIssuanceInput,
	createdById: string,
	currentUser: CurrentUser,
) => {
	await assertTenantAccess(tenantId, currentUser);

	const materialType = await prisma.rawMaterialType.findFirst({
		where: {
			id: input.materialTypeId,
			tenantId,
			deletedAt: null,
		},
		select: { id: true, unit: true },
	});

	if (!materialType) {
		throw notFoundError("Material type not found");
	}

	const currentStock = await getMaterialTypeStock(tenantId, input.materialTypeId);
	const requestedQuantity = new Prisma.Decimal(input.quantity);

	if (requestedQuantity.gt(currentStock)) {
		throw validationError(
			`Insufficient stock. Available: ${currentStock.toString()} ${materialType.unit}`,
		);
	}

	return prisma.rawMaterialIssuance.create({
		data: {
			tenantId,
			materialTypeId: input.materialTypeId,
			quantity: requestedQuantity,
			issuedTo: normalizeOptionalString(input.issuedTo),
			issuedAt: input.issuedAt,
			notes: normalizeOptionalString(input.notes),
			referenceType: "MANUAL",
			createdById,
		},
		include: ISSUANCE_INCLUDE,
	});
};
