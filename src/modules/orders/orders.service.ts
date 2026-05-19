import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";
import { syncInventoryStock } from "../inventory/inventory-stock";

import type {
  AddOrderItemInput,
  CancelOrderInput,
  CreateOrderInput,
  DispatchOrderInput,
  ListOrdersQuery,
  UpdateOrderInput,
  UpdateOrderItemInput,
} from "./orders.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

type TransactionClient = Prisma.TransactionClient;
type DbClient = TransactionClient | typeof prisma;

const ORDER_STATUSES_WITH_RESERVATION = [
  "CONFIRMED",
  "PACKED",
  "PARTIALLY_DISPATCHED",
] as const;

const ORDER_ITEM_INCLUDE = {
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
} as const;

const ORDER_LIST_INCLUDE = {
  dealer: {
    select: {
      id: true,
      name: true,
      city: true,
    },
  },
  items: {
    select: {
      quantityPieces: true,
      dispatchedPieces: true,
    },
  },
} as const;

const ORDER_DETAILS_INCLUDE = {
  dealer: {
    select: {
      id: true,
      type: true,
      name: true,
      code: true,
      contactPerson: true,
      phone: true,
      email: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      creditPeriodDays: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
  items: {
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: ORDER_ITEM_INCLUDE,
  },
  dispatches: {
    orderBy: [{ dispatchedAt: "asc" }, { id: "asc" }],
    include: {
      dispatchedBy: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        include: {
          orderItem: {
            include: ORDER_ITEM_INCLUDE,
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude;

type OrderListItem = Prisma.OrderGetPayload<{ include: typeof ORDER_LIST_INCLUDE }>;
type OrderDetails = Prisma.OrderGetPayload<{ include: typeof ORDER_DETAILS_INCLUDE }>;
type OrderItemWithDesign = Prisma.OrderItemGetPayload<{ include: typeof ORDER_ITEM_INCLUDE }>;

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const decimalOrZero = (value: Prisma.Decimal | null | undefined): Prisma.Decimal =>
  value ?? new Prisma.Decimal(0);

const toDecimal = (value: number | Prisma.Decimal): Prisma.Decimal =>
  value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getRemainingPieces = (item: { quantityPieces: number; dispatchedPieces: number }) =>
  item.quantityPieces - item.dispatchedPieces;

const DISPATCHED_ORDER_STATUSES = ["DISPATCHED", "PARTIALLY_DISPATCHED"] as const;

const isOrderOverdue = (order: {
  status: string;
  isCreditOrder: boolean;
  dueDate: Date | null;
}) =>
  DISPATCHED_ORDER_STATUSES.includes(order.status as (typeof DISPATCHED_ORDER_STATUSES)[number]) &&
  order.isCreditOrder &&
  !!order.dueDate &&
  order.dueDate.getTime() < Date.now();

const getDaysOverdue = (dueDate: Date | null): number => {
  if (!dueDate) return 0;
  const diffMs = Date.now() - dueDate.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
};

const withOrderComputedFields = <T extends OrderListItem | OrderDetails>(order: T) => {
  const totalPieces = order.items.reduce((sum, item) => sum + item.quantityPieces, 0);
  const dispatchedPieces = order.items.reduce(
    (sum, item) => sum + item.dispatchedPieces,
    0,
  );

  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      remainingPieces: getRemainingPieces(item),
    })),
    totalPieces,
    dispatchedPieces,
    remainingPieces: totalPieces - dispatchedPieces,
    isOverdue: isOrderOverdue(order),
    outstandingAmount: order.status === "DISPATCHED" ? order.totalAmount : new Prisma.Decimal(0),
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

const generateOrderNumber = async (tx: TransactionClient, tenantId: string) => {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const latestOrder = await tx.order.findFirst({
    where: {
      tenantId,
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: "desc",
    },
    select: {
      orderNumber: true,
    },
  });

  const latestSequence = latestOrder?.orderNumber
    ? Number(latestOrder.orderNumber.slice(prefix.length))
    : 0;
  const nextSequence = Number.isFinite(latestSequence) ? latestSequence + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(4, "0")}`;
};

const getDealerOrThrow = async (client: DbClient, tenantId: string, dealerId: string) => {
  const party = await client.party.findFirst({
    where: {
      id: dealerId,
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      type: true,
      isActive: true,
      creditPeriodDays: true,
    },
  });

  if (!party) {
    throw notFoundError("Dealer not found");
  }

  if (party.type !== "DEALER") {
    throw validationError("Orders can only be created for dealer parties");
  }

  if (!party.isActive) {
    throw validationError("Dealer must be active to create an order");
  }

  return party;
};

const getDesignsOrThrow = async (client: DbClient, tenantId: string, designIds: string[]) => {
  const designs = await client.design.findMany({
    where: {
      id: { in: designIds },
      tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      designCode: true,
      name: true,
      status: true,
      salePriceRs: true,
    },
  });

  if (designs.length !== new Set(designIds).size) {
    throw notFoundError("One or more designs were not found");
  }

  for (const design of designs) {
    if (design.status !== "ACTIVE") {
      throw validationError(`Design ${design.designCode} must be active to create an order`);
    }
  }

  return new Map(designs.map((design) => [design.id, design]));
};

const calculateLineTotal = (quantityPieces: number, pricePerPiece: Prisma.Decimal) =>
  new Prisma.Decimal(quantityPieces).mul(pricePerPiece);

const recalculateOrderTotals = async (tx: TransactionClient, orderId: string) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      discountAmount: true,
    },
  });

  if (!order) {
    throw notFoundError("Order not found");
  }

  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { lineTotal: true },
  });

  const subtotalAmount = items.reduce(
    (sum, item) => sum.plus(item.lineTotal),
    new Prisma.Decimal(0),
  );

  if (order.discountAmount.gt(subtotalAmount)) {
    throw validationError("Discount amount cannot be greater than order subtotal");
  }

  return tx.order.update({
    where: { id: orderId },
    data: {
      subtotalAmount,
      totalAmount: subtotalAmount.minus(order.discountAmount),
    },
    include: ORDER_DETAILS_INCLUDE,
  });
};

const getOrderDetailsOrThrow = async (tenantId: string, orderId: string) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
      deletedAt: null,
    },
    include: ORDER_DETAILS_INCLUDE,
  });

  if (!order) {
    throw notFoundError("Order not found");
  }

  return withOrderComputedFields(order);
};

const getOrderForMutationOrThrow = async (
  client: DbClient,
  tenantId: string,
  orderId: string,
) => {
  const order = await client.order.findFirst({
    where: {
      id: orderId,
      tenantId,
      deletedAt: null,
    },
    include: {
      dealer: {
        select: {
          id: true,
          creditPeriodDays: true,
        },
      },
      items: {
        include: ORDER_ITEM_INCLUDE,
      },
    },
  });

  if (!order) {
    throw notFoundError("Order not found");
  }

  return order;
};

const assertDraftOrder = (order: { status: string }) => {
  if (order.status !== "DRAFT") {
    throw validationError("Only draft orders can be modified");
  }
};

const getReservedPieces = async (
  client: DbClient,
  tenantId: string,
  designId: string,
  excludeOrderId?: string,
) => {
  const items = await client.orderItem.findMany({
    where: {
      tenantId,
      designId,
      orderId: excludeOrderId ? { not: excludeOrderId } : undefined,
      order: {
        status: { in: [...ORDER_STATUSES_WITH_RESERVATION] },
      },
    },
    select: {
      quantityPieces: true,
      dispatchedPieces: true,
    },
  });

  return items.reduce((sum, item) => sum + getRemainingPieces(item), 0);
};

const validateStockForConfirmation = async (
  client: DbClient,
  tenantId: string,
  orderId: string,
  items: OrderItemWithDesign[],
) => {
  const shortages = [];

  for (const item of items) {
    const stock = await syncInventoryStock(client, tenantId, item.designId);
    const reservedPieces = await getReservedPieces(client, tenantId, item.designId, orderId);
    const availablePieces = stock.packagedPieces - reservedPieces;

    if (availablePieces < item.quantityPieces) {
      shortages.push({
        designId: item.designId,
        designCode: item.design.designCode,
        designName: item.design.name,
        requiredPieces: item.quantityPieces,
        availablePieces,
        shortagePieces: item.quantityPieces - availablePieces,
      });
    }
  }

  if (shortages.length > 0) {
    const message = shortages
      .map(
        (shortage) =>
          `${shortage.designCode}: required ${shortage.requiredPieces}, available ${shortage.availablePieces}, short ${shortage.shortagePieces}`,
      )
      .join("; ");

    throw validationError(`Insufficient packaged stock. ${message}`, { shortages });
  }
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

const createDispatchLedgerEntry = async (
  tx: TransactionClient,
  order: {
    id: string;
    tenantId: string;
    dealerId: string;
    orderNumber: string;
  },
  dispatchedAt: Date,
  debitAmount: Prisma.Decimal,
) => {
  if (debitAmount.lte(0)) {
    return;
  }

  await tx.partyLedgerEntry.create({
    data: {
      tenantId: order.tenantId,
      partyId: order.dealerId,
      entryDate: dispatchedAt,
      entryType: "SALE",
      voucherType: "ORDER",
      voucherId: order.id,
      referenceNo: order.orderNumber,
      description: `Sale dispatch for order ${order.orderNumber}`,
      debitAmount,
      creditAmount: new Prisma.Decimal(0),
      isOpeningEntry: false,
    },
  });

  await recalculateRunningBalances(tx, order.dealerId);
};

const calculateDispatchAmount = (
  order: {
    id: string;
    tenantId: string;
    subtotalAmount: Prisma.Decimal;
    totalAmount: Prisma.Decimal;
  },
  dispatchSubtotal: Prisma.Decimal,
  isFinalDispatch: boolean,
  existingSaleLedgerTotal: Prisma.Decimal,
) => {
  if (order.subtotalAmount.lte(0)) {
    return new Prisma.Decimal(0);
  }

  if (isFinalDispatch) {
    return order.totalAmount.minus(existingSaleLedgerTotal);
  }

  return dispatchSubtotal.mul(order.totalAmount).div(order.subtotalAmount).toDecimalPlaces(2);
};

const getExistingSaleLedgerTotal = async (
  tx: TransactionClient,
  order: {
    id: string;
    tenantId: string;
  },
) => {
  const ledger = await tx.partyLedgerEntry.aggregate({
    where: {
      tenantId: order.tenantId,
      entryType: "SALE",
      voucherType: "ORDER",
      voucherId: order.id,
    },
    _sum: {
      debitAmount: true,
    },
  });

  return decimalOrZero(ledger._sum.debitAmount);
};

export const getOrders = async (
  tenantId: string,
  query: ListOrdersQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.OrderWhereInput = {
    tenantId,
    deletedAt: null,
    dealerId: query.dealerId,
    status: query.status,
    isCreditOrder: query.isCreditOrder,
  };

  if (query.search) {
    where.orderNumber = { contains: query.search, mode: "insensitive" };
  }

  if (query.dateFrom || query.dateTo) {
    where.orderDate = {
      gte: query.dateFrom,
      lte: query.dateTo,
    };
  }

  if (query.isOverdue === true) {
    where.isCreditOrder = true;
    where.status = { in: [...DISPATCHED_ORDER_STATUSES] };
    where.dueDate = { lt: new Date() };
  } else if (query.isOverdue === false) {
    where.NOT = {
      AND: [
        { isCreditOrder: true },
        { status: { in: [...DISPATCHED_ORDER_STATUSES] } },
        { dueDate: { lt: new Date() } },
      ],
    };
  }

  const skip = (query.page - 1) * query.limit;
  const [items, totalItems] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy: [{ orderDate: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      include: ORDER_LIST_INCLUDE,
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));

  return {
    items: items.map(withOrderComputedFields),
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

export const getOrderById = async (
  tenantId: string,
  orderId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const createOrder = async (
  tenantId: string,
  input: CreateOrderInput,
  createdById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const orderId = await prisma.$transaction(async (tx) => {
        const dealer = await getDealerOrThrow(tx, tenantId, input.dealerId);
        const designsById = await getDesignsOrThrow(
          tx,
          tenantId,
          input.items.map((item) => item.designId),
        );
        const orderNumber = await generateOrderNumber(tx, tenantId);
        const orderDate = new Date();
        const dueDate = input.isCreditOrder
          ? addDays(orderDate, dealer.creditPeriodDays ?? 0)
          : null;

        const orderItems = input.items.map((item) => {
          const design = designsById.get(item.designId);
          if (!design) {
            throw notFoundError("Design not found");
          }

          const pricePerPiece =
            item.pricePerPiece !== undefined
              ? new Prisma.Decimal(item.pricePerPiece)
              : design.salePriceRs;

          return {
            tenantId,
            designId: item.designId,
            quantityPieces: item.quantityPieces,
            pricePerPiece,
            lineTotal: calculateLineTotal(item.quantityPieces, pricePerPiece),
            notes: normalizeOptionalString(item.notes),
          };
        });

        const subtotalAmount = orderItems.reduce(
          (sum, item) => sum.plus(item.lineTotal),
          new Prisma.Decimal(0),
        );
        const discountAmount = new Prisma.Decimal(input.discountAmount ?? 0);

        if (discountAmount.gt(subtotalAmount)) {
          throw validationError("Discount amount cannot be greater than order subtotal");
        }

        const order = await tx.order.create({
          data: {
            tenantId,
            dealerId: input.dealerId,
            orderNumber,
            status: "DRAFT",
            orderDate,
            isCreditOrder: input.isCreditOrder,
            dueDate,
            subtotalAmount,
            discountAmount,
            totalAmount: subtotalAmount.minus(discountAmount),
            notes: normalizeOptionalString(input.notes),
            createdById,
            items: {
              create: orderItems,
            },
          },
          select: { id: true },
        });

        return order.id;
      });

      return getOrderDetailsOrThrow(tenantId, orderId);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 2
      ) {
        continue;
      }

      throw error;
    }
  }

  throw validationError("Could not generate a unique order number. Please try again.");
};

export const updateOrder = async (
  tenantId: string,
  orderId: string,
  input: UpdateOrderInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const order = await getOrderForMutationOrThrow(tx, tenantId, orderId);
    assertDraftOrder(order);

    const isCreditOrder = input.isCreditOrder ?? order.isCreditOrder;
    const dueDate =
      input.isCreditOrder !== undefined
        ? isCreditOrder
          ? addDays(order.orderDate, order.dealer.creditPeriodDays ?? 0)
          : null
        : undefined;
    const discountAmount =
      input.discountAmount !== undefined
        ? new Prisma.Decimal(input.discountAmount)
        : order.discountAmount;

    if (discountAmount.gt(order.subtotalAmount)) {
      throw validationError("Discount amount cannot be greater than order subtotal");
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        isCreditOrder: input.isCreditOrder,
        dueDate,
        discountAmount: input.discountAmount !== undefined ? discountAmount : undefined,
        totalAmount:
          input.discountAmount !== undefined
            ? order.subtotalAmount.minus(discountAmount)
            : undefined,
        notes: input.notes !== undefined ? normalizeOptionalString(input.notes) : undefined,
      },
    });
  });

  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const confirmOrder = async (
  tenantId: string,
  orderId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const order = await getOrderForMutationOrThrow(tx, tenantId, orderId);

    if (order.status !== "DRAFT") {
      throw validationError("Only draft orders can be confirmed");
    }

    if (order.items.length === 0) {
      throw validationError("Order must have at least one item before confirmation");
    }

    await validateStockForConfirmation(tx, tenantId, orderId, order.items);

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
      },
    });
  });

  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const packOrder = async (
  tenantId: string,
  orderId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const order = await getOrderForMutationOrThrow(tx, tenantId, orderId);

    if (order.status !== "CONFIRMED") {
      throw validationError("Only confirmed orders can be marked as packed");
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "PACKED",
        packedAt: new Date(),
      },
    });
  });

  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const dispatchOrder = async (
  tenantId: string,
  orderId: string,
  input: DispatchOrderInput,
  dispatchedById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const order = await getOrderForMutationOrThrow(tx, tenantId, orderId);

    if (order.status !== "PACKED" && order.status !== "PARTIALLY_DISPATCHED") {
      throw validationError("Only packed orders can be dispatched");
    }

    const remainingItems = order.items.filter((item) => getRemainingPieces(item) > 0);
    if (remainingItems.length === 0) {
      throw validationError("Order has no remaining pieces to dispatch");
    }

    const inputItemMap = new Map(input.items?.map((item) => [item.itemId, item.pieces]));
    const dispatchItems = input.items
      ? input.items.map((inputItem) => {
          const orderItem = order.items.find((item) => item.id === inputItem.itemId);
          if (!orderItem) {
            throw notFoundError("Order item not found");
          }

          const remainingPieces = getRemainingPieces(orderItem);
          if (inputItem.pieces > remainingPieces) {
            throw validationError(
              `Cannot dispatch ${inputItem.pieces} pieces for ${orderItem.design.designCode}. Remaining: ${remainingPieces}`,
            );
          }

          return {
            orderItem,
            pieces: inputItem.pieces,
          };
        })
      : remainingItems.map((orderItem) => ({
          orderItem,
          pieces: getRemainingPieces(orderItem),
        }));

    if (input.items && inputItemMap.size === 0) {
      throw validationError("At least one dispatch item is required");
    }

    const dispatchedAt = input.dispatchedAt ?? new Date();
    const dispatch = await tx.orderDispatch.create({
      data: {
        tenantId,
        orderId,
        transportMode: input.transportMode.trim(),
        trackingRef: normalizeOptionalString(input.trackingRef),
        dispatchedAt,
        dispatchedById,
      },
      select: { id: true },
    });

    let dispatchSubtotal = new Prisma.Decimal(0);
    const touchedDesignIds = new Set<string>();

    for (const dispatchItem of dispatchItems) {
      const stock = await syncInventoryStock(tx, tenantId, dispatchItem.orderItem.designId);
      const reservedByOtherOrders = await getReservedPieces(
        tx,
        tenantId,
        dispatchItem.orderItem.designId,
        orderId,
      );
      const availableForThisOrder = stock.packagedPieces - reservedByOtherOrders;

      if (availableForThisOrder < dispatchItem.pieces) {
        throw validationError(
          `Insufficient packaged stock for ${dispatchItem.orderItem.design.designCode}. Available: ${availableForThisOrder}, Required: ${dispatchItem.pieces}`,
        );
      }

      await tx.orderDispatchItem.create({
        data: {
          tenantId,
          dispatchId: dispatch.id,
          orderItemId: dispatchItem.orderItem.id,
          inventoryStockId: stock.id,
          piecesDispatched: dispatchItem.pieces,
        },
      });

      await tx.orderItem.update({
        where: { id: dispatchItem.orderItem.id },
        data: {
          dispatchedPieces: {
            increment: dispatchItem.pieces,
          },
        },
      });

      touchedDesignIds.add(dispatchItem.orderItem.designId);
      dispatchSubtotal = dispatchSubtotal.plus(
        toDecimal(dispatchItem.pieces).mul(dispatchItem.orderItem.pricePerPiece),
      );
    }

    for (const designId of touchedDesignIds) {
      await syncInventoryStock(tx, tenantId, designId);
    }

    const updatedItems = await tx.orderItem.findMany({
      where: { orderId },
      select: {
        quantityPieces: true,
        dispatchedPieces: true,
      },
    });
    const isFullyDispatched = updatedItems.every((item) => getRemainingPieces(item) === 0);
    const existingSaleLedgerTotal = await getExistingSaleLedgerTotal(tx, order);
    const dispatchAmount = calculateDispatchAmount(
      order,
      dispatchSubtotal,
      isFullyDispatched,
      existingSaleLedgerTotal,
    );

    await createDispatchLedgerEntry(tx, order, dispatchedAt, dispatchAmount);

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: isFullyDispatched ? "DISPATCHED" : "PARTIALLY_DISPATCHED",
        dispatchedAt: isFullyDispatched ? dispatchedAt : order.dispatchedAt,
      },
    });
  });

  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const cancelOrder = async (
  tenantId: string,
  orderId: string,
  input: CancelOrderInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const order = await getOrderForMutationOrThrow(tx, tenantId, orderId);

    if (order.status === "PARTIALLY_DISPATCHED") {
      throw validationError("Partially dispatched orders cannot be cancelled");
    }

    if (order.status === "DISPATCHED") {
      throw validationError("Dispatched orders cannot be cancelled");
    }

    if (order.status === "CANCELLED") {
      throw validationError("Order is already cancelled");
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelReason: input.cancelReason.trim(),
        cancelledAt: new Date(),
      },
    });
  });

  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const addOrderItem = async (
  tenantId: string,
  orderId: string,
  input: AddOrderItemInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const order = await getOrderForMutationOrThrow(tx, tenantId, orderId);
    assertDraftOrder(order);

    if (order.items.some((item) => item.designId === input.designId)) {
      throw validationError("This design is already added to the order");
    }

    const designsById = await getDesignsOrThrow(tx, tenantId, [input.designId]);
    const design = designsById.get(input.designId);
    if (!design) {
      throw notFoundError("Design not found");
    }

    const pricePerPiece =
      input.pricePerPiece !== undefined
        ? new Prisma.Decimal(input.pricePerPiece)
        : design.salePriceRs;

    await tx.orderItem.create({
      data: {
        tenantId,
        orderId,
        designId: input.designId,
        quantityPieces: input.quantityPieces,
        pricePerPiece,
        lineTotal: calculateLineTotal(input.quantityPieces, pricePerPiece),
        notes: normalizeOptionalString(input.notes),
      },
    });

    await recalculateOrderTotals(tx, orderId);
  });

  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const updateOrderItem = async (
  tenantId: string,
  orderId: string,
  itemId: string,
  input: UpdateOrderItemInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const order = await getOrderForMutationOrThrow(tx, tenantId, orderId);
    assertDraftOrder(order);

    const item = order.items.find((orderItem) => orderItem.id === itemId);
    if (!item) {
      throw notFoundError("Order item not found");
    }

    const quantityPieces = input.quantityPieces ?? item.quantityPieces;
    const pricePerPiece =
      input.pricePerPiece !== undefined
        ? new Prisma.Decimal(input.pricePerPiece)
        : item.pricePerPiece;

    await tx.orderItem.update({
      where: { id: itemId },
      data: {
        quantityPieces: input.quantityPieces,
        pricePerPiece: input.pricePerPiece !== undefined ? pricePerPiece : undefined,
        lineTotal: calculateLineTotal(quantityPieces, pricePerPiece),
        notes: input.notes !== undefined ? normalizeOptionalString(input.notes) : undefined,
      },
    });

    await recalculateOrderTotals(tx, orderId);
  });

  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const removeOrderItem = async (
  tenantId: string,
  orderId: string,
  itemId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  await prisma.$transaction(async (tx) => {
    const order = await getOrderForMutationOrThrow(tx, tenantId, orderId);
    assertDraftOrder(order);

    if (order.items.length <= 1) {
      throw validationError("Cannot remove the last item from an order");
    }

    if (!order.items.some((item) => item.id === itemId)) {
      throw notFoundError("Order item not found");
    }

    await tx.orderItem.delete({
      where: { id: itemId },
    });

    await recalculateOrderTotals(tx, orderId);
  });

  return getOrderDetailsOrThrow(tenantId, orderId);
};

export const getOverdueOrders = async (
  tenantId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      deletedAt: null,
      isCreditOrder: true,
      status: { in: [...DISPATCHED_ORDER_STATUSES] },
      dueDate: { lt: new Date() },
    },
    include: ORDER_LIST_INCLUDE,
  });

  return orders
    .map((order) => ({
      ...withOrderComputedFields(order),
      daysOverdue: getDaysOverdue(order.dueDate),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
};

export const getDispatchSummary = async (
  tenantId: string,
  orderId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
      deletedAt: null,
    },
    include: ORDER_DETAILS_INCLUDE,
  });

  if (!order) {
    throw notFoundError("Order not found");
  }

  const items = order.dispatches.flatMap((dispatch) =>
    dispatch.items.map((dispatchItem) => ({
      dispatchId: dispatch.id,
      dispatchedAt: dispatch.dispatchedAt,
      transportMode: dispatch.transportMode,
      trackingRef: dispatch.trackingRef,
      designCode: dispatchItem.orderItem.design.designCode,
      designName: dispatchItem.orderItem.design.name,
      dispatchedPieces: dispatchItem.piecesDispatched,
    })),
  );

  const latestDispatch =
    order.dispatches.length > 0 ? order.dispatches[order.dispatches.length - 1] : null;

  return {
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      status: order.status,
      totalAmount: order.totalAmount,
      dispatchedAt: latestDispatch?.dispatchedAt ?? order.dispatchedAt,
    },
    dealer: {
      name: order.dealer.name,
      addressLine1: order.dealer.addressLine1,
      addressLine2: order.dealer.addressLine2,
      phone: order.dealer.phone,
      city: order.dealer.city,
    },
    items,
    totalPiecesDispatched: items.reduce((sum, item) => sum + item.dispatchedPieces, 0),
    totalAmount: order.totalAmount,
    dispatches: order.dispatches.map((dispatch) => ({
      id: dispatch.id,
      transportMode: dispatch.transportMode,
      trackingRef: dispatch.trackingRef,
      dispatchedAt: dispatch.dispatchedAt,
      dispatchedBy: dispatch.dispatchedBy,
      items: dispatch.items.map((dispatchItem) => ({
        id: dispatchItem.id,
        orderItemId: dispatchItem.orderItemId,
        inventoryStockId: dispatchItem.inventoryStockId,
        piecesDispatched: dispatchItem.piecesDispatched,
        designCode: dispatchItem.orderItem.design.designCode,
        designName: dispatchItem.orderItem.design.name,
      })),
    })),
  };
};
