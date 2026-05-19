import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import type {
  CreateAssignmentInput,
  CreateGoodsReturnInput,
  ListAssignmentsQuery,
  ListGoodsReturnsQuery,
  UpdateAssignmentInput,
} from "./assignments.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

type TransactionClient = Prisma.TransactionClient;
type DbClient = TransactionClient | typeof prisma;

const WORKER_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  phone: true,
  isActive: true,
  deletedAt: true,
} as const;

const DESIGN_SELECT = {
  id: true,
  tenantId: true,
  categoryId: true,
  designCode: true,
  name: true,
  pieceRateRs: true,
  status: true,
  deletedAt: true,
} as const;

const RAW_MATERIAL_TYPE_SELECT = {
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

const SUPPLEMENTARY_TYPE_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  unit: true,
  description: true,
  stockQuantity: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const USER_NAME_SELECT = {
  id: true,
  name: true,
} as const;

const ASSIGNMENT_LIST_INCLUDE = {
  worker: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  design: {
    select: {
      id: true,
      designCode: true,
      name: true,
    },
  },
  rawMaterialIssuances: {
    orderBy: [{ issuedAt: "asc" }, { id: "asc" }],
    include: {
      materialType: {
        select: RAW_MATERIAL_TYPE_SELECT,
      },
    },
  },
} satisfies Prisma.WorkerAssignmentInclude;

const GOODS_RETURN_WITH_CREATOR_INCLUDE = {
  createdBy: {
    select: USER_NAME_SELECT,
  },
} as const;

const SUPPLEMENTARY_ISSUANCE_INCLUDE = {
  materialType: {
    select: SUPPLEMENTARY_TYPE_SELECT,
  },
} as const;

const RAW_MATERIAL_ISSUANCE_INCLUDE = {
  materialType: {
    select: RAW_MATERIAL_TYPE_SELECT,
  },
} as const;

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

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

const getRawMaterialStock = async (
  client: DbClient,
  tenantId: string,
  materialTypeId: string,
) => {
  const [purchases, issued, returned] = await Promise.all([
    client.rawMaterialPurchase.aggregate({
      where: {
        tenantId,
        materialTypeId,
        status: "RECEIVED",
        deletedAt: null,
      },
      _sum: { quantity: true },
    }),
    client.rawMaterialIssuance.aggregate({
      where: {
        tenantId,
        materialTypeId,
        movementType: "ISSUE",
      },
      _sum: { quantity: true },
    }),
    client.rawMaterialIssuance.aggregate({
      where: {
        tenantId,
        materialTypeId,
        movementType: "RETURN",
      },
      _sum: { quantity: true },
    }),
  ]);

  return decimalOrZero(purchases._sum.quantity)
    .minus(decimalOrZero(issued._sum.quantity))
    .plus(decimalOrZero(returned._sum.quantity));
};

const getAssignmentDetailsOrThrow = async (
  client: DbClient,
  tenantId: string,
  assignmentId: string,
) => {
  const assignment = await client.workerAssignment.findFirst({
    where: {
      id: assignmentId,
      tenantId,
    },
    include: {
      ...ASSIGNMENT_LIST_INCLUDE,
      rawMaterialIssuances: {
        orderBy: [{ issuedAt: "asc" }, { id: "asc" }],
        include: RAW_MATERIAL_ISSUANCE_INCLUDE,
      },
      supplementaryIssuances: {
        orderBy: [{ issuedAt: "asc" }, { id: "asc" }],
        include: SUPPLEMENTARY_ISSUANCE_INCLUDE,
      },
      goodsReturns: {
        orderBy: [{ returnedAt: "asc" }, { id: "asc" }],
        include: GOODS_RETURN_WITH_CREATOR_INCLUDE,
      },
    },
  });

  if (!assignment) {
    throw notFoundError("Assignment not found");
  }

  return assignment;
};

const getAssignmentBaseOrThrow = async (
  client: DbClient,
  tenantId: string,
  assignmentId: string,
) => {
  const assignment = await client.workerAssignment.findFirst({
    where: {
      id: assignmentId,
      tenantId,
    },
    select: {
      id: true,
      tenantId: true,
      workerId: true,
      designId: true,
      expectedPieces: true,
      returnedPieces: true,
      rejectedPieces: true,
      pieceRateAtAssignment: true,
      totalEarned: true,
      status: true,
      issuedAt: true,
      expectedReturnDate: true,
      completedAt: true,
      notes: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!assignment) {
    throw notFoundError("Assignment not found");
  }

  return assignment;
};

export const getAllAssignments = async (
  tenantId: string,
  query: ListAssignmentsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.WorkerAssignmentWhereInput = {
    tenantId,
    workerId: query.workerId,
    designId: query.designId,
    status: query.status,
  };

  if (query.dateFrom || query.dateTo) {
    where.issuedAt = {
      gte: query.dateFrom,
      lte: query.dateTo,
    };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.workerAssignment.findMany({
      where,
      orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      include: ASSIGNMENT_LIST_INCLUDE,
    }),
    prisma.workerAssignment.count({ where }),
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

export const getAssignmentById = async (
  tenantId: string,
  assignmentId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  return getAssignmentDetailsOrThrow(prisma, tenantId, assignmentId);
};

export const createAssignment = async (
  tenantId: string,
  input: CreateAssignmentInput,
  createdById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const assignmentId = await prisma.$transaction(async (tx) => {
    const worker = await tx.worker.findFirst({
      where: {
        id: input.workerId,
        tenantId,
        deletedAt: null,
      },
      select: WORKER_SELECT,
    });

    if (!worker) {
      throw notFoundError("Worker not found");
    }

    if (!worker.isActive) {
      throw validationError("Worker must be active to create assignments");
    }

    const design = await tx.design.findFirst({
      where: {
        id: input.designId,
        tenantId,
        deletedAt: null,
      },
      select: DESIGN_SELECT,
    });

    if (!design) {
      throw notFoundError("Design not found");
    }

    if (design.status !== "ACTIVE") {
      throw validationError("Design must be active to create assignments");
    }

    const requestedRawMaterials = input.rawMaterials.map((item) => ({
      materialTypeId: item.rawMaterialTypeId,
      quantity: new Prisma.Decimal(item.rawMaterialQty),
    }));
    const rawMaterialTypeIds = requestedRawMaterials.map((item) => item.materialTypeId);
    const rawMaterialTypes = await tx.rawMaterialType.findMany({
      where: {
        id: { in: rawMaterialTypeIds },
        tenantId,
        deletedAt: null,
      },
      select: RAW_MATERIAL_TYPE_SELECT,
    });
    const rawMaterialTypeById = new Map(rawMaterialTypes.map((type) => [type.id, type]));

    for (const requestedMaterial of requestedRawMaterials) {
      const rawMaterialType = rawMaterialTypeById.get(requestedMaterial.materialTypeId);

      if (!rawMaterialType) {
        throw notFoundError("Raw material type not found");
      }

      if (!rawMaterialType.isActive) {
        throw validationError(`${rawMaterialType.name} raw material type must be active`);
      }

      const availableRawMaterialStock = await getRawMaterialStock(
        tx,
        tenantId,
        requestedMaterial.materialTypeId,
      );

      if (availableRawMaterialStock.lt(requestedMaterial.quantity)) {
        throw validationError(
          `Insufficient raw material stock for ${rawMaterialType.name}. Available: ${availableRawMaterialStock.toString()} ${rawMaterialType.unit}, Requested: ${requestedMaterial.quantity.toString()} ${rawMaterialType.unit}`,
        );
      }
    }

    const supplementaryNeeds = await tx.designSupplementaryNeed.findMany({
      where: {
        designId: design.id,
      },
      include: {
        materialType: {
          select: SUPPLEMENTARY_TYPE_SELECT,
        },
      },
    });

    const expectedPiecesDecimal = new Prisma.Decimal(input.expectedPieces);
    const supplementaryIssuances = supplementaryNeeds.map((need) => ({
      materialTypeId: need.materialTypeId,
      materialName: need.materialType.name,
      unit: need.materialType.unit,
      requiredQuantity: need.quantityPerPiece.mul(expectedPiecesDecimal),
      availableQuantity: need.materialType.stockQuantity,
      notes: need.notes,
    }));

    for (const issuance of supplementaryIssuances) {
      if (issuance.availableQuantity.lt(issuance.requiredQuantity)) {
        throw validationError(
          `Insufficient stock for ${issuance.materialName}. Available: ${issuance.availableQuantity.toString()} ${issuance.unit}, Required: ${issuance.requiredQuantity.toString()} ${issuance.unit}`,
        );
      }
    }

    const assignment = await tx.workerAssignment.create({
      data: {
        tenantId,
        workerId: input.workerId,
        designId: input.designId,
        expectedPieces: input.expectedPieces,
        pieceRateAtAssignment: design.pieceRateRs,
        totalEarned: new Prisma.Decimal(0),
        status: "ISSUED",
        expectedReturnDate: input.expectedReturnDate ?? null,
        notes: normalizeOptionalString(input.notes),
        createdById,
      },
      select: { id: true },
    });

    await tx.rawMaterialIssuance.createMany({
      data: requestedRawMaterials.map((requestedMaterial) => ({
        tenantId,
        materialTypeId: requestedMaterial.materialTypeId,
        assignmentId: assignment.id,
        movementType: "ISSUE",
        quantity: requestedMaterial.quantity,
        notes: normalizeOptionalString(input.notes),
        createdById,
      })),
    });

    for (const issuance of supplementaryIssuances) {
      await tx.supplementaryIssuance.create({
        data: {
          tenantId,
          assignmentId: assignment.id,
          materialTypeId: issuance.materialTypeId,
          quantity: issuance.requiredQuantity,
          notes: issuance.notes,
          createdById,
        },
      });

      await tx.supplementaryMaterialType.update({
        where: { id: issuance.materialTypeId },
        data: {
          stockQuantity: {
            decrement: issuance.requiredQuantity,
          },
        },
      });
    }

    return assignment.id;
  });

  return getAssignmentDetailsOrThrow(prisma, tenantId, assignmentId);
};

export const updateAssignment = async (
  tenantId: string,
  assignmentId: string,
  input: UpdateAssignmentInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const assignment = await getAssignmentBaseOrThrow(prisma, tenantId, assignmentId);

  if (assignment.status === "COMPLETED" || assignment.status === "CLOSED") {
    throw validationError("Cannot update a completed or closed assignment");
  }

  return prisma.workerAssignment.update({
    where: { id: assignmentId },
    data: {
      expectedReturnDate:
        input.expectedReturnDate !== undefined ? input.expectedReturnDate ?? null : undefined,
      notes: input.notes !== undefined ? normalizeOptionalString(input.notes) : undefined,
    },
    include: ASSIGNMENT_LIST_INCLUDE,
  });
};

export const updateAssignmentStatus = async (
  tenantId: string,
  assignmentId: string,
  status: "IN_PROGRESS",
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const assignment = await getAssignmentBaseOrThrow(prisma, tenantId, assignmentId);

  if (assignment.status !== "ISSUED") {
    throw validationError("Assignment must be in ISSUED status to mark as in progress");
  }

  return prisma.workerAssignment.update({
    where: { id: assignmentId },
    data: { status },
    include: ASSIGNMENT_LIST_INCLUDE,
  });
};

export const closeAssignment = async (
  tenantId: string,
  assignmentId: string,
  notes: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const assignment = await getAssignmentBaseOrThrow(tx, tenantId, assignmentId);

    if (assignment.status === "COMPLETED" || assignment.status === "CLOSED") {
      throw validationError("Assignment is already completed or closed");
    }

    const rawMaterialMovements = await tx.rawMaterialIssuance.groupBy({
      by: ["materialTypeId", "movementType"],
      where: {
        tenantId,
        assignmentId,
      },
      _sum: { quantity: true },
    });

    const issuedByMaterialType = new Map<string, Prisma.Decimal>();
    const returnedByMaterialType = new Map<string, Prisma.Decimal>();

    for (const movement of rawMaterialMovements) {
      const quantity = decimalOrZero(movement._sum.quantity);
      if (movement.movementType === "RETURN") {
        returnedByMaterialType.set(movement.materialTypeId, quantity);
      } else {
        issuedByMaterialType.set(movement.materialTypeId, quantity);
      }
    }

    const producedPieces = assignment.returnedPieces + assignment.rejectedPieces;
    const remainingPieces = Math.max(assignment.expectedPieces - producedPieces, 0);
    const remainingRatio = new Prisma.Decimal(remainingPieces).div(assignment.expectedPieces);
    const closedAt = new Date();

    const returnMovements = Array.from(issuedByMaterialType.entries())
      .map(([materialTypeId, issuedQuantity]) => {
        const alreadyReturnedQuantity =
          returnedByMaterialType.get(materialTypeId) ?? new Prisma.Decimal(0);
        const returnQuantity = issuedQuantity
          .mul(remainingRatio)
          .minus(alreadyReturnedQuantity)
          .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);

        return {
          materialTypeId,
          quantity: returnQuantity,
        };
      })
      .filter((movement) => movement.quantity.gt(0));

    if (returnMovements.length > 0) {
      await tx.rawMaterialIssuance.createMany({
        data: returnMovements.map((movement) => ({
          tenantId,
          materialTypeId: movement.materialTypeId,
          assignmentId,
          movementType: "RETURN",
          quantity: movement.quantity,
          issuedAt: closedAt,
          notes: `Assignment closed: ${notes.trim()}`,
          createdById: currentUser.userId,
        })),
      });
    }

    await tx.workerAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "CLOSED",
        notes: notes.trim(),
        completedAt: closedAt,
      },
    });
  });

  return getAssignmentDetailsOrThrow(prisma, tenantId, assignmentId);
};

