import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import { syncInventoryStock } from "./inventory-stock";

import type {
  CreatePackagingBatchInput,
  CreateStockAdjustmentInput,
  ListPackagingBatchesQuery,
  ListStockQuery,
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
  salePriceRs: true,
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
  inventoryStock: {
    select: {
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
    },
  },
  packedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

type PackagingBatchWithRelations = Prisma.PackagingBatchGetPayload<{
  include: typeof PACKAGING_BATCH_INCLUDE;
}>;

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const formatPackagingBatch = (batch: PackagingBatchWithRelations) => {
  const { inventoryStock, ...rest } = batch;

  return {
    ...rest,
    design: inventoryStock.design,
  };
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

const syncInventoryStockWithInclude = async (
  client: DbClient,
  tenantId: string,
  designId: string,
) => {
  await findDesignOrThrow(client, tenantId, designId);
  await syncInventoryStock(client, tenantId, designId);

  return client.inventoryStock.findUniqueOrThrow({
    where: { designId },
    include: STOCK_INCLUDE,
  });
};

const getActivityDesignIds = async (tenantId: string) => {
  const [assignments, batches, adjustments, stocks, dispatchItems] = await Promise.all([
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
      select: {
        inventoryStock: {
          select: { designId: true },
        },
      },
    }),
    prisma.inventoryAdjustment.findMany({
      where: { tenantId },
      select: {
        inventoryStock: {
          select: { designId: true },
        },
      },
    }),
    prisma.inventoryStock.findMany({
      where: { tenantId },
      select: { designId: true },
    }),
    prisma.orderDispatchItem.findMany({
      where: { tenantId },
      select: {
        orderItem: {
          select: { designId: true },
        },
      },
    }),
  ]);

  return [
    ...new Set([
      ...assignments.map((item) => item.designId),
      ...batches.map((item) => item.inventoryStock.designId),
      ...adjustments.map((item) => item.inventoryStock.designId),
      ...stocks.map((item) => item.designId),
      ...dispatchItems.map((item) => item.orderItem.designId),
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
    designs.map((design) => syncInventoryStockWithInclude(prisma, tenantId, design.id)),
  );

  const totalItems = syncedStocks.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));
  const skip = (query.page - 1) * query.limit;
  const items = syncedStocks.slice(skip, skip + query.limit);

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

  const stock = await syncInventoryStockWithInclude(prisma, tenantId, designId);
  const packagingBatches = await prisma.packagingBatch.findMany({
    where: {
      tenantId,
      inventoryStock: {
        is: {
          tenantId,
          designId,
        },
      },
    },
    orderBy: [{ packedAt: "asc" }, { id: "asc" }],
    include: PACKAGING_BATCH_INCLUDE,
  });

  return {
    ...stock,
    packagingBatches: packagingBatches.map(formatPackagingBatch),
  };
};

export const createPackagingBatch = async (
  tenantId: string,
  input: CreatePackagingBatchInput,
  packedById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  return prisma.$transaction(async (tx) => {
    const stock = await syncInventoryStockWithInclude(tx, tenantId, input.designId);

    if (stock.unpackagedPieces < input.piecesPackaged) {
      throw validationError(
        `Insufficient unpackaged stock. Available: ${stock.unpackagedPieces} pieces, Required: ${input.piecesPackaged} pieces`,
      );
    }

    const batch = await tx.packagingBatch.create({
      data: {
        tenantId,
        inventoryStockId: stock.id,
        piecesPackaged: input.piecesPackaged,
        packedById,
        notes: normalizeOptionalString(input.notes),
      },
      include: PACKAGING_BATCH_INCLUDE,
    });

    const updatedStock = await syncInventoryStockWithInclude(tx, tenantId, input.designId);

    return {
      batch: formatPackagingBatch(batch),
      stock: updatedStock,
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
  };

  if (query.designId) {
    where.inventoryStock = {
      is: {
        tenantId,
        designId: query.designId,
      },
    };
  }

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
    items: items.map(formatPackagingBatch),
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

  return formatPackagingBatch(batch);
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
    const stock = await syncInventoryStockWithInclude(tx, tenantId, designId);
    const nextUnpackagedPieces =
      input.type === "UNPACKAGED"
        ? stock.unpackagedPieces + input.adjustment
        : stock.unpackagedPieces;
    const nextPackagedPieces =
      input.type === "PACKAGED"
        ? stock.packagedPieces + input.adjustment
        : stock.packagedPieces;

    if (nextUnpackagedPieces < 0) {
      throw validationError(
        `Adjustment would make unpackaged stock negative. Available: ${stock.unpackagedPieces} pieces`,
      );
    }

    if (nextPackagedPieces < 0) {
      throw validationError(
        `Adjustment would make packaged stock negative. Available: ${stock.packagedPieces} pieces`,
      );
    }

    const adjustment = await tx.inventoryAdjustment.create({
      data: {
        tenantId,
        inventoryStockId: stock.id,
        type: input.type,
        adjustment: input.adjustment,
        notes: input.notes.trim(),
        adjustedById,
      },
    });

    const updatedStock = await syncInventoryStockWithInclude(tx, tenantId, designId);

    return {
      adjustment,
      stock: updatedStock,
    };
  });
};
