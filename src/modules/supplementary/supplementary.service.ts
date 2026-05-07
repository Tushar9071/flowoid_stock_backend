import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import type {
  CreateSupplementaryTypeInput,
  ListSupplementaryQuery,
  UpdateSupplementaryTypeInput,
} from "./supplementary.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

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

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

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

const findSupplementaryTypeOrThrow = async (
  tenantId: string,
  supplementaryTypeId: string,
) => {
  const materialType = await prisma.supplementaryMaterialType.findFirst({
    where: {
      id: supplementaryTypeId,
      tenantId,
      deletedAt: null,
    },
    select: SUPPLEMENTARY_TYPE_SELECT,
  });

  if (!materialType) {
    throw notFoundError("Supplementary material type not found");
  }

  return materialType;
};

export const getAllSupplementaryTypes = async (
  tenantId: string,
  query: ListSupplementaryQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.SupplementaryMaterialTypeWhereInput = {
    tenantId,
    deletedAt: null,
    isActive: query.isActive,
  };

  if (query.search) {
    where.name = { contains: query.search, mode: "insensitive" };
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.supplementaryMaterialType.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip,
      take: query.limit,
      select: SUPPLEMENTARY_TYPE_SELECT,
    }),
    prisma.supplementaryMaterialType.count({ where }),
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

export const getSupplementaryTypeById = async (
  tenantId: string,
  supplementaryTypeId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  return findSupplementaryTypeOrThrow(tenantId, supplementaryTypeId);
};

export const createSupplementaryType = async (
  tenantId: string,
  input: CreateSupplementaryTypeInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const normalizedName = normalizeName(input.name);
  const existing = await prisma.supplementaryMaterialType.findFirst({
    where: {
      tenantId,
      name: { equals: normalizedName, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    throw validationError("Supplementary material with this name already exists");
  }

  return prisma.supplementaryMaterialType.create({
    data: {
      tenantId,
      name: normalizedName,
      unit: input.unit.trim(),
      description: normalizeOptionalString(input.description),
      stockQuantity: new Prisma.Decimal(input.stockQuantity ?? 0),
    },
    select: SUPPLEMENTARY_TYPE_SELECT,
  });
};

export const updateSupplementaryType = async (
  tenantId: string,
  supplementaryTypeId: string,
  input: UpdateSupplementaryTypeInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const materialType = await findSupplementaryTypeOrThrow(tenantId, supplementaryTypeId);
  const normalizedName = input.name ? normalizeName(input.name) : materialType.name;

  if (input.name && normalizedName.toLowerCase() !== materialType.name.toLowerCase()) {
    const existing = await prisma.supplementaryMaterialType.findFirst({
      where: {
        tenantId,
        id: { not: supplementaryTypeId },
        name: { equals: normalizedName, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existing) {
      throw validationError("Supplementary material with this name already exists");
    }
  }

  return prisma.supplementaryMaterialType.update({
    where: { id: supplementaryTypeId },
    data: {
      name: input.name ? normalizedName : undefined,
      unit: input.unit?.trim(),
      description:
        input.description !== undefined
          ? normalizeOptionalString(input.description)
          : undefined,
      isActive: input.isActive,
    },
    select: SUPPLEMENTARY_TYPE_SELECT,
  });
};

export const softDeleteSupplementaryType = async (
  tenantId: string,
  supplementaryTypeId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const materialType = await findSupplementaryTypeOrThrow(tenantId, supplementaryTypeId);

  if (materialType.stockQuantity.gt(0)) {
    throw validationError(
      `Cannot delete supplementary material with remaining stock: ${materialType.stockQuantity.toString()} ${materialType.unit}`,
    );
  }

  const designReferenceCount = await prisma.designSupplementaryNeed.count({
    where: {
      materialTypeId: supplementaryTypeId,
    },
  });

  if (designReferenceCount > 0) {
    throw validationError(
      `Cannot delete supplementary material referenced by ${designReferenceCount} design(s)`,
    );
  }

  await prisma.supplementaryMaterialType.update({
    where: { id: supplementaryTypeId },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });
};

export const adjustStock = async (
  tenantId: string,
  supplementaryTypeId: string,
  adjustment: number,
  _notes: string | undefined,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const materialType = await findSupplementaryTypeOrThrow(tenantId, supplementaryTypeId);

  const adjustmentValue = new Prisma.Decimal(adjustment);
  const newStock = materialType.stockQuantity.plus(adjustmentValue);

  if (newStock.lt(0)) {
    throw validationError(
      `Adjustment would result in negative stock. Current stock: ${materialType.stockQuantity.toString()} ${materialType.unit}`,
    );
  }

  return prisma.supplementaryMaterialType.update({
    where: { id: supplementaryTypeId },
    data: {
      stockQuantity: newStock,
    },
    select: SUPPLEMENTARY_TYPE_SELECT,
  });
};