export const recordGoodsReturn = async (
  tenantId: string,
  assignmentId: string,
  input: CreateGoodsReturnInput,
  createdById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  return prisma.$transaction(async (tx) => {
    const assignment = await getAssignmentBaseOrThrow(tx, tenantId, assignmentId);

    if (assignment.status === "COMPLETED" || assignment.status === "CLOSED") {
      throw validationError("Cannot record return for a completed or closed assignment");
    }

    const acceptedPieces = input.piecesReturned - input.rejectedPieces;
    const acceptedPiecesDecimal = new Prisma.Decimal(acceptedPieces);
    const earningAmount = acceptedPiecesDecimal.mul(assignment.pieceRateAtAssignment);
    const returnedAt = input.returnedAt ?? new Date();

    const goodsReturn = await tx.goodsReturn.create({
      data: {
        tenantId,
        assignmentId,
        piecesReturned: input.piecesReturned,
        rejectedPieces: input.rejectedPieces,
        acceptedPieces,
        earningAmount,
        returnedAt,
        rejectionNotes: normalizeOptionalString(input.rejectionNotes),
        notes: normalizeOptionalString(input.notes),
        createdById,
      },
      include: GOODS_RETURN_WITH_CREATOR_INCLUDE,
    });

    const returnedPieces = assignment.returnedPieces + acceptedPieces;
    const rejectedPieces = assignment.rejectedPieces + input.rejectedPieces;
    const totalEarned = assignment.totalEarned.plus(earningAmount);
    const status = returnedPieces >= assignment.expectedPieces ? "COMPLETED" : "PARTIALLY_RETURNED";

    const updatedAssignment = await tx.workerAssignment.update({
      where: { id: assignmentId },
      data: {
        returnedPieces,
        rejectedPieces,
        totalEarned,
        status,
        completedAt: status === "COMPLETED" ? returnedAt : undefined,
      },
      select: {
        id: true,
        expectedPieces: true,
        returnedPieces: true,
        rejectedPieces: true,
        totalEarned: true,
        status: true,
        completedAt: true,
      },
    });

    return {
      goodsReturn,
      assignment: updatedAssignment,
    };
  });
};

