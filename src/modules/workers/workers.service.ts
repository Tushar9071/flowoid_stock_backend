import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import type {
  CreateWorkerPaymentInput,
  CreateWorkerInput,
  ListAssignmentsQuery,
  ListPaymentsQuery,
  ListWorkerPaymentsQuery,
  ListWorkersQuery,
  UpdateWorkerInput,
} from "./workers.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

type TransactionClient = Prisma.TransactionClient;
type DbClient = TransactionClient | typeof prisma;

type LedgerEntryDraft = {
  sortDate: Date;
  sortOrder: number;
  sortId: string;
  date: Date;
  type: string;
  description: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
};

const ACTIVE_ASSIGNMENT_STATUSES = [
  "ISSUED",
  "IN_PROGRESS",
  "PARTIALLY_RETURNED",
] as const;

const CATEGORY_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const WORKER_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  phone: true,
  alternatePhone: true,
  address: true,
  city: true,
  idProofType: true,
  idProofNumber: true,
  openingBalance: true,
  openingBalanceType: true,
  openingBalanceDate: true,
  notes: true,
  isActive: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
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

const USER_NAME_SELECT = {
  id: true,
  name: true,
} as const;

const WORKER_ASSIGNMENT_INCLUDE = {
  design: {
    select: {
      id: true,
      categoryId: true,
      designCode: true,
      name: true,
      status: true,
      category: { select: CATEGORY_SELECT },
    },
  },
  rawMaterialType: { select: RAW_MATERIAL_TYPE_SELECT },
} as const;

const WORKER_PAYMENT_SELECT = {
  id: true,
  tenantId: true,
  workerId: true,
  amount: true,
  paymentType: true,
  paymentMode: true,
  paidAt: true,
  notes: true,
  recordedById: true,
  createdAt: true,
  updatedAt: true,
} as const;

const WORKER_PAYMENT_LIST_SELECT = {
  ...WORKER_PAYMENT_SELECT,
  worker: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

const WORKER_PAYMENT_DETAIL_SELECT = {
  ...WORKER_PAYMENT_SELECT,
  worker: {
    select: WORKER_SELECT,
  },
  recordedBy: {
    select: USER_NAME_SELECT,
  },
} as const;

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeName = (value: string): string => value.trim().replace(/\s+/g, " ");

const toDecimal = (value?: number): Prisma.Decimal | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return new Prisma.Decimal(value);
};

const decimalOrZero = (value: Prisma.Decimal | null | undefined): Prisma.Decimal =>
  value ?? new Prisma.Decimal(0);

const formatAmount = (value: Prisma.Decimal): string => value.toFixed(2);

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

const findWorkerOrThrowWithClient = async (
  client: DbClient,
  tenantId: string,
  workerId: string,
) => {
  const worker = await client.worker.findFirst({
    where: {
      id: workerId,
      tenantId,
      deletedAt: null,
    },
    select: WORKER_SELECT,
  });

  if (!worker) {
    throw notFoundError("Worker not found");
  }

  return worker;
};

const findWorkerOrThrow = async (tenantId: string, workerId: string) =>
  findWorkerOrThrowWithClient(prisma, tenantId, workerId);

const findActiveWorkerOrThrowWithClient = async (
  client: DbClient,
  tenantId: string,
  workerId: string,
) => {
  const worker = await findWorkerOrThrowWithClient(client, tenantId, workerId);

  if (!worker.isActive) {
    throw validationError("Worker must be active to record payments");
  }

  return worker;
};

const attachActiveAssignmentCounts = async (
  tenantId: string,
  workers: Array<{ id: string } & Record<string, unknown>>,
) => {
  if (workers.length === 0) {
    return [];
  }

  const workerIds = workers.map((worker) => worker.id);
  const counts = await prisma.workerAssignment.groupBy({
    by: ["workerId"],
    where: {
      tenantId,
      workerId: { in: workerIds },
      status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
    },
    _count: {
      _all: true,
    },
  });

  const countMap = new Map<string, number>();
  for (const row of counts) {
    countMap.set(row.workerId, row._count._all);
  }

  return workers.map((worker) => ({
    ...worker,
    activeAssignments: countMap.get(worker.id) ?? 0,
  }));
};

