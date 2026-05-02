import prisma from '../../lib/prisma';
import { validationError, notFoundError, forbiddenError } from '../../common/errors/app-error';
import { getMyPermissions } from '../auth/auth.service';

type CurrentUser = { userId: string; role: string };

type CreatePermissionInput = {
	code: string;
	name: string;
	description?: string;
};

type UpdatePermissionInput = {
	name?: string;
	description?: string;
};

export const createPermission = async (input: CreatePermissionInput, currentUser: CurrentUser) => {
	if (currentUser.role !== "SUPER_ADMIN") {
		throw forbiddenError("Only super admins can create system permissions");
	}

	const existing = await prisma.permission.findUnique({
		where: { code: input.code },
	});

	if (existing) {
		throw validationError('Permission with this code already exists');
	}

	return prisma.permission.create({
		data: input,
	});
};

export const getAllPermissions = async (currentUser: CurrentUser) => {
	const allPerms = await prisma.permission.findMany({
		orderBy: { createdAt: 'desc' },
	});

	if (currentUser.role === "SUPER_ADMIN") {
		return allPerms;
	}

	const userPermissions = await getMyPermissions(currentUser.userId);
	// Normal users can only see the permissions they have, so they know what they can grant
	return allPerms.filter(p => userPermissions.includes(p.code));
};

export const getPermissionById = async (id: string, currentUser: CurrentUser) => {
	const permission = await prisma.permission.findUnique({
		where: { id },
	});

	if (!permission) {
		throw notFoundError('Permission not found');
	}

	if (currentUser.role !== "SUPER_ADMIN") {
		const userPermissions = await getMyPermissions(currentUser.userId);
		if (!userPermissions.includes(permission.code)) {
			throw forbiddenError("You do not have access to view this permission");
		}
	}

	return permission;
};

export const updatePermission = async (id: string, input: UpdatePermissionInput, currentUser: CurrentUser) => {
	if (currentUser.role !== "SUPER_ADMIN") {
		throw forbiddenError("Only super admins can modify system permissions");
	}

	await getPermissionById(id, currentUser);

	return prisma.permission.update({
		where: { id },
		data: input,
	});
};

export const deletePermission = async (id: string, currentUser: CurrentUser) => {
	if (currentUser.role !== "SUPER_ADMIN") {
		throw forbiddenError("Only super admins can delete system permissions");
	}

	await getPermissionById(id, currentUser);

	return prisma.permission.delete({
		where: { id },
	});
};
