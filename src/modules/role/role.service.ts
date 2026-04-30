import prisma from "../../lib/prisma";
import {
  validationError,
  notFoundError,
  forbiddenError,
} from "../../common/errors/app-error";
import { getMyPermissions } from "../auth/auth.service";

type CurrentUser = { userId: string; role: string };

type CreateRoleInput = {
  name: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  isSystem?: boolean;
  permissionIds?: string[];
};

type UpdateRoleInput = {
  name?: string;
  description?: string;
  isActive?: boolean;
  isDefault?: boolean;
  isSystem?: boolean;
  permissionIds?: string[];
};

const hasAllPermissions = (
  userPermissions: string[],
  requiredPermissions: string[],
) => {
  return requiredPermissions.every((p) => userPermissions.includes(p));
};

export const createRole = async (
  input: CreateRoleInput,
  currentUser: CurrentUser,
) => {
  const existing = await prisma.role.findFirst({
    where: { name: input.name },
  });

  if (existing) {
    throw validationError("Role with this name already exists");
  }

  // Check if non-admin is trying to assign permissions they don't have
  if (
    currentUser.role !== "SUPER_ADMIN" &&
    input.permissionIds &&
    input.permissionIds.length > 0
  ) {
    const userPermissions = await getMyPermissions(currentUser.userId);

    // We need to fetch the codes for the requested permissionIds
    const requestedPerms = await prisma.permission.findMany({
      where: { id: { in: input.permissionIds } },
      select: { code: true },
    });

    const requestedCodes = requestedPerms.map((p) => p.code);

    if (!hasAllPermissions(userPermissions, requestedCodes)) {
      throw forbiddenError("You cannot assign permissions you do not possess");
    }
  }

  return prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        isDefault: input.isDefault,
        isSystem: input.isSystem,
        createdById: currentUser.userId,
      },
    });

    if (input.permissionIds && input.permissionIds.length > 0) {
      const rolePermissions = input.permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      }));
      await tx.rolePermission.createMany({
        data: rolePermissions,
      });
    }

    return tx.role.findUnique({
      where: { id: role.id },
      include: { permissions: { include: { permission: true } } },
    });
  });
};

export const getAllRoles = async (currentUser: CurrentUser) => {
  let whereClause = {};

  if (currentUser.role !== "SUPER_ADMIN") {
    const userPermissions = await getMyPermissions(currentUser.userId);
    if (!userPermissions.includes("roles.readAll")) {
      whereClause = { createdById: currentUser.userId };
    }
  }

  return prisma.role.findMany({
    where: whereClause,
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getRoleById = async (id: string, currentUser: CurrentUser) => {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!role) {
    throw notFoundError("Role not found");
  }

  if (currentUser.role !== "SUPER_ADMIN") {
    const userPermissions = await getMyPermissions(currentUser.userId);
    if (
      !userPermissions.includes("roles.readAll") &&
      role.createdById !== currentUser.userId
    ) {
      throw forbiddenError("You do not have access to view this role");
    }
  }

  return role;
};

export const updateRole = async (
  id: string,
  input: UpdateRoleInput,
  currentUser: CurrentUser,
) => {
  const role = await getRoleById(id, currentUser);

  if (role.isSystem && input.name) {
    throw validationError("Cannot update name of a system role");
  }

  if (currentUser.role !== "SUPER_ADMIN") {
    const userPermissions = await getMyPermissions(currentUser.userId);
    if (
      !userPermissions.includes("roles.manageAll") &&
      role.createdById !== currentUser.userId
    ) {
      throw forbiddenError("You do not have permission to edit this role");
    }

    if (input.permissionIds !== undefined && input.permissionIds.length > 0) {
      const requestedPerms = await prisma.permission.findMany({
        where: { id: { in: input.permissionIds } },
        select: { code: true },
      });
      const requestedCodes = requestedPerms.map((p) => p.code);
      if (!hasAllPermissions(userPermissions, requestedCodes)) {
        throw forbiddenError(
          "You cannot assign permissions you do not possess",
        );
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const updatedRole = await tx.role.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        isActive: input.isActive,
        isDefault: input.isDefault,
        isSystem: input.isSystem,
      },
    });

    if (input.permissionIds !== undefined) {
      // Remove old permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Add new permissions
      if (input.permissionIds.length > 0) {
        const rolePermissions = input.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        }));
        await tx.rolePermission.createMany({
          data: rolePermissions,
        });
      }
    }

    return tx.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  });
};

export const deleteRole = async (id: string, currentUser: CurrentUser) => {
  const role = await getRoleById(id, currentUser);

  if (role.isSystem) {
    throw validationError("Cannot delete a system role");
  }

  if (currentUser.role !== "SUPER_ADMIN") {
    const userPermissions = await getMyPermissions(currentUser.userId);
    if (
      !userPermissions.includes("roles.manageAll") &&
      role.createdById !== currentUser.userId
    ) {
      throw forbiddenError("You do not have permission to delete this role");
    }
  }

  return prisma.role.delete({
    where: { id },
  });
};
