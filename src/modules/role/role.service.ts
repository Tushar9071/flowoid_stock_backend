import prisma from '../../lib/prisma.ts';
import { validationError, notFoundError } from '../../common/errors/app-error.ts';

type CreateRoleInput = {
	name: string;
	description?: string;
	isDefault?: boolean;
	permissionIds?: string[];
};

type UpdateRoleInput = {
	name?: string;
	description?: string;
	isActive?: boolean;
	isDefault?: boolean;
	permissionIds?: string[];
};

export const createRole = async (input: CreateRoleInput) => {
	const existing = await prisma.role.findFirst({
		where: { name: input.name },
	});

	if (existing) {
		throw validationError('Role with this name already exists');
	}

	return prisma.$transaction(async (tx) => {
		if (input.isDefault) {
			await tx.role.updateMany({
				data: { isDefault: false },
			});
		}

		const role = await tx.role.create({
			data: {
				name: input.name,
				description: input.description,
				isDefault: input.isDefault || false,
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

export const getAllRoles = async () => {
	return prisma.role.findMany({
		include: {
			permissions: {
				include: {
					permission: true,
				},
			},
		},
		orderBy: { createdAt: 'desc' },
	});
};

export const getRoleById = async (id: string) => {
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
		throw notFoundError('Role not found');
	}

	return role;
};

export const updateRole = async (id: string, input: UpdateRoleInput) => {
	const role = await getRoleById(id);

	if (role.isSystem && input.name) {
		throw validationError('Cannot update name of a system role');
	}

	return prisma.$transaction(async (tx) => {
		if (input.isDefault) {
			await tx.role.updateMany({
				data: { isDefault: false },
			});
		}

		const updatedRole = await tx.role.update({
			where: { id },
			data: {
				name: input.name,
				description: input.description,
				isActive: input.isActive,
				isDefault: input.isDefault,
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

export const deleteRole = async (id: string) => {
	const role = await getRoleById(id);

	if (role.isSystem) {
		throw validationError('Cannot delete a system role');
	}

	return prisma.role.delete({
		where: { id },
	});
};
