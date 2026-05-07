import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../types/auth.types";
import { validationError } from "../../common/errors/app-error";
import { successResponse } from "../../utils/response";

import * as supplementaryService from "./supplementary.service";
import {
  adjustStockSchema,
  createSupplementaryTypeSchema,
  listSupplementaryQuerySchema,
  supplementaryTypeParamsSchema,
  tenantParamsSchema,
  updateSupplementaryTypeSchema,
  type AdjustStockInput,
  type CreateSupplementaryTypeInput,
  type ListSupplementaryQuery,
  type SupplementaryTypeParams,
  type TenantParams,
  type UpdateSupplementaryTypeInput,
} from "./supplementary.validation";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const getAllSupplementaryTypes = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListSupplementaryQuery>(
      listSupplementaryQuerySchema,
      req.query,
    );

    const result = await supplementaryService.getAllSupplementaryTypes(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getSupplementaryTypeById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<SupplementaryTypeParams>(
      supplementaryTypeParamsSchema,
      req.params,
    );

    const result = await supplementaryService.getSupplementaryTypeById(
      params.tenantId,
      params.id,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createSupplementaryType = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateSupplementaryTypeInput>(
      createSupplementaryTypeSchema,
      req.body,
    );

    const result = await supplementaryService.createSupplementaryType(
      params.tenantId,
      input,
      authReq.user,
    );

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateSupplementaryType = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<SupplementaryTypeParams>(
      supplementaryTypeParamsSchema,
      req.params,
    );
    const input = parseOrThrow<UpdateSupplementaryTypeInput>(
      updateSupplementaryTypeSchema,
      req.body,
    );

    const result = await supplementaryService.updateSupplementaryType(
      params.tenantId,
      params.id,
      input,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const softDeleteSupplementaryType = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<SupplementaryTypeParams>(
      supplementaryTypeParamsSchema,
      req.params,
    );

    await supplementaryService.softDeleteSupplementaryType(
      params.tenantId,
      params.id,
      authReq.user,
    );

    successResponse(res, { message: "Supplementary material deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<SupplementaryTypeParams>(
      supplementaryTypeParamsSchema,
      req.params,
    );
    const input = parseOrThrow<AdjustStockInput>(adjustStockSchema, req.body);

    const result = await supplementaryService.adjustStock(
      params.tenantId,
      params.id,
      input.adjustment,
      input.notes,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
