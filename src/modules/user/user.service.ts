import prisma from "../../lib/prisma";
import { forbiddenError, notFoundError, validationError } from "../../common/errors/app-error";
import { hashPassword } from "../../utils/password";
import { getMyPermissions, revokeAllSessionsForUser } from "../auth/auth.service";

type CreateUserInput = {
  name: string;
  email?: string;
  phone: string;
  password: string;
  roleId?: string;
  isActive?: boolean;
};

type UpdateUserInput = {
  name?: string;
  email?: string | null;
  phone?: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
};

type ListUsersInput = {
  search?: string;
  roleId?: string;
  isActive?: boolean;
};

type CurrentUser = { userId: string; role: string };

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  roleId: true,
  role: { select: { id: true, name: true, description: true } },
  isActive: true,
  createdAt: true,
  updatedAt: true,
  tenantUsers: {
    select: {
      id: true,
      isActive: true,
      tenant: { select: { id: true, name: true, slug: true, status: true } },
      role: { select: { id: true, name: true } },
    },
  },
} as const;

const normalizeEmail = (email?: string | null): string | null => {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
};

const normalizePhone = (phone: string): string => phone.trim();

const getDefaultRole = async () => {
  const defaultRole = await prisma.role.findFirst({
    where: { isDefault: true, isActive: true },
    select: { id: true },
  });

  if (!defaultRole) {
    throw validationError("No default active role is configured in the system");
  }

  return defaultRole;
};

const assertAssignableRole = async (
  roleId: string,
  currentUser: CurrentUser,
): Promise<void> => {
  const role = await prisma.role.findFirst({
    where: { id: roleId, isActive: true },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    throw validationError("Role not found or inactive");
  }

  if (currentUser.role === "SUPER_ADMIN") {
    return;
  }

  if (role.name === "SUPER_ADMIN") {
    throw forbiddenError("You cannot assign a role with more permissions than your own");
  }

  const currentUserPermissions = await getMyPermissions(currentUser.userId);
  const targetRolePermissions = role.permissions.map((rp) => rp.permission.code);
  const canAssignRole = targetRolePermissions.every((permission) =>
    currentUserPermissions.includes(permission),
  );

  if (!canAssignRole) {
    throw forbiddenError("You cannot assign a role with more permissions than your own");
  }
};

const assertUniqueContact = async (
  input: { phone?: string; email?: string | null },
  excludeUserId?: string,
): Promise<void> => {
  if (input.phone) {
    const existingPhone = await prisma.user.findFirst({
      where: {
        phone: normalizePhone(input.phone),
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
      select: { id: true },
    });

    if (existingPhone) {
      throw validationError("A user with this phone number already exists");
    }
  }

  const email = normalizeEmail(input.email);
  if (email) {
    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        id: excludeUserId ? { not: excludeUserId } : undefined,
      },
      select: { id: true },
    });

    if (existingEmail) {
      throw validationError("A user with this email already exists");
    }
  }
};

export const createUser = async (
  input: CreateUserInput,
  currentUser: CurrentUser,
) => {
  await assertUniqueContact({ phone: input.phone, email: input.email });

  const roleId = input.roleId || (await getDefaultRole()).id;
  await assertAssignableRole(roleId, currentUser);

  const passwordHash = await hashPassword(input.password);

  return prisma.user.create({
    data: {
      name: input.name.trim(),
      email: normalizeEmail(input.email),
      phone: normalizePhone(input.phone),
      passwordHash,
      roleId,
      isActive: input.isActive ?? true,
    },
    select: USER_SELECT,
  });
};

export const getUsers = async (input: ListUsersInput = {}) => {
  const search = input.search?.trim();

  return prisma.user.findMany({
    where: {
      isActive: input.isActive,
      roleId: input.roleId,
      OR: search
        ? [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ]
        : undefined,
    },
    orderBy: { createdAt: "desc" },
    select: USER_SELECT,
  });
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: USER_SELECT,
  });

  if (!user) {
    throw notFoundError("User not found");
  }

  return user;
};

export const updateUser = async (
  id: string,
  input: UpdateUserInput,
  currentUser: CurrentUser,
) => {
  await getUserById(id);
  await assertUniqueContact({ phone: input.phone, email: input.email }, id);

  if (input.roleId) {
    await assertAssignableRole(input.roleId, currentUser);
  }

  if (currentUser.userId === id && input.isActive === false) {
    throw forbiddenError("You cannot deactivate your own account");
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      email: input.email === undefined ? undefined : normalizeEmail(input.email),
      phone: input.phone ? normalizePhone(input.phone) : undefined,
      passwordHash,
      roleId: input.roleId,
      isActive: input.isActive,
    },
    select: USER_SELECT,
  });

  if (passwordHash || input.isActive === false) {
    await revokeAllSessionsForUser(id, passwordHash ? "password_reset_by_admin" : "user_deactivated");
  }

  return user;
};

export const deactivateUser = async (id: string, currentUser: CurrentUser) => {
  if (currentUser.userId === id) {
    throw forbiddenError("You cannot deactivate your own account");
  }

  await getUserById(id);

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: USER_SELECT,
  });

  await revokeAllSessionsForUser(id, "user_deactivated");

  return user;
};
