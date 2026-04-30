import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import * as roleService from './role.service.ts';
import { successResponse } from '../../utils/response.ts';
import { validationError } from '../../common/errors/app-error.ts';

const createRoleSchema = z.object({
	name: z.string().trim().min(2, 'Name must be at least 2 characters'),
	description: z.string().optional(),
	isDefault: z.boolean().optional(),
	permissionIds: z.array(z.string().uuid()).optional(),
});

const updateRoleSchema = z.object({
	name: z.string().trim().min(2, 'Name must be at least 2 characters').optional(),
	description: z.string().optional(),
	isActive: z.boolean().optional(),
	isDefault: z.boolean().optional(),
	permissionIds: z.array(z.string().uuid()).optional(),
});

const parseOrThrow = <T>(schema: z.ZodSchema<T>, value: unknown): T => {
	const result = schema.safeParse(value);
	if (!result.success) {
		throw validationError('Request validation failed', result.error.flatten());
	}
	return result.data;
};

export const createRole = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const input = parseOrThrow(createRoleSchema, req.body);
		const role = await roleService.createRole(input);
		successResponse(res, role, 201);
	} catch (error) {
		next(error);
	}
};

export const getAllRoles = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const roles = await roleService.getAllRoles();
		successResponse(res, roles);
	} catch (error) {
		next(error);
	}
};

export const getRoleById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const role = await roleService.getRoleById(id);
		successResponse(res, role);
	} catch (error) {
		next(error);
	}
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		const input = parseOrThrow(updateRoleSchema, req.body);
		const role = await roleService.updateRole(id, input);
		successResponse(res, role);
	} catch (error) {
		next(error);
	}
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { id } = req.params;
		await roleService.deleteRole(id);
		successResponse(res, { message: 'Role deleted successfully' });
	} catch (error) {
		next(error);
	}
};
