import prisma from '../../lib/prisma.ts';
import { validationError, notFoundError } from '../../common/errors/app-error.ts';

type CreatePermissionInput = {
	code: string;
	name: string;
	description?: string;
};

type UpdatePermissionInput = {
	name?: string;
	description?: string;
};

export const createPermission = async (input: CreatePermissionInput) => {
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

export const getAllPermissions = async () => {
	return prisma.permission.findMany({
		orderBy: { createdAt: 'desc' },
	});
};

export const getPermissionById = async (id: string) => {
	const permission = await prisma.permission.findUnique({
		where: { id },
	});

	if (!permission) {
		throw notFoundError('Permission not found');
	}

	return permission;
};

export const updatePermission = async (id: string, input: UpdatePermissionInput) => {
	await getPermissionById(id);

	return prisma.permission.update({
		where: { id },
		data: input,
	});
};

export const deletePermission = async (id: string) => {
	await getPermissionById(id);

	return prisma.permission.delete({
		where: { id },
	});
};
