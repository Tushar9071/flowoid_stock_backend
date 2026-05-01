import prisma from "../../lib/prisma";
import { notFoundError, validationError } from "../../common/errors/app-error";

type CreateTenantInput = {
  name: string;
  slug?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  businessCategory?: string;
};

const TENANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  email: true,
  phone: true,
  address: true,
  status: true,
  trialEndsAt: true,
  subscriptionEndsAt: true,
  logoUrl: true,
  businessCategory: true,
  createdAt: true,
  updatedAt: true,
  users: {
    select: {
      id: true,
      userId: true,
      roleId: true,
      isActive: true,
      role: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  },
} as const;

const normalizeNullable = (value?: string): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const normalizeName = (value: string): string => value.trim().replace(/\s+/g, " ").toLowerCase();

const resolveSlug = (name: string, requestedSlug?: string): string => {
  const slug = slugify(requestedSlug || name);

  if (!slug) {
    throw validationError("Tenant slug must contain at least one letter or number");
  }

  return slug;
};

const getOwnerRoleId = async (fallbackRoleId: string): Promise<string> => {
  const ownerRole = await prisma.role.findFirst({
    where: { name: "TENANT_OWNER", isActive: true },
    select: { id: true },
  });

  return ownerRole?.id ?? fallbackRoleId;
};

export const createTenant = async (input: CreateTenantInput, userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, roleId: true, isActive: true },
  });

  if (!user) {
    throw notFoundError("User not found");
  }

  if (!user.isActive) {
    throw validationError("Inactive users cannot create tenants");
  }

  const slug = resolveSlug(input.name, input.slug);
  const tenantName = input.name.trim();
  const normalizedTenantName = normalizeName(tenantName);

  const userTenants = await prisma.tenant.findMany({
    where: {
      users: {
        some: {
          userId: user.id,
          isActive: true,
        },
      },
    },
    select: { id: true, name: true, slug: true },
  });

  const duplicateUserTenant = userTenants.find(
    (tenant) => tenant.slug === slug || normalizeName(tenant.name) === normalizedTenantName,
  );

  if (duplicateUserTenant) {
    throw validationError("You have already created this tenant");
  }

  const existingSlugTenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingSlugTenant) {
    throw validationError("Tenant slug already exists. Please choose a different slug");
  }

  const roleId = await getOwnerRoleId(user.roleId);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  return prisma.tenant.create({
    data: {
      name: tenantName,
      slug,
      email: normalizeNullable(input.email),
      phone: normalizeNullable(input.phone),
      address: normalizeNullable(input.address),
      logoUrl: normalizeNullable(input.logoUrl),
      businessCategory: normalizeNullable(input.businessCategory),
      trialEndsAt,
      users: {
        create: {
          userId: user.id,
          roleId,
        },
      },
    },
    select: TENANT_SELECT,
  });
};

export const getMyTenants = async (userId: string) => {
  return prisma.tenant.findMany({
    where: {
      users: {
        some: {
          userId,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    select: TENANT_SELECT,
  });
};
