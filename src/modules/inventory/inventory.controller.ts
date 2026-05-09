import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { validationError } from "../../common/errors/app-error";
import type { AuthenticatedRequest } from "../../types/auth.types";
import { successResponse } from "../../utils/response";

import * as inventoryService from "./inventory.service";
import {
  createPackagingBatchSchema,
  createStockAdjustmentSchema,
  listPackagingBatchesQuerySchema,
  listStockQuerySchema,
  packagingBatchParamsSchema,
  stockParamsSchema,
  tenantParamsSchema,
  updateLowStockAlertSchema,
  type CreatePackagingBatchInput,
  type CreateStockAdjustmentInput,
  type ListPackagingBatchesQuery,
  type ListStockQuery,
  type PackagingBatchParams,
  type StockParams,
  type TenantParams,
  type UpdateLowStockAlertInput,
} from "./inventory.validation";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const getStockOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListStockQuery>(listStockQuerySchema, req.query);

    const result = await inventoryService.getStockOverview(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getStockByDesign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<StockParams>(stockParamsSchema, req.params);

    const result = await inventoryService.getStockByDesign(
      params.tenantId,
      params.designId,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getLowStockAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);

    const result = await inventoryService.getLowStockAlerts(
      params.tenantId,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createPackagingBatch = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreatePackagingBatchInput>(
      createPackagingBatchSchema,
      req.body,
    );

    const result = await inventoryService.createPackagingBatch(
      params.tenantId,
      input,
      authReq.user.userId,
      authReq.user,
    );

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const getPackagingBatches = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListPackagingBatchesQuery>(
      listPackagingBatchesQuerySchema,
      req.query,
    );

    const result = await inventoryService.getPackagingBatches(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPackagingBatchById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PackagingBatchParams>(
      packagingBatchParamsSchema,
      req.params,
    );

    const result = await inventoryService.getPackagingBatchById(
      params.tenantId,
      params.batchId,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateLowStockAlert = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<StockParams>(stockParamsSchema, req.params);
    const input = parseOrThrow<UpdateLowStockAlertInput>(
      updateLowStockAlertSchema,
      req.body,
    );

    const result = await inventoryService.updateLowStockAlert(
      params.tenantId,
      params.designId,
      input,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createStockAdjustment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<StockParams>(stockParamsSchema, req.params);
    const input = parseOrThrow<CreateStockAdjustmentInput>(
      createStockAdjustmentSchema,
      req.body,
    );

    const result = await inventoryService.createStockAdjustment(
      params.tenantId,
      params.designId,
      input,
      authReq.user.userId,
      authReq.user,
    );

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};