export const getAssignmentReturns = async (
  tenantId: string,
  assignmentId: string,
  query: ListGoodsReturnsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await getAssignmentBaseOrThrow(prisma, tenantId, assignmentId);

  const where: Prisma.GoodsReturnWhereInput = {
    tenantId,
    assignmentId,
  };

  if (query.dateFrom || query.dateTo) {
    where.returnedAt = {
      gte: query.dateFrom,
      lte: query.dateTo,
    };
  }

  return prisma.goodsReturn.findMany({
    where,
    orderBy: [{ returnedAt: "asc" }, { id: "asc" }],
    include: GOODS_RETURN_WITH_CREATOR_INCLUDE,
  });
};

export const getAllGoodsReturns = async (
  tenantId: string,
  query: ListGoodsReturnsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.GoodsReturnWhereInput = {
    tenantId,
    assignmentId: query.assignmentId,
  };

  if (query.workerId) {
    where.assignment = {
      is: {
        tenantId,
        workerId: query.workerId,
      },
    };
  }

  if (query.dateFrom || query.dateTo) {
    where.returnedAt = {
      gte: query.dateFrom,
      lte: query.dateTo,
    };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.goodsReturn.findMany({
      where,
      orderBy: [{ returnedAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      include: {
        ...GOODS_RETURN_WITH_CREATOR_INCLUDE,
        assignment: {
          select: {
            id: true,
            status: true,
            worker: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            design: {
              select: {
                id: true,
                designCode: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.goodsReturn.count({ where }),
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

export const getGoodsReturnById = async (
  tenantId: string,
  goodsReturnId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const goodsReturn = await prisma.goodsReturn.findFirst({
    where: {
      id: goodsReturnId,
      tenantId,
    },
    include: {
      ...GOODS_RETURN_WITH_CREATOR_INCLUDE,
      assignment: {
        select: {
          id: true,
          status: true,
          expectedPieces: true,
          returnedPieces: true,
          rejectedPieces: true,
          totalEarned: true,
          worker: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          design: {
            select: {
              id: true,
              designCode: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!goodsReturn) {
    throw notFoundError("Goods return not found");
  }

  return goodsReturn;
};
