import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import type {
  AgingReportQuery,
  CreateDealerPaymentInput,
  CreateSupplierPaymentInput,
  DailyCashFlowQuery,
  ListPaymentsQuery,
  PartyOrderOutstandingQuery,
  UpdatePaymentStatusInput,
} from "./payments.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

type TransactionClient = Prisma.TransactionClient;
type DbClient = TransactionClient | typeof prisma;

const PAYMENT_INCLUDE = {
  party: {
    select: {
      id: true,
      type: true,
      name: true,
      code: true,
      phone: true,
      city: true,
    },
  },
  allocations: {
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          dueDate: true,
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

const PAYMENT_DETAIL_INCLUDE = {
  party: true,
  allocations: {
    include: {
      order: {
        include: {
          items: {
            include: {
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
      },
    },
  },
  ledgerEntry: true,
  recordedBy: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.PaymentInclude;

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const decimalOrZero = (value: Prisma.Decimal | null | undefined): Prisma.Decimal =>
  value ?? new Prisma.Decimal(0);

const toDecimal = (value: number | Prisma.Decimal): Prisma.Decimal =>
  value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
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

const recalculateRunningBalances = async (
  tx: TransactionClient,
  partyId: string,
) => {
  const entries = await tx.partyLedgerEntry.findMany({
    where: { partyId },
    orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      debitAmount: true,
      creditAmount: true,
      runningBalance: true,
    },
  });

  let runningBalance = new Prisma.Decimal(0);

  for (const entry of entries) {
    runningBalance = runningBalance.plus(entry.debitAmount).minus(entry.creditAmount);

    if (!entry.runningBalance || !entry.runningBalance.equals(runningBalance)) {
      await tx.partyLedgerEntry.update({
        where: { id: entry.id },
        data: { runningBalance },
      });
    }
  }
};

const findPartyOrThrow = async (
  client: DbClient,
  tenantId: string,
  partyId: string,
) => {
  const party = await client.party.findFirst({
    where: {
      id: partyId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!party) {
    throw notFoundError("Party not found");
  }

  return party;
};

const getPaymentDetailOrThrow = async (tenantId: string, paymentId: string) => {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      tenantId,
    },
    include: PAYMENT_DETAIL_INCLUDE,
  });

  if (!payment) {
    throw notFoundError("Payment not found");
  }

  return payment;
};

const createPaymentLedgerEntry = async (
  tx: TransactionClient,
  payment: {
    id: string;
    tenantId: string;
    partyId: string;
    amount: Prisma.Decimal;
    paymentDate: Date;
    paymentNature: "DEALER_RECEIPT" | "SUPPLIER_PAYMENT" | "DEALER_ADVANCE" | "SUPPLIER_ADVANCE";
    paymentMethod: string;
    referenceNumber: string | null;
  },
) => {
  const isDealerMoneyIn =
    payment.paymentNature === "DEALER_RECEIPT" || payment.paymentNature === "DEALER_ADVANCE";
  const entryType = isDealerMoneyIn ? "PAYMENT_RECEIVED" : "PAYMENT_MADE";
  const debitAmount = isDealerMoneyIn ? new Prisma.Decimal(0) : payment.amount;
  const creditAmount = isDealerMoneyIn ? payment.amount : new Prisma.Decimal(0);

  await tx.partyLedgerEntry.create({
    data: {
      tenantId: payment.tenantId,
      partyId: payment.partyId,
      entryDate: payment.paymentDate,
      entryType,
      voucherType: "PAYMENT",
      voucherId: payment.id,
      referenceNo: payment.referenceNumber,
      description: `${entryType === "PAYMENT_RECEIVED" ? "Payment received" : "Payment made"} via ${payment.paymentMethod}`,
      debitAmount,
      creditAmount,
      paymentId: payment.id,
      isOpeningEntry: false,
    },
  });

  await recalculateRunningBalances(tx, payment.partyId);
};

const createPaymentReversalLedgerEntry = async (
  tx: TransactionClient,
  payment: {
    id: string;
    tenantId: string;
    partyId: string;
    amount: Prisma.Decimal;
    paymentDate: Date;
    paymentNature: string;
    referenceNumber: string | null;
  },
  status: "BOUNCED" | "CANCELLED",
  notes?: string,
) => {
  const isDealerMoneyIn =
    payment.paymentNature === "DEALER_RECEIPT" || payment.paymentNature === "DEALER_ADVANCE";
  const entryDate = new Date();
  const debitAmount = isDealerMoneyIn ? payment.amount : new Prisma.Decimal(0);
  const creditAmount = isDealerMoneyIn ? new Prisma.Decimal(0) : payment.amount;

  await tx.partyLedgerEntry.create({
    data: {
      tenantId: payment.tenantId,
      partyId: payment.partyId,
      entryDate,
      entryType: isDealerMoneyIn ? "DEBIT_NOTE" : "CREDIT_NOTE",
      voucherType: "PAYMENT_REVERSAL",
      voucherId: payment.id,
      referenceNo: payment.referenceNumber,
      description: `Payment ${status.toLowerCase()} reversal${notes ? `: ${notes}` : ""}`,
      debitAmount,
      creditAmount,
      isOpeningEntry: false,
    },
  });

  await recalculateRunningBalances(tx, payment.partyId);
};

const getAllocatedOrderIds = (input: CreateDealerPaymentInput): string[] =>
  input.allocations?.map((allocation) => allocation.orderId) ?? [];

export const createDealerPayment = async (
  tenantId: string,
  input: CreateDealerPaymentInput,
  recordedById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const paymentId = await prisma.$transaction(async (tx) => {
    const party = await findPartyOrThrow(tx, tenantId, input.partyId);
    if (party.type !== "DEALER") {
      throw validationError("Dealer payments can only be recorded for dealer parties");
    }

    const amount = new Prisma.Decimal(input.amount);
    const allocationTotal = (input.allocations ?? []).reduce(
      (sum, allocation) => sum.plus(allocation.amount),
      new Prisma.Decimal(0),
    );

    if (allocationTotal.gt(amount)) {
      throw validationError("Total allocated amount cannot exceed payment amount");
    }

    if (input.allocations && input.allocations.length > 0) {
      const orders = await tx.order.findMany({
        where: {
          id: { in: getAllocatedOrderIds(input) },
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          dealerId: true,
          status: true,
          orderNumber: true,
        },
      });

      if (orders.length !== input.allocations.length) {
        throw notFoundError("One or more allocated orders were not found");
      }

      for (const order of orders) {
        if (order.dealerId !== party.id) {
          throw validationError(`Order ${order.orderNumber} does not belong to this dealer`);
        }

        if (order.status === "DRAFT" || order.status === "CANCELLED") {
          throw validationError(`Cannot allocate payment to ${order.status.toLowerCase()} order ${order.orderNumber}`);
        }
      }
    }

    const payment = await tx.payment.create({
      data: {
        tenantId,
        partyId: party.id,
        paymentNature:
          input.allocations && input.allocations.length > 0 ? "DEALER_RECEIPT" : "DEALER_ADVANCE",
        paymentMethod: input.paymentMethod,
        paymentStatus: "CLEARED",
        amount,
        paymentDate: input.paymentDate ?? new Date(),
        referenceNumber: normalizeOptionalString(input.referenceNumber),
        bankName: normalizeOptionalString(input.bankName),
        accountNumber: normalizeOptionalString(input.accountNumber),
        notes: normalizeOptionalString(input.notes),
        recordedById,
        allocations:
          input.allocations && input.allocations.length > 0
            ? {
                create: input.allocations.map((allocation) => ({
                  tenantId,
                  orderId: allocation.orderId,
                  amount: new Prisma.Decimal(allocation.amount),
                })),
              }
            : undefined,
      },
      select: {
        id: true,
        tenantId: true,
        partyId: true,
        amount: true,
        paymentDate: true,
        paymentNature: true,
        paymentMethod: true,
        referenceNumber: true,
      },
    });

    await createPaymentLedgerEntry(tx, payment);
    return payment.id;
  });

  return getPaymentDetailOrThrow(tenantId, paymentId);
};

export const createSupplierPayment = async (
  tenantId: string,
  input: CreateSupplierPaymentInput,
  recordedById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const paymentId = await prisma.$transaction(async (tx) => {
    const party = await findPartyOrThrow(tx, tenantId, input.partyId);
    if (party.type !== "SUPPLIER") {
      throw validationError("Supplier payments can only be recorded for supplier parties");
    }

    const payment = await tx.payment.create({
      data: {
        tenantId,
        partyId: party.id,
        paymentNature: "SUPPLIER_PAYMENT",
        paymentMethod: input.paymentMethod,
        paymentStatus: "CLEARED",
        amount: new Prisma.Decimal(input.amount),
        paymentDate: input.paymentDate ?? new Date(),
        referenceNumber: normalizeOptionalString(input.referenceNumber),
        bankName: normalizeOptionalString(input.bankName),
        accountNumber: normalizeOptionalString(input.accountNumber),
        notes: normalizeOptionalString(input.notes),
        recordedById,
      },
      select: {
        id: true,
        tenantId: true,
        partyId: true,
        amount: true,
        paymentDate: true,
        paymentNature: true,
        paymentMethod: true,
        referenceNumber: true,
      },
    });

    await createPaymentLedgerEntry(tx, payment);
    return payment.id;
  });

  return getPaymentDetailOrThrow(tenantId, paymentId);
};

export const updatePaymentStatus = async (
  tenantId: string,
  paymentId: string,
  input: UpdatePaymentStatusInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, tenantId },
      select: {
        id: true,
        tenantId: true,
        partyId: true,
        amount: true,
        paymentDate: true,
        paymentNature: true,
        paymentMethod: true,
        paymentStatus: true,
        referenceNumber: true,
      },
    });

    if (!payment) {
      throw notFoundError("Payment not found");
    }

    if (payment.paymentStatus === input.paymentStatus) {
      return;
    }

    if (input.paymentStatus === "BOUNCED" && payment.paymentMethod === "CASH") {
      throw validationError("Cash payments cannot be marked as bounced");
    }

    if (
      (input.paymentStatus === "BOUNCED" || input.paymentStatus === "CANCELLED") &&
      payment.paymentStatus !== "BOUNCED" &&
      payment.paymentStatus !== "CANCELLED"
    ) {
      await createPaymentReversalLedgerEntry(tx, payment, input.paymentStatus, input.notes);
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: input.paymentStatus,
        notes: input.notes
          ? [payment.paymentStatus, input.paymentStatus, input.notes].join(" -> ")
          : undefined,
      },
    });
  });

  return getPaymentDetailOrThrow(tenantId, paymentId);
};

