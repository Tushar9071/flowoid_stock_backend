import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import type {
  CheckDuplicatePartyQuery,
  CreatePartyInput,
  DropdownPartiesQuery,
  ListPartiesQuery,
  OpeningBalanceInput,
  StatementQuery,
  UpdatePartyInput,
  UpdateOpeningBalanceInput,
  UpdatePartyStatusInput,
} from "./Parties.schema";

type CurrentUser = {
  userId: string;
  role: string;
};

type TransactionClient = Prisma.TransactionClient;

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

const OPENING_ENTRY_SELECT = {
  id: true,
  entryDate: true,
  entryType: true,
  description: true,
  debitAmount: true,
  creditAmount: true,
  runningBalance: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PARTY_DROPDOWN_SELECT = {
  id: true,
  tenantId: true,
  type: true,
  name: true,
  code: true,
  phone: true,
  gstin: true,
  isActive: true,
} as const;

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const normalizeCode = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
};

const normalizeUppercase = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
};

const toDecimal = (value?: number): Prisma.Decimal | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return new Prisma.Decimal(value);
};

const decimalOrZero = (value: Prisma.Decimal | null | undefined): Prisma.Decimal =>
  value ?? new Prisma.Decimal(0);

const getBalanceNature = (balance: Prisma.Decimal): "RECEIVABLE" | "PAYABLE" | "SETTLED" => {
  if (balance.gt(0)) return "RECEIVABLE";
  if (balance.lt(0)) return "PAYABLE";
  return "SETTLED";
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

const findPartyOrThrow = async (tenantId: string, partyId: string) => {
  const party = await prisma.party.findFirst({
    where: {
      id: partyId,
      tenantId,
      deletedAt: null,
    },
    select: PARTY_SELECT,
  });

  if (!party) {
    throw notFoundError("Party not found");
  }

  return party;
};

const buildDuplicateMatch = (
  duplicate: {
    id: string;
    name: string;
    code: string | null;
    gstin: string | null;
    phone: string | null;
  } | null,
  input: {
    name?: string;
    code?: string | null;
    gstin?: string | null;
    phone?: string | null;
  },
) => {
  if (!duplicate) {
    return {
      exists: false,
      duplicateBy: [] as string[],
      party: null,
    };
  }

  const duplicateBy: string[] = [];

  if (input.name && duplicate.name.toLowerCase() === input.name.toLowerCase()) {
    duplicateBy.push("name");
  }

  if (input.code && duplicate.code?.toLowerCase() === input.code.toLowerCase()) {
    duplicateBy.push("code");
  }

  if (input.gstin && duplicate.gstin?.toLowerCase() === input.gstin.toLowerCase()) {
    duplicateBy.push("gstin");
  }

  if (input.phone && duplicate.phone?.toLowerCase() === input.phone.toLowerCase()) {
    duplicateBy.push("phone");
  }

  return {
    exists: duplicateBy.length > 0,
    duplicateBy,
    party: duplicateBy.length > 0 ? duplicate : null,
  };
};

const findDuplicateParty = async (
  tenantId: string,
  input: {
    name?: string;
    code?: string | null;
    gstin?: string | null;
    phone?: string | null;
  },
  excludePartyId?: string,
) => {
  const orConditions: Prisma.PartyWhereInput[] = [];

  if (input.name) {
    orConditions.push({
      name: {
        equals: input.name,
        mode: "insensitive",
      },
    });
  }

  if (input.code) {
    orConditions.push({
      code: {
        equals: input.code,
        mode: "insensitive",
      },
    });
  }

  if (input.gstin) {
    orConditions.push({
      gstin: {
        equals: input.gstin,
        mode: "insensitive",
      },
    });
  }

  if (input.phone) {
    orConditions.push({
      phone: {
        equals: input.phone,
        mode: "insensitive",
      },
    });
  }

  if (orConditions.length === 0) {
    return null;
  }

  return prisma.party.findFirst({
    where: {
      tenantId,
      deletedAt: null,
      id: excludePartyId ? { not: excludePartyId } : undefined,
      OR: orConditions,
    },
    select: {
      id: true,
      name: true,
      code: true,
      gstin: true,
      phone: true,
    },
  });
};

const findOpeningEntry = async (partyId: string) => {
  return prisma.partyLedgerEntry.findFirst({
    where: {
      partyId,
      isOpeningEntry: true,
    },
    select: OPENING_ENTRY_SELECT,
  });
};

const ensureUniquePartyFields = async (
  tenantId: string,
  input: {
    name?: string;
    code?: string | null;
    gstin?: string | null;
    phone?: string | null;
  },
  excludePartyId?: string,
) => {
  const duplicate = await findDuplicateParty(tenantId, input, excludePartyId);

  if (!duplicate) {
    return;
  }

  if (input.name && duplicate.name.toLowerCase() === input.name.toLowerCase()) {
    throw validationError("A party with this name already exists in the tenant");
  }

  if (input.code && duplicate.code?.toLowerCase() === input.code.toLowerCase()) {
    throw validationError("A party with this code already exists in the tenant");
  }

  if (input.gstin && duplicate.gstin?.toLowerCase() === input.gstin.toLowerCase()) {
    throw validationError("A party with this GSTIN already exists in the tenant");
  }

  if (input.phone && duplicate.phone?.toLowerCase() === input.phone.toLowerCase()) {
    throw validationError("A party with this phone number already exists in the tenant");
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

const syncOpeningBalanceEntry = async (
  tx: TransactionClient,
  party: {
    id: string;
    tenantId: string;
    openingBalance: Prisma.Decimal;
    openingBalanceType: "RECEIVABLE" | "PAYABLE";
    openingBalanceDate: Date | null;
  },
) => {
  const existingOpeningEntry = await tx.partyLedgerEntry.findFirst({
    where: {
      partyId: party.id,
      isOpeningEntry: true,
    },
    select: { id: true },
  });

  if (party.openingBalance.lte(0)) {
    if (existingOpeningEntry) {
      await tx.partyLedgerEntry.delete({
        where: { id: existingOpeningEntry.id },
      });
      await recalculateRunningBalances(tx, party.id);
    }
    return;
  }

  if (!party.openingBalanceDate) {
    throw validationError("Opening balance date is required when opening balance is greater than 0");
  }

  const openingData = {
    tenantId: party.tenantId,
    partyId: party.id,
    entryDate: party.openingBalanceDate,
    entryType: "OPENING_BALANCE" as const,
    description: "Opening balance",
    debitAmount:
      party.openingBalanceType === "RECEIVABLE" ? party.openingBalance : new Prisma.Decimal(0),
    creditAmount:
      party.openingBalanceType === "PAYABLE" ? party.openingBalance : new Prisma.Decimal(0),
    isOpeningEntry: true,
  };

  if (existingOpeningEntry) {
    await tx.partyLedgerEntry.update({
      where: { id: existingOpeningEntry.id },
      data: openingData,
    });
  } else {
    await tx.partyLedgerEntry.create({
      data: openingData,
    });
  }

  await recalculateRunningBalances(tx, party.id);
};

const updatePartyOpeningBalance = async (
  tx: TransactionClient,
  partyId: string,
  data: {
    openingBalance: Prisma.Decimal;
    openingBalanceType: "RECEIVABLE" | "PAYABLE";
    openingBalanceDate: Date | null;
    notes?: string | null;
  },
) => {
  const party = await tx.party.update({
    where: { id: partyId },
    data: {
      openingBalance: data.openingBalance,
      openingBalanceType: data.openingBalanceType,
      openingBalanceDate: data.openingBalanceDate,
      notes: data.notes,
    },
    select: PARTY_SELECT,
  });

  await syncOpeningBalanceEntry(tx, {
    id: party.id,
    tenantId: party.tenantId,
    openingBalance: party.openingBalance,
    openingBalanceType: party.openingBalanceType,
    openingBalanceDate: party.openingBalanceDate,
  });

  return party;
};

const buildStatementWhere = (
  tenantId: string,
  partyId: string,
  query: StatementQuery,
): Prisma.PartyLedgerEntryWhereInput => {
  const where: Prisma.PartyLedgerEntryWhereInput = {
    tenantId,
    partyId,
  };

  const dateFilter: Prisma.DateTimeFilter = {};

  if (query.fromDate) {
    dateFilter.gte = query.fromDate;
  }

  if (query.toDate) {
    dateFilter.lte = query.toDate;
  }

  if (dateFilter.gte || dateFilter.lte) {
    where.entryDate = dateFilter;
  }

  if (!query.includeOpeningEntry) {
    where.isOpeningEntry = false;
  }

  return where;
};

const getBalanceBeforeDate = async (
  tenantId: string,
  partyId: string,
  fromDate?: Date,
) => {
  if (!fromDate) {
    return new Prisma.Decimal(0);
  }

  const aggregate = await prisma.partyLedgerEntry.aggregate({
    where: {
      tenantId,
      partyId,
      entryDate: { lt: fromDate },
    },
    _sum: {
      debitAmount: true,
      creditAmount: true,
    },
  });

  return decimalOrZero(aggregate._sum.debitAmount).minus(
    decimalOrZero(aggregate._sum.creditAmount),
  );
};

const buildStatementResponse = async (
  tenantId: string,
  partyId: string,
  query: StatementQuery,
) => {
  const where = buildStatementWhere(tenantId, partyId, query);
  const skip = (query.page - 1) * query.limit;

  const [balanceBeforePeriod, totals, items, totalItems] = await Promise.all([
    getBalanceBeforeDate(tenantId, partyId, query.fromDate),
    prisma.partyLedgerEntry.aggregate({
      where,
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    }),
    prisma.partyLedgerEntry.findMany({
      where,
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      skip,
      take: query.limit,
      select: {
        id: true,
        entryDate: true,
        entryType: true,
        voucherType: true,
        voucherId: true,
        referenceNo: true,
        description: true,
        debitAmount: true,
        creditAmount: true,
        runningBalance: true,
        isOpeningEntry: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.partyLedgerEntry.count({ where }),
  ]);

  const totalDebit = decimalOrZero(totals._sum.debitAmount);
  const totalCredit = decimalOrZero(totals._sum.creditAmount);
  const closingBalance = balanceBeforePeriod.plus(totalDebit).minus(totalCredit);
  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));

  return {
    filters: {
      fromDate: query.fromDate ?? null,
      toDate: query.toDate ?? null,
      includeOpeningEntry: query.includeOpeningEntry,
    },
    summary: {
      balanceBeforePeriod,
      totalDebit,
      totalCredit,
      closingBalance,
      balanceNature: getBalanceNature(closingBalance),
    },
    entries: items,
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

export const createParty = async (
  tenantId: string,
  input: CreatePartyInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const normalizedName = normalizeName(input.name);
  const normalizedCode = normalizeCode(input.code);
  const normalizedGstin = normalizeUppercase(input.gstin);
  const normalizedPhone = normalizeOptionalString(input.phone);

  await ensureUniquePartyFields(tenantId, {
    name: normalizedName,
    code: normalizedCode,
    gstin: normalizedGstin,
    phone: normalizedPhone,
  });

  return prisma.$transaction(async (tx) => {
    const party = await tx.party.create({
      data: {
        tenantId,
        type: input.type,
        name: normalizedName,
        code: normalizedCode,
        contactPerson: normalizeOptionalString(input.contactPerson),
        phone: normalizedPhone,
        alternatePhone: normalizeOptionalString(input.alternatePhone),
        email: normalizeOptionalString(input.email)?.toLowerCase() ?? null,
        gstin: normalizedGstin,
        pan: normalizeUppercase(input.pan),
        addressLine1: normalizeOptionalString(input.addressLine1),
        addressLine2: normalizeOptionalString(input.addressLine2),
        city: normalizeOptionalString(input.city),
        state: normalizeOptionalString(input.state),
        country: normalizeOptionalString(input.country),
        postalCode: normalizeOptionalString(input.postalCode),
        creditPeriodDays: input.creditPeriodDays,
        creditLimit: toDecimal(input.creditLimit) ?? null,
        openingBalance: toDecimal(input.openingBalance) ?? new Prisma.Decimal(0),
        openingBalanceType: input.openingBalanceType,
        openingBalanceDate: input.openingBalanceDate ?? null,
        notes: normalizeOptionalString(input.notes),
        isActive: input.isActive ?? true,
      },
      select: PARTY_SELECT,
    });

    await syncOpeningBalanceEntry(tx, {
      id: party.id,
      tenantId: party.tenantId,
      openingBalance: party.openingBalance,
      openingBalanceType: party.openingBalanceType,
      openingBalanceDate: party.openingBalanceDate,
    });

    return party;
  });
};

export const listParties = async (
  tenantId: string,
  query: ListPartiesQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.PartyWhereInput = {
    tenantId,
    deletedAt: null,
    type: query.type,
    isActive: query.isActive,
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { code: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
      { gstin: { contains: query.search, mode: "insensitive" } },
      { contactPerson: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.party.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      select: PARTY_SELECT,
    }),
    prisma.party.count({ where }),
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

export const getPartyById = async (
  tenantId: string,
  partyId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  return findPartyOrThrow(tenantId, partyId);
};

export const updateParty = async (
  tenantId: string,
  partyId: string,
  input: UpdatePartyInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const existingParty = await findPartyOrThrow(tenantId, partyId);

  const normalizedName = input.name ? normalizeName(input.name) : existingParty.name;
  const normalizedCode =
    input.code !== undefined ? normalizeCode(input.code) : existingParty.code;
  const normalizedGstin =
    input.gstin !== undefined ? normalizeUppercase(input.gstin) : existingParty.gstin;
  const normalizedPhone =
    input.phone !== undefined ? normalizeOptionalString(input.phone) : existingParty.phone;

  await ensureUniquePartyFields(
    tenantId,
    {
      name: normalizedName,
      code: normalizedCode,
      gstin: normalizedGstin,
      phone: normalizedPhone,
    },
    partyId,
  );

  const resolvedOpeningBalance =
    input.openingBalance !== undefined
      ? new Prisma.Decimal(input.openingBalance)
      : existingParty.openingBalance;
  const resolvedOpeningBalanceType =
    input.openingBalanceType ?? existingParty.openingBalanceType;
  const resolvedOpeningBalanceDate =
    input.openingBalanceDate !== undefined
      ? input.openingBalanceDate ?? null
      : existingParty.openingBalanceDate;

  if (resolvedOpeningBalance.gt(0) && !resolvedOpeningBalanceDate) {
    throw validationError("Opening balance date is required when opening balance is greater than 0");
  }

  return prisma.$transaction(async (tx) => {
    const party = await tx.party.update({
      where: { id: partyId },
      data: {
        type: input.type,
        name: normalizedName,
        code: normalizedCode,
        contactPerson:
          input.contactPerson !== undefined
            ? normalizeOptionalString(input.contactPerson)
            : undefined,
        phone: input.phone !== undefined ? normalizedPhone : undefined,
        alternatePhone:
          input.alternatePhone !== undefined
            ? normalizeOptionalString(input.alternatePhone)
            : undefined,
        email:
          input.email !== undefined
            ? normalizeOptionalString(input.email)?.toLowerCase() ?? null
            : undefined,
        gstin: input.gstin !== undefined ? normalizedGstin : undefined,
        pan: input.pan !== undefined ? normalizeUppercase(input.pan) : undefined,
        addressLine1:
          input.addressLine1 !== undefined
            ? normalizeOptionalString(input.addressLine1)
            : undefined,
        addressLine2:
          input.addressLine2 !== undefined
            ? normalizeOptionalString(input.addressLine2)
            : undefined,
        city: input.city !== undefined ? normalizeOptionalString(input.city) : undefined,
        state: input.state !== undefined ? normalizeOptionalString(input.state) : undefined,
        country: input.country !== undefined ? normalizeOptionalString(input.country) : undefined,
        postalCode:
          input.postalCode !== undefined ? normalizeOptionalString(input.postalCode) : undefined,
        creditPeriodDays: input.creditPeriodDays,
        creditLimit:
          input.creditLimit !== undefined ? toDecimal(input.creditLimit) ?? null : undefined,
        openingBalance:
          input.openingBalance !== undefined ? resolvedOpeningBalance : undefined,
        openingBalanceType: input.openingBalanceType,
        openingBalanceDate:
          input.openingBalanceDate !== undefined ? resolvedOpeningBalanceDate : undefined,
        notes: input.notes !== undefined ? normalizeOptionalString(input.notes) : undefined,
        isActive: input.isActive,
      },
      select: PARTY_SELECT,
    });

    await syncOpeningBalanceEntry(tx, {
      id: party.id,
      tenantId: party.tenantId,
      openingBalance: party.openingBalance,
      openingBalanceType: party.openingBalanceType,
      openingBalanceDate: party.openingBalanceDate,
    });

    return party;
  });
};

export const deleteParty = async (
  tenantId: string,
  partyId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findPartyOrThrow(tenantId, partyId);

  await prisma.party.update({
    where: { id: partyId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });
};

export const getOpeningBalance = async (
  tenantId: string,
  partyId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const party = await findPartyOrThrow(tenantId, partyId);
  const openingEntry = await findOpeningEntry(partyId);

  return {
    party,
    hasOpeningBalance: !!openingEntry && party.openingBalance.gt(0),
    openingBalance: {
      amount: party.openingBalance,
      type: party.openingBalanceType,
      date: party.openingBalanceDate,
      entry: openingEntry,
    },
  };
};

export const createOpeningBalance = async (
  tenantId: string,
  partyId: string,
  input: OpeningBalanceInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const party = await findPartyOrThrow(tenantId, partyId);
  const openingEntry = await findOpeningEntry(partyId);

  if (openingEntry || party.openingBalance.gt(0)) {
    throw validationError(
      "Opening balance already exists for this party. Use the update endpoint instead",
    );
  }

  return prisma.$transaction(async (tx) => {
    return updatePartyOpeningBalance(tx, partyId, {
      openingBalance: new Prisma.Decimal(input.openingBalance),
      openingBalanceType: input.openingBalanceType,
      openingBalanceDate: input.openingBalanceDate ?? null,
      notes:
        input.notes !== undefined ? normalizeOptionalString(input.notes) : party.notes,
    });
  });
};

export const updateOpeningBalance = async (
  tenantId: string,
  partyId: string,
  input: UpdateOpeningBalanceInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const party = await findPartyOrThrow(tenantId, partyId);
  const openingEntry = await findOpeningEntry(partyId);

  if (!openingEntry && party.openingBalance.lte(0)) {
    throw notFoundError("Opening balance not found");
  }

  const openingBalance =
    input.openingBalance !== undefined
      ? new Prisma.Decimal(input.openingBalance)
      : party.openingBalance;
  const openingBalanceType = input.openingBalanceType ?? party.openingBalanceType;
  const openingBalanceDate =
    input.openingBalanceDate !== undefined
      ? input.openingBalanceDate ?? null
      : party.openingBalanceDate;
  const normalizedOpeningBalanceDate = openingBalance.gt(0) ? openingBalanceDate : null;

  if (openingBalance.gt(0) && !normalizedOpeningBalanceDate) {
    throw validationError("Opening balance date is required when opening balance is greater than 0");
  }

  if (openingBalance.gt(0) && !openingBalanceType) {
    throw validationError("Opening balance type is required when opening balance is greater than 0");
  }

  return prisma.$transaction(async (tx) => {
    return updatePartyOpeningBalance(tx, partyId, {
      openingBalance,
      openingBalanceType,
      openingBalanceDate: normalizedOpeningBalanceDate,
      notes:
        input.notes !== undefined ? normalizeOptionalString(input.notes) : party.notes,
    });
  });
};

export const getPartyStatement = async (
  tenantId: string,
  partyId: string,
  query: StatementQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const party = await findPartyOrThrow(tenantId, partyId);
  const statement = await buildStatementResponse(tenantId, partyId, query);

  return {
    party,
    ...statement,
  };
};

export const getPartyLedger = async (
  tenantId: string,
  partyId: string,
  query: StatementQuery,
  currentUser: CurrentUser,
) => {
  return getPartyStatement(tenantId, partyId, query, currentUser);
};

export const updatePartyStatus = async (
  tenantId: string,
  partyId: string,
  input: UpdatePartyStatusInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const party = await findPartyOrThrow(tenantId, partyId);

  if (party.isActive === input.isActive) {
    return party;
  }

  return prisma.party.update({
    where: { id: partyId },
    data: {
      isActive: input.isActive,
    },
    select: PARTY_SELECT,
  });
};

export const getPartiesDropdown = async (
  tenantId: string,
  query: DropdownPartiesQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.PartyWhereInput = {
    tenantId,
    deletedAt: null,
    isActive: query.isActive,
    type: query.type,
  };

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { code: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { gstin: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.party.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: query.limit,
    select: PARTY_DROPDOWN_SELECT,
  });

  return {
    items,
  };
};

export const checkPartyDuplicate = async (
  tenantId: string,
  query: CheckDuplicatePartyQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const normalizedInput = {
    name: query.name ? normalizeName(query.name) : undefined,
    code: query.code ? normalizeCode(query.code) : null,
    gstin: query.gstin ? normalizeUppercase(query.gstin) : null,
    phone: query.phone ? normalizeOptionalString(query.phone) : null,
  };

  const duplicate = await findDuplicateParty(
    tenantId,
    normalizedInput,
    query.excludePartyId,
  );

  return {
    ...buildDuplicateMatch(duplicate, normalizedInput),
    checkedFields: {
      name: normalizedInput.name ?? null,
      phone: normalizedInput.phone ?? null,
      code: normalizedInput.code ?? null,
      gstin: normalizedInput.gstin ?? null,
    },
  };
};
