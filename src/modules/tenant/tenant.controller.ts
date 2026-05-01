import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../types/auth.types";
import { validationError } from "../../common/errors/app-error";
import { successResponse } from "../../utils/response";
import * as tenantService from "./tenant.service";

const createTenantSchema = z.object({
  name: z.string().trim().min(2, "Tenant name must be at least 2 characters"),
  slug: z.string().trim().min(2, "Slug must be at least 2 characters").optional(),
  email: z.string().email("Invalid tenant email").optional(),
  phone: z.string().trim().min(6, "Phone must be at least 6 digits").optional(),
  address: z.string().trim().optional(),
  logoUrl: z.string().url("Logo URL must be a valid URL").optional(),
  businessCategory: z.string().trim().optional(),
});

const parseOrThrow = <T>(schema: z.ZodSchema<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data;
};

export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const input = parseOrThrow(createTenantSchema, req.body);
    const tenant = await tenantService.createTenant(input, authReq.user.userId);

    successResponse(res, tenant, 201);
  } catch (error) {
    next(error);
  }
};

export const getMyTenants = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const tenants = await tenantService.getMyTenants(authReq.user.userId);

    successResponse(res, tenants);
  } catch (error) {
    next(error);
  }
};