export const getAllPayments = async (
  tenantId: string,
  query: ListPaymentsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.PaymentWhereInput = {
    tenantId,
    partyId: query.partyId,
    paymentNature: query.paymentNature,
    paymentMethod: query.paymentMethod,
    paymentStatus: query.paymentStatus,
  };

  if (query.dateFrom || query.dateTo) {
    where.paymentDate = {
      gte: query.dateFrom,
      lte: query.dateTo,
    };
  }

  const skip = (query.page - 1) * query.limit;
  const [items, totalItems] = await prisma.$transaction([
    prisma.payment.findMany({
      where,
      orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      include: PAYMENT_INCLUDE,
    }),
    prisma.payment.count({ where }),
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

export const getPaymentById = async (
  tenantId: string,
  paymentId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  return getPaymentDetailOrThrow(tenantId, paymentId);
};

export const getPartyOutstanding = async (
  tenantId: string,
  partyId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const party = await findPartyOrThrow(prisma, tenantId, partyId);
  const [ledgerTotals, saleTotals, paymentTotals] = await Promise.all([
    prisma.partyLedgerEntry.aggregate({
      where: { tenantId, partyId },
      _sum: { debitAmount: true, creditAmount: true },
    }),
    prisma.partyLedgerEntry.aggregate({
      where: { tenantId, partyId, entryType: "SALE" },
      _sum: { debitAmount: true },
    }),
    prisma.partyLedgerEntry.aggregate({
      where: { tenantId, partyId, entryType: "PAYMENT_RECEIVED" },
      _sum: { creditAmount: true },
    }),
  ]);

  const openingBalance =
    party.openingBalanceType === "RECEIVABLE"
      ? party.openingBalance
      : party.openingBalance.mul(-1);

  return {
    party,
    outstandingAmount: decimalOrZero(ledgerTotals._sum.debitAmount).minus(
      decimalOrZero(ledgerTotals._sum.creditAmount),
    ),
    totalInvoiced: decimalOrZero(saleTotals._sum.debitAmount),
    totalReceived: decimalOrZero(paymentTotals._sum.creditAmount),
    openingBalance,
  };
};

export const getPartyOrderOutstanding = async (
  tenantId: string,
  partyId: string,
  query: PartyOrderOutstandingQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const party = await findPartyOrThrow(prisma, tenantId, partyId);

  if (party.type !== "DEALER") {
    throw validationError("Order-wise outstanding is available only for dealer parties");
  }

  const outstanding = await getPartyOutstanding(tenantId, partyId, currentUser);
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      dealerId: partyId,
      deletedAt: null,
      status: { in: ["PARTIALLY_DISPATCHED", "DISPATCHED"] },
    },
    orderBy: [{ dispatchedAt: "desc" }, { orderDate: "desc" }, { id: "desc" }],
    select: {
      id: true,
      orderNumber: true,
      status: true,
      orderDate: true,
      dueDate: true,
      dispatchedAt: true,
      subtotalAmount: true,
      discountAmount: true,
      totalAmount: true,
      payments: {
        where: {
          payment: {
            paymentStatus: { notIn: ["BOUNCED", "CANCELLED"] },
          },
        },
        include: {
          payment: {
            select: {
              id: true,
              paymentMethod: true,
              paymentStatus: true,
              paymentDate: true,
              referenceNumber: true,
              bankName: true,
              amount: true,
              notes: true,
            },
          },
        },
      },
    },
  });

  const orderRows = orders
    .map((order) => {
      const paidAmount = order.payments.reduce(
        (sum, allocation) => sum.plus(allocation.amount),
        new Prisma.Decimal(0),
      );
      const pendingAmount = order.totalAmount.minus(paidAmount);
      const paymentStatus =
        paidAmount.lte(0) ? "UNPAID" : pendingAmount.gt(0) ? "PARTIALLY_PAID" : "PAID";

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        orderDate: order.orderDate,
        dueDate: order.dueDate,
        dispatchedAt: order.dispatchedAt,
        subtotalAmount: order.subtotalAmount,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        paidAmount,
        pendingAmount,
        paymentStatus,
        payments: order.payments
          .sort(
            (a, b) =>
              a.payment.paymentDate.getTime() - b.payment.paymentDate.getTime() ||
              a.payment.id.localeCompare(b.payment.id),
          )
          .map((allocation) => ({
            allocationId: allocation.id,
            paymentId: allocation.paymentId,
            allocatedAmount: allocation.amount,
            paymentAmount: allocation.payment.amount,
            paymentDate: allocation.payment.paymentDate,
            paymentMethod: allocation.payment.paymentMethod,
            paymentStatus: allocation.payment.paymentStatus,
            referenceNumber: allocation.payment.referenceNumber,
            bankName: allocation.payment.bankName,
            notes: allocation.payment.notes,
          })),
      };
    })
    .filter((order) => query.includePaid || order.pendingAmount.gt(0));

  const dealerPayments = await prisma.payment.findMany({
    where: {
      tenantId,
      partyId,
      paymentNature: { in: ["DEALER_RECEIPT", "DEALER_ADVANCE"] },
      paymentStatus: { notIn: ["BOUNCED", "CANCELLED"] },
    },
    select: {
      id: true,
      amount: true,
      paymentDate: true,
      paymentMethod: true,
      paymentStatus: true,
      referenceNumber: true,
      bankName: true,
      notes: true,
      allocations: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: [{ paymentDate: "asc" }, { id: "asc" }],
  });

  const unallocatedCredits = dealerPayments
    .map((payment) => {
      const allocatedAmount = payment.allocations.reduce(
        (sum, allocation) => sum.plus(allocation.amount),
        new Prisma.Decimal(0),
      );
      const unallocatedAmount = payment.amount.minus(allocatedAmount);

      return {
        paymentId: payment.id,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        paymentStatus: payment.paymentStatus,
        referenceNumber: payment.referenceNumber,
        bankName: payment.bankName,
        paymentAmount: payment.amount,
        allocatedAmount,
        unallocatedAmount,
        notes: payment.notes,
      };
    })
    .filter((payment) => payment.unallocatedAmount.gt(0));

  const openingBalanceAmount =
    party.openingBalanceType === "RECEIVABLE"
      ? party.openingBalance
      : party.openingBalance.mul(-1);
  const totalOrderPending = orderRows.reduce(
    (sum, order) => sum.plus(order.pendingAmount),
    new Prisma.Decimal(0),
  );
  const totalUnallocatedCredits = unallocatedCredits.reduce(
    (sum, payment) => sum.plus(payment.unallocatedAmount),
    new Prisma.Decimal(0),
  );

  return {
    party,
    openingBalance: {
      amount: party.openingBalance,
      type: party.openingBalanceType,
      date: party.openingBalanceDate,
      receivableImpact: openingBalanceAmount.gt(0) ? openingBalanceAmount : new Prisma.Decimal(0),
      payableImpact: openingBalanceAmount.lt(0) ? openingBalanceAmount.abs() : new Prisma.Decimal(0),
    },
    summary: {
      ledgerOutstanding: outstanding.outstandingAmount,
      totalOrderPending,
      totalUnallocatedCredits,
      totalInvoiced: outstanding.totalInvoiced,
      totalReceived: outstanding.totalReceived,
      displayedOrders: orderRows.length,
    },
    orders: orderRows,
    unallocatedCredits,
  };
};

