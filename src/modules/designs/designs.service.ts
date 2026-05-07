import { Prisma } from "@prisma/client";

import {
  forbiddenError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

import type {
  CreateCategoryInput,
  CreateDesignInput,
  CreateSupplementaryNeedInput,
  ListCategoriesQuery,
  ListDesignsQuery,
  UpdateCategoryInput,
  UpdateDesignInput,
  UpdateSupplementaryNeedInput,
} from "./designs.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

const CATEGORY_SELECT = {
  id: true,
  tenantId: true,
  name: true,
  sortOrder: true,
  isActive: true,
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

const DESIGN_WITH_CATEGORY_INCLUDE = {
  category: { select: CATEGORY_SELECT },
} as const;

const DESIGN_DETAILS_INCLUDE = {
  category: { select: CATEGORY_SELECT },
  supplementaryNeeds: {
    include: {
      materialType: { select: SUPPLEMENTARY_TYPE_SELECT },
    },
  },
} as const;

const DESIGN_NEED_INCLUDE = {
  materialType: { select: SUPPLEMENTARY_TYPE_SELECT },
} as const;

const normalizeOptionalString = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

const normalizeCode = (value: string): string => value.trim().toUpperCase();

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

const findCategoryOrThrow = async (tenantId: string, categoryId: string) => {
  const category = await prisma.designCategory.findFirst({
    where: {
      id: categoryId,
      tenantId,
    },
    select: CATEGORY_SELECT,
  });

  if (!category) {
    throw notFoundError("Design category not found");
  }

  return category;
};

const findDesignOrThrow = async (tenantId: string, designId: string) => {
  const design = await prisma.design.findFirst({
    where: {
      id: designId,
      tenantId,
      deletedAt: null,
    },
    include: DESIGN_WITH_CATEGORY_INCLUDE,
  });

  if (!design) {
    throw notFoundError("Design not found");
  }

  return design;
};

const findSupplementaryTypeOrThrow = async (
  tenantId: string,
  materialTypeId: string,
) => {
  const materialType = await prisma.supplementaryMaterialType.findFirst({
    where: {
      id: materialTypeId,
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

const findDesignSupplementaryNeedOrThrow = async (
  designId: string,
  needId: string,
) => {
  const need = await prisma.designSupplementaryNeed.findFirst({
    where: {
      id: needId,
      designId,
    },
    include: DESIGN_NEED_INCLUDE,
  });

  if (!need) {
    throw notFoundError("Design supplementary need not found");
  }

  return need;
};

const attachCategoryDesignCounts = async (
  tenantId: string,
  categories: Array<{ id: string } & Record<string, unknown>>,
) => {
  if (categories.length === 0) {
    return [];
  }

  const categoryIds = categories.map((category) => category.id);
  const counts = await prisma.design.groupBy({
    by: ["categoryId"],
    where: {
      tenantId,
      deletedAt: null,
      categoryId: { in: categoryIds },
    },
    _count: {
      _all: true,
    },
  });

  const countMap = new Map<string, number>();
  for (const row of counts) {
    countMap.set(row.categoryId, row._count._all);
  }

  return categories.map((category) => ({
    ...category,
    designsCount: countMap.get(category.id) ?? 0,
  }));
};

const countActiveAssignmentsForDiscontinue = async (tenantId: string, designId: string) => {
  return prisma.workerAssignment.count({
    where: {
      tenantId,
      designId,
      status: { in: ["ISSUED", "IN_PROGRESS"] },
    },
  });
};

const countActiveAssignmentsForDelete = async (tenantId: string, designId: string) => {
  return prisma.workerAssignment.count({
    where: {
      tenantId,
      designId,
      status: { notIn: ["COMPLETED", "CLOSED"] },
    },
  });
};

const sortNeedsByMaterialType = <T extends { materialType: { name: string } }>(needs: T[]) =>
  [...needs].sort((a, b) => a.materialType.name.localeCompare(b.materialType.name));

export const getAllCategories = async (
  tenantId: string,
  query: ListCategoriesQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.DesignCategoryWhereInput = {
    tenantId,
    isActive: query.isActive,
  };

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.designCategory.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
      skip,
      take: query.limit,
      select: CATEGORY_SELECT,
    }),
    prisma.designCategory.count({ where }),
  ]);

  const itemsWithCounts = await attachCategoryDesignCounts(tenantId, items);
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

export const getCategoryById = async (
  tenantId: string,
  categoryId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const category = await findCategoryOrThrow(tenantId, categoryId);
  const [categoryWithCounts] = await attachCategoryDesignCounts(tenantId, [category]);
  return categoryWithCounts;
};

export const createCategory = async (
  tenantId: string,
  input: CreateCategoryInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const normalizedName = normalizeName(input.name);
  const existing = await prisma.designCategory.findFirst({
    where: {
      tenantId,
      name: { equals: normalizedName, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    throw validationError("Category with this name already exists");
  }

  const category = await prisma.designCategory.create({
    data: {
      tenantId,
      name: normalizedName,
      sortOrder: input.sortOrder,
    },
    select: CATEGORY_SELECT,
  });

  return {
    ...category,
    designsCount: 0,
  };
};

export const updateCategory = async (
  tenantId: string,
  categoryId: string,
  input: UpdateCategoryInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const category = await findCategoryOrThrow(tenantId, categoryId);
  const normalizedName = input.name ? normalizeName(input.name) : category.name;

  if (input.name && normalizedName.toLowerCase() !== category.name.toLowerCase()) {
    const existing = await prisma.designCategory.findFirst({
      where: {
        tenantId,
        id: { not: categoryId },
        name: { equals: normalizedName, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existing) {
      throw validationError("Category with this name already exists");
    }
  }

  const updated = await prisma.designCategory.update({
    where: { id: categoryId },
    data: {
      name: input.name ? normalizedName : undefined,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    },
    select: CATEGORY_SELECT,
  });

  const [updatedWithCounts] = await attachCategoryDesignCounts(tenantId, [updated]);
  return updatedWithCounts;
};

export const softDeleteCategory = async (
  tenantId: string,
  categoryId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findCategoryOrThrow(tenantId, categoryId);

  const designCount = await prisma.design.count({
    where: {
      tenantId,
      categoryId,
      deletedAt: null,
    },
  });

  if (designCount > 0) {
    throw validationError("Cannot delete category with existing designs. Move designs first.");
  }

  await prisma.designCategory.update({
    where: { id: categoryId },
    data: {
      isActive: false,
    },
  });
};

export const getAllDesigns = async (
  tenantId: string,
  query: ListDesignsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const where: Prisma.DesignWhereInput = {
    tenantId,
    deletedAt: null,
    categoryId: query.categoryId,
    status: query.status,
  };

  if (query.search) {
    where.OR = [
      { designCode: { contains: query.search, mode: "insensitive" } },
      { name: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, totalItems] = await prisma.$transaction([
    prisma.design.findMany({
      where,
      orderBy: [{ designCode: "asc" }, { id: "asc" }],
      skip,
      take: query.limit,
      include: DESIGN_WITH_CATEGORY_INCLUDE,
    }),
    prisma.design.count({ where }),
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

export const getDesignById = async (
  tenantId: string,
  designId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const design = await prisma.design.findFirst({
    where: {
      id: designId,
      tenantId,
      deletedAt: null,
    },
    include: DESIGN_DETAILS_INCLUDE,
  });

  if (!design) {
    throw notFoundError("Design not found");
  }

  return {
    ...design,
    supplementaryNeeds: sortNeedsByMaterialType(design.supplementaryNeeds),
  };
};

export const createDesign = async (
  tenantId: string,
  input: CreateDesignInput,
  createdById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findCategoryOrThrow(tenantId, input.categoryId);

  const normalizedDesignCode = normalizeCode(input.designCode);
  const existing = await prisma.design.findFirst({
    where: {
      tenantId,
      designCode: { equals: normalizedDesignCode, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    throw validationError("Design code already exists");
  }

  return prisma.design.create({
    data: {
      tenantId,
      categoryId: input.categoryId,
      designCode: normalizedDesignCode,
      name: normalizeName(input.name),
      description: normalizeOptionalString(input.description),
      material: normalizeOptionalString(input.material),
      finish: normalizeOptionalString(input.finish),
      diamondCount: input.diamondCount,
      pieceRateRs: new Prisma.Decimal(input.pieceRateRs),
      salePricePerDozen: new Prisma.Decimal(input.salePricePerDozen),
      imageUrl: normalizeOptionalString(input.imageUrl),
      status: input.status,
      notes: normalizeOptionalString(input.notes),
      createdById,
    },
    include: DESIGN_WITH_CATEGORY_INCLUDE,
  });
};

export const updateDesign = async (
  tenantId: string,
  designId: string,
  input: UpdateDesignInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const design = await findDesignOrThrow(tenantId, designId);

  if (input.categoryId && input.categoryId !== design.categoryId) {
    await findCategoryOrThrow(tenantId, input.categoryId);
  }

  const normalizedDesignCode =
    input.designCode !== undefined ? normalizeCode(input.designCode) : design.designCode;

  if (
    input.designCode &&
    normalizedDesignCode.toLowerCase() !== design.designCode.toLowerCase()
  ) {
    const existing = await prisma.design.findFirst({
      where: {
        tenantId,
        id: { not: designId },
        designCode: { equals: normalizedDesignCode, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (existing) {
      throw validationError("Design code already exists");
    }
  }

  if (input.status === "DISCONTINUED" && design.status !== "DISCONTINUED") {
    const activeAssignments = await countActiveAssignmentsForDiscontinue(
      tenantId,
      designId,
    );

    if (activeAssignments > 0) {
      throw validationError("Cannot discontinue design with active assignments");
    }
  }

  return prisma.design.update({
    where: { id: designId },
    data: {
      categoryId: input.categoryId,
      designCode: input.designCode ? normalizedDesignCode : undefined,
      name: input.name ? normalizeName(input.name) : undefined,
      description:
        input.description !== undefined ? normalizeOptionalString(input.description) : undefined,
      material: input.material !== undefined ? normalizeOptionalString(input.material) : undefined,
      finish: input.finish !== undefined ? normalizeOptionalString(input.finish) : undefined,
      diamondCount: input.diamondCount,
      pieceRateRs:
        input.pieceRateRs !== undefined ? new Prisma.Decimal(input.pieceRateRs) : undefined,
      salePricePerDozen:
        input.salePricePerDozen !== undefined
          ? new Prisma.Decimal(input.salePricePerDozen)
          : undefined,
      imageUrl: input.imageUrl !== undefined ? normalizeOptionalString(input.imageUrl) : undefined,
      status: input.status,
      notes: input.notes !== undefined ? normalizeOptionalString(input.notes) : undefined,
    },
    include: DESIGN_WITH_CATEGORY_INCLUDE,
  });
};

export const updateDesignStatus = async (
  tenantId: string,
  designId: string,
  status: "ACTIVE" | "DISCONTINUED" | "DRAFT",
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const design = await findDesignOrThrow(tenantId, designId);

  if (design.status === status) {
    return design;
  }

  if (status === "DISCONTINUED") {
    const activeAssignments = await countActiveAssignmentsForDiscontinue(
      tenantId,
      designId,
    );

    if (activeAssignments > 0) {
      throw validationError("Cannot discontinue design with active assignments");
    }
  }

  return prisma.design.update({
    where: { id: designId },
    data: { status },
    include: DESIGN_WITH_CATEGORY_INCLUDE,
  });
};

export const softDeleteDesign = async (
  tenantId: string,
  designId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findDesignOrThrow(tenantId, designId);

  const activeAssignments = await countActiveAssignmentsForDelete(tenantId, designId);
  if (activeAssignments > 0) {
    throw validationError("Cannot delete design with active assignments");
  }

  await prisma.design.update({
    where: { id: designId },
    data: {
      deletedAt: new Date(),
    },
  });
};

export const getDesignSupplementaryNeeds = async (
  tenantId: string,
  designId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findDesignOrThrow(tenantId, designId);

  const needs = await prisma.designSupplementaryNeed.findMany({
    where: { designId },
    include: DESIGN_NEED_INCLUDE,
  });

  return sortNeedsByMaterialType(needs);
};

export const addSupplementaryNeed = async (
  tenantId: string,
  designId: string,
  input: CreateSupplementaryNeedInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findDesignOrThrow(tenantId, designId);
  await findSupplementaryTypeOrThrow(tenantId, input.materialTypeId);

  const existing = await prisma.designSupplementaryNeed.findFirst({
    where: {
      designId,
      materialTypeId: input.materialTypeId,
    },
    select: { id: true },
  });

  if (existing) {
    throw validationError("This material is already added to the design");
  }

  return prisma.designSupplementaryNeed.create({
    data: {
      designId,
      materialTypeId: input.materialTypeId,
      quantityPerPiece: new Prisma.Decimal(input.quantityPerPiece),
      notes: normalizeOptionalString(input.notes),
    },
    include: DESIGN_NEED_INCLUDE,
  });
};

export const updateSupplementaryNeed = async (
  tenantId: string,
  designId: string,
  needId: string,
  input: UpdateSupplementaryNeedInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findDesignOrThrow(tenantId, designId);
  await findDesignSupplementaryNeedOrThrow(designId, needId);

  return prisma.designSupplementaryNeed.update({
    where: { id: needId },
    data: {
      quantityPerPiece:
        input.quantityPerPiece !== undefined
          ? new Prisma.Decimal(input.quantityPerPiece)
          : undefined,
      notes: input.notes !== undefined ? normalizeOptionalString(input.notes) : undefined,
    },
    include: DESIGN_NEED_INCLUDE,
  });
};

export const removeSupplementaryNeed = async (
  tenantId: string,
  designId: string,
  needId: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  await findDesignOrThrow(tenantId, designId);
  await findDesignSupplementaryNeedOrThrow(designId, needId);

  await prisma.designSupplementaryNeed.delete({
    where: { id: needId },
  });
};
