import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import type {
  CreatePackagingBatchInput,
  CreateStockAdjustmentInput,
  ListPackagingBatchesQuery,
  ListStockQuery,
  UpdateLowStockAlertInput,
} from "./inventory.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

type TransactionClient = Prisma.TransactionClient;
type DbClient = TransactionClient | typeof prisma;

const DESIGN_SELECT = {
  id: true,
  tenantId: true,
  categoryId: true,
  designCode: true,
  name: true,
  status: true,
  salePricePerDozen: true,
  deletedAt: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const STOCK_INCLUDE = {
  design: {
    select: DESIGN_SELECT,
  },
} as const;

const PACKAGING_BATCH_INCLUDE = {
  design: {
    select: {
      id: true,
      designCode: true,
      name: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  packedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

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

const findDesignOrThrow = async (
  client: DbClient,
  tenantId: string,
  designId: string,
) => {
  const design = await client.design.findFirst({
    where: {
      id: designId,
      tenantId,
      deletedAt: null,
    },
    select: DESIGN_SELECT,
  });

  if (!design) {
    throw notFoundError("Design not found");
  }

  return design;
};

const sumAdjustments = async (
  client: DbClient,
  tenantId: string,
  designId: string,
  type: "UNPACKAGED" | "PACKAGED",
) => {
  const result = await client.inventoryAdjustment.aggregate({
    where: {
      tenantId,
      designId,
      type,
    },
    _sum: {
      adjustment: true,
    },
  });

  return result._sum.adjustment ?? 0;
};

const calculateStockTotals = async (
  client: DbClient,
  tenantId: string,
  designId: string,
) => {
  const [
    goodsReturns,
    packagingPieces,
    packagingDozens,
    unpackagedAdjustments,
    packagedAdjustments,
  ] = await Promise.all([
    client.goodsReturn.aggregate({
      where: {
        tenantId,
        assignment: {
          is: {
            tenantId,
            designId,
          },
        },
      },
      _sum: {
        acceptedPieces: true,
      },
    }),
    client.packagingBatch.aggregate({
      where: {
        tenantId,
        designId,
      },
      _sum: {
        piecesUsed: true,
      },
    }),
    client.packagingBatch.aggregate({
      where: {
        tenantId,
        designId,
      },
      _sum: {
        dozensPackaged: true,
      },
    }),
    sumAdjustments(client, tenantId, designId, "UNPACKAGED"),
    sumAdjustments(client, tenantId, designId, "PACKAGED"),
  ]);

  const unpackagedPieces =
    (goodsReturns._sum.acceptedPieces ?? 0) +
    unpackagedAdjustments -
    (packagingPieces._sum.piecesUsed ?? 0);
  const packagedDozens =
    (packagingDozens._sum.dozensPackaged ?? 0) + packagedAdjustments;

  return {
    unpackagedPieces,
    packagedDozens,
  };
};

const syncInventoryStock = async (
  client: DbClient,
  tenantId: string,
  designId: string,
) => {
  await findDesignOrThrow(client, tenantId, designId);

  const existingStock = await client.inventoryStock.findUnique({
    where: { designId },
    select: {
      lowStockAlertAt: true,
    },
  });
  const totals = await calculateStockTotals(client, tenantId, designId);

  if (totals.unpackagedPieces < 0 || totals.packagedDozens < 0) {
    throw validationError("Inventory stock cannot be negative");
  }

  return client.inventoryStock.upsert({
    where: { designId },
    create: {
      tenantId,
      designId,
      unpackagedPieces: totals.unpackagedPieces,
      packagedDozens: totals.packagedDozens,
      lowStockAlertAt: existingStock?.lowStockAlertAt ?? 0,
    },
    update: {
      unpackagedPieces: totals.unpackagedPieces,
      packagedDozens: totals.packagedDozens,
    },
    include: STOCK_INCLUDE,
  });
};

const withStockFlags = <T extends { packagedDozens: number; lowStockAlertAt: number }>(
  stock: T,
) => ({
  ...stock,
  isLow: stock.lowStockAlertAt > 0 && stock.packagedDozens < stock.lowStockAlertAt,
});

const getActivityDesignIds = async (tenantId: string) => {
  const [assignments, batches, adjustments, stocks] = await Promise.all([
    prisma.workerAssignment.findMany({
      where: {
        tenantId,
        goodsReturns: {
          some: {},
        },
      },
      distinct: ["designId"],
      select: { designId: true },
    }),
    prisma.packagingBatch.findMany({
      where: { tenantId },
      distinct: ["designId"],
      select: { designId: true },
    }),
    prisma.inventoryAdjustment.findMany({
      where: { tenantId },
      distinct: ["designId"],
      select: { designId: true },
    }),
    prisma.inventoryStock.findMany({
      where: { tenantId },
      select: { designId: true },
    }),
  ]);

  return [
    ...new Set([
      ...assignments.map((item) => item.designId),
      ...batches.map((item) => item.designId),
      ...adjustments.map((item) => item.designId),
      ...stocks.map((item) => item.designId),
    ]),
  ];
};

export const getStockOverview = async (
  tenantId: string,
  query: ListStockQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const activityDesignIds = await getActivityDesignIds(tenantId);
  const designIds = query.designId ? [query.designId] : activityDesignIds;

  if (designIds.length === 0) {
    return {
      items: [],
      pagination: {
        page: query.page,
        limit: query.limit,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  const designs = await prisma.design.findMany({
    where: {
      id: { in: designIds },
      tenantId,
      categoryId: query.categoryId,
      deletedAt: null,
    },
    orderBy: [{ designCode: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  const syncedStocks = await Promise.all(
    designs.map((design) => syncInventoryStock(prisma, tenantId, design.id)),
  );

  const filteredStocks = syncedStocks
    .map(withStockFlags)
    .filter((stock) => query.isLow === undefined || stock.isLow === query.isLow);

  const totalItems = filteredStocks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));
  const skip = (query.page - 1) * query.limit;
  const items = filteredStocks.slice(skip, skip + query.limit);

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

export const getStockByDesign = async (
  tenantId: string,
  designId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const stock = await syncInventoryStock(prisma, tenantId, designId);
  const packagingBatches = await prisma.packagingBatch.findMany({
    where: {
      tenantId,
      designId,
    },
    orderBy: [{ packedAt: "asc" }, { id: "asc" }],
    include: PACKAGING_BATCH_INCLUDE,
  });

  return {
    ...withStockFlags(stock),
    packagingBatches,
  };
};

export const getLowStockAlerts = async (
  tenantId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const activityDesignIds = await getActivityDesignIds(tenantId);
  const stocks = await Promise.all(
    activityDesignIds.map((designId) => syncInventoryStock(prisma, tenantId, designId)),
  );

  return stocks
    .filter((stock) => stock.lowStockAlertAt > 0 && stock.packagedDozens < stock.lowStockAlertAt)
    .map((stock) => ({
      ...stock,
      deficitDozens: stock.lowStockAlertAt - stock.packagedDozens,
    }))
    .sort((a, b) => b.deficitDozens - a.deficitDozens);
};

export const createPackagingBatch = async (
  tenantId: string,
  input: CreatePackagingBatchInput,
  packedById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  return prisma.$transaction(async (tx) => {
    const stock = await syncInventoryStock(tx, tenantId, input.designId);
    const piecesUsed = input.dozensPackaged * 12;

    if (stock.unpackagedPieces < piecesUsed) {
      throw validationError(
        `Insufficient unpackaged stock. Available: ${stock.unpackagedPieces} pieces, Required: ${piecesUsed} pieces`,
      );
    }

    const batch = await tx.packagingBatch.create({
      data: {
        tenantId,
        inventoryStockId: stock.id,
        designId: input.designId,
        dozensPackaged: input.dozensPackaged,
        piecesUsed,
        packedById,
        notes: normalizeOptionalString(input.notes),
      },
      include: PACKAGING_BATCH_INCLUDE,
    });

    const updatedStock = await syncInventoryStock(tx, tenantId, input.designId);

    return {
      batch,
      stock: withStockFlags(updatedStock),
    };
  });
};

export const getPackagingBatches = async (
  tenantId: string,
  query: ListPackagingBatchesQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.PackagingBatchWhereInput = {
    tenantId,
    designId: query.designId,
  };

  if (query.dateFrom || query.dateTo) {
    where.packedAt = {
      gte: query.dateFrom,
      lte: query.dateTo,
    };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.packagingBatch.findMany({
      where,
      orderBy: [{ packedAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      include: PACKAGING_BATCH_INCLUDE,
    }),
    prisma.packagingBatch.count({ where }),
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

export const getPackagingBatchById = async (
  tenantId: string,
  batchId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const batch = await prisma.packagingBatch.findFirst({
    where: {
      id: batchId,
      tenantId,
    },
    include: PACKAGING_BATCH_INCLUDE,
  });

  if (!batch) {
    throw notFoundError("Packaging batch not found");
  }

  return batch;
};

export const updateLowStockAlert = async (
  tenantId: string,
  designId: string,
  input: UpdateLowStockAlertInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await syncInventoryStock(prisma, tenantId, designId);

  const stock = await prisma.inventoryStock.update({
    where: { designId },
    data: {
      lowStockAlertAt: input.lowStockAlertAt,
    },
    include: STOCK_INCLUDE,
  });

  return withStockFlags(stock);
};

export const createStockAdjustment = async (
  tenantId: string,
  designId: string,
  input: CreateStockAdjustmentInput,
  adjustedById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  return prisma.$transaction(async (tx) => {
    const stock = await syncInventoryStock(tx, tenantId, designId);
    const nextUnpackagedPieces =
      input.type === "UNPACKAGED"
        ? stock.unpackagedPieces + input.adjustment
        : stock.unpackagedPieces;
    const nextPackagedDozens =
      input.type === "PACKAGED"
        ? stock.packagedDozens + input.adjustment
        : stock.packagedDozens;

    if (nextUnpackagedPieces < 0) {
      throw validationError(
        `Adjustment would make unpackaged stock negative. Available: ${stock.unpackagedPieces} pieces`,
      );
    }

    if (nextPackagedDozens < 0) {
      throw validationError(
        `Adjustment would make packaged stock negative. Available: ${stock.packagedDozens} dozens`,
      );
    }

    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        tenantId,
        inventoryStockId: stock.id,
        designId,
        type: input.type,
        adjustment: input.adjustment,
        notes: input.notes.trim(),
        adjustedById,
      },
    });

    const updatedStock = await syncInventoryStock(tx, tenantId, designId);

    return {
      adjustment,
      stock: withStockFlags(updatedStock),
    };
  });
};