const getPaidAmountByOrder = async (tenantId: string, orderIds: string[]) => {
  if (orderIds.length === 0) {
    return new Map<string, Prisma.Decimal>();
  }

  const rows = await prisma.paymentAllocation.groupBy({
    by: ["orderId"],
    where: {
      tenantId,
      orderId: { in: orderIds },
      payment: {
        paymentStatus: {
          notIn: ["BOUNCED", "CANCELLED"],
        },
      },
    },
    _sum: {
      amount: true,
    },
  });

  return new Map(
    rows.map((row) => [row.orderId, decimalOrZero(row._sum.amount)]),
  );
};

export const getAgingReport = async (
  tenantId: string,
  query: AgingReportQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const asOfDate = query.asOfDate ?? new Date();

  const dealers = await prisma.party.findMany({
    where: {
      tenantId,
      type: "DEALER",
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      code: true,
      openingBalance: true,
      openingBalanceType: true,
    },
  });

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      deletedAt: null,
      status: { in: ["PARTIALLY_DISPATCHED", "DISPATCHED"] },
    },
    select: {
      id: true,
      dealerId: true,
      orderNumber: true,
      totalAmount: true,
      dueDate: true,
      orderDate: true,
    },
  });

  const paidByOrder = await getPaidAmountByOrder(
    tenantId,
    orders.map((order) => order.id),
  );

  const dealerRows = await Promise.all(
    dealers.map(async (dealer) => {
      const outstanding = await getPartyOutstanding(tenantId, dealer.id, currentUser);
      const buckets = {
        current: new Prisma.Decimal(0),
        days0To30: new Prisma.Decimal(0),
        days31To60: new Prisma.Decimal(0),
        days61To90: new Prisma.Decimal(0),
        days90Plus: new Prisma.Decimal(0),
      };

      for (const order of orders.filter((item) => item.dealerId === dealer.id)) {
        const unpaid = order.totalAmount.minus(paidByOrder.get(order.id) ?? new Prisma.Decimal(0));
        if (unpaid.lte(0)) continue;

        const dueDate = order.dueDate ?? order.orderDate;
        const daysOverdue = Math.floor(
          (startOfDay(asOfDate).getTime() - startOfDay(dueDate).getTime()) /
            (24 * 60 * 60 * 1000),
        );

        if (daysOverdue < 0) {
          buckets.current = buckets.current.plus(unpaid);
        } else if (daysOverdue <= 30) {
          buckets.days0To30 = buckets.days0To30.plus(unpaid);
        } else if (daysOverdue <= 60) {
          buckets.days31To60 = buckets.days31To60.plus(unpaid);
        } else if (daysOverdue <= 90) {
          buckets.days61To90 = buckets.days61To90.plus(unpaid);
        } else {
          buckets.days90Plus = buckets.days90Plus.plus(unpaid);
        }
      }

      return {
        partyId: dealer.id,
        name: dealer.name,
        code: dealer.code,
        totalOutstanding: outstanding.outstandingAmount,
        buckets,
      };
    }),
  );

  return dealerRows
    .filter((row) => row.totalOutstanding.gt(0))
    .sort((a, b) => b.totalOutstanding.comparedTo(a.totalOutstanding));
};

