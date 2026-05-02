import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../types/auth.types";
import { validationError } from "../../common/errors/app-error";
import { successResponse } from "../../utils/response";
import * as userService from "./user.service";

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().trim().min(6, "Phone must be at least 6 digits"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email address").nullable().optional(),
  phone: z.string().trim().min(6, "Phone must be at least 6 digits").optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

const listUsersSchema = z.object({
  search: z.string().trim().optional(),
  roleId: z.string().uuid().optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

const parseOrThrow = <T>(schema: z.ZodType<T, any, any>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data;
};

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const input = parseOrThrow(createUserSchema, req.body);
    const user = await userService.createUser(input, authReq.user);

    successResponse(res, user, 201);
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const input = parseOrThrow(listUsersSchema, req.query);
    const users = await userService.getUsers(input);

    successResponse(res, users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await userService.getUserById(req.params.id);

    successResponse(res, user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const input = parseOrThrow(updateUserSchema, req.body);
    const user = await userService.updateUser(req.params.id, input, authReq.user);

    successResponse(res, user);
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await userService.deactivateUser(req.params.id, authReq.user);

    successResponse(res, user);
  } catch (error) {
    next(error);
  }
};
