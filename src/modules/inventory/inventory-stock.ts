import { Prisma } from "@prisma/client";

import { notFoundError, validationError } from "../../common/errors/app-error";

type DbClient = Prisma.TransactionClient | {
  goodsReturn: Prisma.TransactionClient["goodsReturn"];
  packagingBatch: Prisma.TransactionClient["packagingBatch"];
  inventoryAdjustment: Prisma.TransactionClient["inventoryAdjustment"];
  orderDispatchItem: Prisma.TransactionClient["orderDispatchItem"];
  design: Prisma.TransactionClient["design"];
  inventoryStock: Prisma.TransactionClient["inventoryStock"];
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
      inventoryStock: {
        is: {
          tenantId,
          designId,
        },
      },
      type,
    },
    _sum: {
      adjustment: true,
    },
  });

  return result._sum.adjustment ?? 0;
};

export const getDispatchedPieces = async (
  client: DbClient,
  tenantId: string,
  designId: string,
) => {
  const dispatched = await client.orderDispatchItem.aggregate({
    where: {
      tenantId,
      orderItem: {
        is: {
          tenantId,
          designId,
        },
      },
    },
    _sum: {
      piecesDispatched: true,
    },
  });

  return dispatched._sum?.piecesDispatched ?? 0;
};

export const calculateStockTotals = async (
  client: DbClient,
  tenantId: string,
  designId: string,
) => {
  const [
    goodsReturns,
    packagingPieces,
    unpackagedAdjustments,
    packagedAdjustments,
    dispatchedPieces,
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
        inventoryStock: {
          is: {
            tenantId,
            designId,
          },
        },
      },
      _sum: {
        piecesPackaged: true,
      },
    }),
    sumAdjustments(client, tenantId, designId, "UNPACKAGED"),
    sumAdjustments(client, tenantId, designId, "PACKAGED"),
    getDispatchedPieces(client, tenantId, designId),
  ]);

  const unpackagedPieces =
    (goodsReturns._sum.acceptedPieces ?? 0) +
    unpackagedAdjustments -
    (packagingPieces._sum.piecesPackaged ?? 0);
  const packagedPieces =
    (packagingPieces._sum.piecesPackaged ?? 0) +
    packagedAdjustments -
    dispatchedPieces;

  return {
    unpackagedPieces,
    packagedPieces,
  };
};

export const syncInventoryStock = async (
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
    select: { id: true },
  });

  if (!design) {
    throw notFoundError("Design not found");
  }
  const totals = await calculateStockTotals(client, tenantId, designId);

  if (totals.unpackagedPieces < 0) {
    throw validationError(
      `Inventory stock cannot be negative. Current unpackaged stock: ${totals.unpackagedPieces} pieces`,
    );
  }

  if (totals.packagedPieces < 0) {
    throw validationError(
      `Inventory stock cannot be negative. Current packaged stock: ${totals.packagedPieces} pieces`,
    );
  }

  return client.inventoryStock.upsert({
    where: { designId },
    create: {
      tenantId,
      designId,
      unpackagedPieces: totals.unpackagedPieces,
      packagedPieces: totals.packagedPieces,
    },
    update: {
      unpackagedPieces: totals.unpackagedPieces,
      packagedPieces: totals.packagedPieces,
    },
  });
};
