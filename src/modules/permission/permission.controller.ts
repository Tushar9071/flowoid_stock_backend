import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as permissionService from "./permission.service";
import { successResponse } from "../../utils/response";
import { validationError } from "../../common/errors/app-error";

const createPermissionSchema = z.object({
  code: z.string().trim().min(3, "Code must be at least 3 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
});

const updatePermissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .optional(),
  description: z.string().optional(),
});

const parseOrThrow = <T>(schema: z.ZodSchema<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data;
};

export const createPermission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const input = parseOrThrow(createPermissionSchema, req.body);
    const permission = await permissionService.createPermission(input, (req as any).user);
    successResponse(res, permission, 201);
  } catch (error) {
    next(error);
  }
};

export const getAllPermissions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const permissions = await permissionService.getAllPermissions((req as any).user);
    successResponse(res, permissions);
  } catch (error) {
    next(error);
  }
};

export const getPermissionById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const permission = await permissionService.getPermissionById(id, (req as any).user);
    successResponse(res, permission);
  } catch (error) {
    next(error);
  }
};

export const updatePermission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    const input = parseOrThrow(updatePermissionSchema, req.body);
    const permission = await permissionService.updatePermission(id, input, (req as any).user);
    successResponse(res, permission);
  } catch (error) {
    next(error);
  }
};

export const deletePermission = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params;
    await permissionService.deletePermission(id, (req as any).user);
    successResponse(res, { message: "Permission deleted successfully" });
  } catch (error) {
    next(error);
  }
};