const getWorkerPaymentBalances = async (
  client: DbClient,
  tenantId: string,
  worker: {
    id: string;
    openingBalance: Prisma.Decimal;
    openingBalanceType: string;
  },
) => {
  const [assignmentTotals, activeAssignments, settlementPayments, advancePayments, recoveryPayments] =
    await Promise.all([
      client.workerAssignment.aggregate({
        where: {
          tenantId,
          workerId: worker.id,
        },
        _sum: {
          totalEarned: true,
          returnedPieces: true,
        },
      }),
      client.workerAssignment.count({
        where: {
          tenantId,
          workerId: worker.id,
          status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
        },
      }),
      client.workerPayment.aggregate({
        where: {
          tenantId,
          workerId: worker.id,
          paymentType: "EARNING_SETTLEMENT",
        },
        _sum: {
          amount: true,
        },
      }),
      client.workerPayment.aggregate({
        where: {
          tenantId,
          workerId: worker.id,
          paymentType: "ADVANCE",
        },
        _sum: {
          amount: true,
        },
      }),
      client.workerPayment.aggregate({
        where: {
          tenantId,
          workerId: worker.id,
          paymentType: "ADVANCE_RECOVERY",
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

  const totalEarned = decimalOrZero(assignmentTotals._sum.totalEarned);
  const earningSettlements = decimalOrZero(settlementPayments._sum.amount);
  const advanceGiven = decimalOrZero(advancePayments._sum.amount);
  const advanceRecovered = decimalOrZero(recoveryPayments._sum.amount);
  const totalPaid = earningSettlements.plus(advanceGiven);
  const openingPayable =
    worker.openingBalanceType === "PAYABLE" ? worker.openingBalance : new Prisma.Decimal(0);
  const openingReceivable =
    worker.openingBalanceType === "RECEIVABLE" ? worker.openingBalance : new Prisma.Decimal(0);

  return {
    totalEarned,
    earningSettlements,
    totalPaid,
    advanceGiven,
    advanceRecovered,
    netAdvanceBalance: advanceGiven.minus(advanceRecovered),
    outstandingBalance: totalEarned
      .plus(openingPayable)
      .minus(openingReceivable)
      .minus(earningSettlements)
      .minus(advanceGiven)
      .minus(advanceRecovered),
    activeAssignments,
    totalPiecesDelivered: assignmentTotals._sum.returnedPieces ?? 0,
  };
};

const buildWorkerSummaryWithClient = async (
  client: DbClient,
  tenantId: string,
  worker: {
    id: string;
    openingBalance: Prisma.Decimal;
    openingBalanceType: string;
  },
) => {
  const balances = await getWorkerPaymentBalances(client, tenantId, worker);

  return {
    totalEarned: balances.totalEarned,
    totalPaid: balances.totalPaid,
    advanceGiven: balances.advanceGiven,
    outstandingBalance: balances.outstandingBalance,
    activeAssignments: balances.activeAssignments,
    totalPiecesDelivered: balances.totalPiecesDelivered,
  };
};

const buildWorkerSummary = async (
  tenantId: string,
  worker: {
    id: string;
    openingBalance: Prisma.Decimal;
    openingBalanceType: string;
  },
) => buildWorkerSummaryWithClient(prisma, tenantId, worker);

export const getAllWorkers = async (
  tenantId: string,
  query: ListWorkersQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.WorkerWhereInput = {
    tenantId,
    deletedAt: null,
    isActive: query.isActive,
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
    ];
  }

  if (query.city) {
    where.city = { equals: query.city, mode: "insensitive" };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.worker.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: query.limit,
      select: WORKER_SELECT,
    }),
    prisma.worker.count({ where }),
  ]);

  const itemsWithCounts = await attachActiveAssignmentCounts(tenantId, items);
  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));

  return {
    items: itemsWithCounts,
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

export const getWorkerById = async (
  tenantId: string,
  workerId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const worker = await findWorkerOrThrow(tenantId, workerId);
  const summary = await buildWorkerSummary(tenantId, worker);

  return {
    ...worker,
    summary,
  };
};

export const createWorker = async (
  tenantId: string,
  input: CreateWorkerInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  return prisma.worker.create({
    data: {
      tenantId,
      name: normalizeName(input.name),
      phone: normalizeOptionalString(input.phone),
      alternatePhone: normalizeOptionalString(input.alternatePhone),
      address: normalizeOptionalString(input.address),
      city: normalizeOptionalString(input.city),
      idProofType: normalizeOptionalString(input.idProofType),
      idProofNumber: normalizeOptionalString(input.idProofNumber),
      openingBalance: toDecimal(input.openingBalance) ?? new Prisma.Decimal(0),
      openingBalanceType: input.openingBalanceType,
      openingBalanceDate: input.openingBalanceDate ?? null,
      notes: normalizeOptionalString(input.notes),
    },
    select: WORKER_SELECT,
  });
};

export const updateWorker = async (
  tenantId: string,
  workerId: string,
  input: UpdateWorkerInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findWorkerOrThrow(tenantId, workerId);

  return prisma.worker.update({
    where: { id: workerId },
    data: {
      name: input.name !== undefined ? normalizeName(input.name) : undefined,
      phone: input.phone !== undefined ? normalizeOptionalString(input.phone) : undefined,
      alternatePhone:
        input.alternatePhone !== undefined
          ? normalizeOptionalString(input.alternatePhone)
          : undefined,
      address: input.address !== undefined ? normalizeOptionalString(input.address) : undefined,
      city: input.city !== undefined ? normalizeOptionalString(input.city) : undefined,
      idProofType:
        input.idProofType !== undefined ? normalizeOptionalString(input.idProofType) : undefined,
      idProofNumber:
        input.idProofNumber !== undefined
          ? normalizeOptionalString(input.idProofNumber)
          : undefined,
      openingBalance:
        input.openingBalance !== undefined ? toDecimal(input.openingBalance) : undefined,
      openingBalanceType: input.openingBalanceType,
      openingBalanceDate:
        input.openingBalanceDate !== undefined ? input.openingBalanceDate ?? null : undefined,
      notes: input.notes !== undefined ? normalizeOptionalString(input.notes) : undefined,
    },
    select: WORKER_SELECT,
  });
};

export const softDeleteWorker = async (
  tenantId: string,
  workerId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findWorkerOrThrow(tenantId, workerId);

  const activeAssignments = await prisma.workerAssignment.count({
    where: {
      tenantId,
      workerId,
      status: { in: [...ACTIVE_ASSIGNMENT_STATUSES] },
    },
  });

  if (activeAssignments > 0) {
    throw validationError(
      "Cannot delete worker with active assignments. Complete or close assignments first.",
    );
  }

  await prisma.worker.update({
    where: { id: workerId },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });
};

export const getWorkerAssignments = async (
  tenantId: string,
  workerId: string,
  query: ListAssignmentsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findWorkerOrThrow(tenantId, workerId);

  const where: Prisma.WorkerAssignmentWhereInput = {
    tenantId,
    workerId,
    status: query.status,
  };

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.workerAssignment.findMany({
      where,
      orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      include: WORKER_ASSIGNMENT_INCLUDE,
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

export const getWorkerPayments = async (
  tenantId: string,
  workerId: string,
  query: ListPaymentsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findWorkerOrThrow(tenantId, workerId);

  const where: Prisma.WorkerPaymentWhereInput = {
    tenantId,
    workerId,
    paymentType: query.paymentType,
  };

  const paidAtFilter: Prisma.DateTimeFilter = {};

  if (query.dateFrom) {
    paidAtFilter.gte = query.dateFrom;
  }

  if (query.dateTo) {
    paidAtFilter.lte = query.dateTo;
  }

  if (paidAtFilter.gte || paidAtFilter.lte) {
    where.paidAt = paidAtFilter;
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.workerPayment.findMany({
      where,
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      select: WORKER_PAYMENT_SELECT,
    }),
    prisma.workerPayment.count({ where }),
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

export const getAllWorkerPayments = async (
  tenantId: string,
  query: ListWorkerPaymentsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.WorkerPaymentWhereInput = {
    tenantId,
    workerId: query.workerId,
    paymentType: query.paymentType,
  };

  const paidAtFilter: Prisma.DateTimeFilter = {};

  if (query.dateFrom) {
    paidAtFilter.gte = query.dateFrom;
  }

  if (query.dateTo) {
    paidAtFilter.lte = query.dateTo;
  }

  if (paidAtFilter.gte || paidAtFilter.lte) {
    where.paidAt = paidAtFilter;
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.workerPayment.findMany({
      where,
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      select: WORKER_PAYMENT_LIST_SELECT,
    }),
    prisma.workerPayment.count({ where }),
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

export const getWorkerPaymentById = async (
  tenantId: string,
  paymentId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const payment = await prisma.workerPayment.findFirst({
    where: {
      id: paymentId,
      tenantId,
    },
    select: WORKER_PAYMENT_DETAIL_SELECT,
  });

  if (!payment) {
    throw notFoundError("Worker payment not found");
  }

  return payment;
};

export const createWorkerPayment = async (
  tenantId: string,
  input: CreateWorkerPaymentInput,
  recordedById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  return prisma.$transaction(async (tx) => {
    const worker = await findActiveWorkerOrThrowWithClient(tx, tenantId, input.workerId);
    const amount = new Prisma.Decimal(input.amount);
    const balances = await getWorkerPaymentBalances(tx, tenantId, worker);

    if (input.paymentType === "EARNING_SETTLEMENT") {
      const availableSettlement = balances.outstandingBalance.gt(0)
        ? balances.outstandingBalance
        : new Prisma.Decimal(0);

      if (amount.gt(availableSettlement)) {
        throw validationError(
          `Payment amount exceeds outstanding balance. Outstanding: ${formatAmount(availableSettlement)}`,
        );
      }
    }

    if (input.paymentType === "ADVANCE_RECOVERY") {
      const availableRecovery = balances.netAdvanceBalance.gt(0)
        ? balances.netAdvanceBalance
        : new Prisma.Decimal(0);

      if (amount.gt(availableRecovery)) {
        throw validationError(
          `Recovery amount exceeds total advance given. Total advance: ${formatAmount(availableRecovery)}`,
        );
      }
    }

    const payment = await tx.workerPayment.create({
      data: {
        tenantId,
        workerId: worker.id,
        amount,
        paymentType: input.paymentType,
        paymentMode: input.paymentMode,
        paidAt: input.paidAt,
        notes: normalizeOptionalString(input.notes),
        recordedById,
      },
      select: WORKER_PAYMENT_DETAIL_SELECT,
    });

    const summary = await buildWorkerSummaryWithClient(tx, tenantId, worker);

    return {
      payment,
      summary,
    };
  });
};

export const getWorkerLedger = async (
  tenantId: string,
  workerId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const worker = await findWorkerOrThrow(tenantId, workerId);

  const [goodsReturns, payments] = await Promise.all([
    prisma.goodsReturn.findMany({
      where: {
        tenantId,
        assignment: {
          is: {
            tenantId,
            workerId,
          },
        },
      },
      orderBy: [{ returnedAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        returnedAt: true,
        acceptedPieces: true,
        earningAmount: true,
        assignment: {
          select: {
            id: true,
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
    prisma.workerPayment.findMany({
      where: {
        tenantId,
        workerId,
      },
      orderBy: [{ paidAt: "asc" }, { id: "asc" }],
      select: WORKER_PAYMENT_SELECT,
    }),
  ]);

  const entries: LedgerEntryDraft[] = [];

  if (worker.openingBalance.gt(0)) {
    entries.push({
      sortDate: worker.openingBalanceDate ?? worker.createdAt,
      sortOrder: 0,
      sortId: worker.id,
      date: worker.openingBalanceDate ?? worker.createdAt,
      type: "OPENING_BALANCE",
      description:
        worker.openingBalanceType === "RECEIVABLE"
          ? "Opening balance (Receivable from worker)"
          : "Opening balance (Payable to worker)",
      debit:
        worker.openingBalanceType === "RECEIVABLE"
          ? worker.openingBalance
          : new Prisma.Decimal(0),
      credit:
        worker.openingBalanceType === "PAYABLE"
          ? worker.openingBalance
          : new Prisma.Decimal(0),
    });
  }

  for (const goodsReturn of goodsReturns) {
    const designLabel = goodsReturn.assignment.design.designCode || goodsReturn.assignment.design.name;
    entries.push({
      sortDate: goodsReturn.returnedAt,
      sortOrder: 1,
      sortId: goodsReturn.id,
      date: goodsReturn.returnedAt,
      type: "GOODS_RETURN",
      description: `Goods return for ${designLabel} - ${goodsReturn.acceptedPieces} accepted piece(s)`,
      debit: new Prisma.Decimal(0),
      credit: goodsReturn.earningAmount,
    });
  }

  for (const payment of payments) {
    const isAdvanceRecovery = payment.paymentType === "ADVANCE_RECOVERY";
    const description =
      payment.paymentType === "ADVANCE"
        ? `Advance paid via ${payment.paymentMode}`
        : payment.paymentType === "ADVANCE_RECOVERY"
          ? `Advance recovered via ${payment.paymentMode}`
          : `Earning settlement paid via ${payment.paymentMode}`;

    entries.push({
      sortDate: payment.paidAt,
      sortOrder: 2,
      sortId: payment.id,
      date: payment.paidAt,
      type: payment.paymentType,
      description,
      debit: isAdvanceRecovery ? new Prisma.Decimal(0) : payment.amount,
      credit: isAdvanceRecovery ? payment.amount : new Prisma.Decimal(0),
    });
  }

  entries.sort((a, b) => {
    const dateDifference = a.sortDate.getTime() - b.sortDate.getTime();
    if (dateDifference !== 0) {
      return dateDifference;
    }

    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    return a.sortId.localeCompare(b.sortId);
  });

  let runningBalance = new Prisma.Decimal(0);

  return entries.map((entry) => {
    runningBalance = runningBalance.plus(entry.credit).minus(entry.debit);

    return {
      date: entry.date,
      type: entry.type,
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit,
      runningBalance,
    };
  });
};