export const getDailyCashFlow = async (
  tenantId: string,
  query: DailyCashFlowQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const date = query.date ?? new Date();

  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      paymentDate: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
      paymentStatus: {
        notIn: ["BOUNCED", "CANCELLED"],
      },
    },
    orderBy: [{ paymentDate: "asc" }, { id: "asc" }],
    include: PAYMENT_INCLUDE,
  });

  const dealerReceipts = payments.filter((payment) =>
    ["DEALER_RECEIPT", "DEALER_ADVANCE"].includes(payment.paymentNature),
  );
  const supplierPayments = payments.filter(
    (payment) => payment.paymentNature === "SUPPLIER_PAYMENT",
  );
  const totalReceived = dealerReceipts.reduce(
    (sum, payment) => sum.plus(payment.amount),
    new Prisma.Decimal(0),
  );
  const totalPaidOut = supplierPayments.reduce(
    (sum, payment) => sum.plus(payment.amount),
    new Prisma.Decimal(0),
  );
  const breakdownByMethod = payments.reduce<Record<string, { received: Prisma.Decimal; paidOut: Prisma.Decimal }>>(
    (acc, payment) => {
      acc[payment.paymentMethod] ??= {
        received: new Prisma.Decimal(0),
        paidOut: new Prisma.Decimal(0),
      };

      if (["DEALER_RECEIPT", "DEALER_ADVANCE"].includes(payment.paymentNature)) {
        acc[payment.paymentMethod].received = acc[payment.paymentMethod].received.plus(payment.amount);
      }

      if (payment.paymentNature === "SUPPLIER_PAYMENT") {
        acc[payment.paymentMethod].paidOut = acc[payment.paymentMethod].paidOut.plus(payment.amount);
      }

      return acc;
    },
    {},
  );

  return {
    date: startOfDay(date),
    totalReceived,
    totalPaidOut,
    netCashFlow: totalReceived.minus(totalPaidOut),
    breakdownByMethod,
    transactions: payments,
  };
};
