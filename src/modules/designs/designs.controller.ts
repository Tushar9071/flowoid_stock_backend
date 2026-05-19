import type { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../types/auth.types";
import { validationError } from "../../common/errors/app-error";
import { toLocalDesignImagePath } from "../../middleware/upload.middleware";
import { successResponse } from "../../utils/response";

import * as designsService from "./designs.service";
import {
  categoryParamsSchema,
  createCategorySchema,
  createDesignSchema,
  createSupplementaryNeedSchema,
  designNeedParamsSchema,
  designParamsSchema,
  listCategoriesQuerySchema,
  listDesignsQuerySchema,
  tenantParamsSchema,
  updateCategorySchema,
  updateDesignSchema,
  updateDesignStatusSchema,
  updateSupplementaryNeedSchema,
  type CategoryParams,
  type CreateCategoryInput,
  type CreateDesignInput,
  type CreateSupplementaryNeedInput,
  type DesignNeedParams,
  type DesignParams,
  type ListCategoriesQuery,
  type ListDesignsQuery,
  type TenantParams,
  type UpdateCategoryInput,
  type UpdateDesignInput,
  type UpdateDesignStatusInput,
  type UpdateSupplementaryNeedInput,
} from "./designs.validation";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListCategoriesQuery>(listCategoriesQuerySchema, req.query);

    const result = await designsService.getAllCategories(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<CategoryParams>(categoryParamsSchema, req.params);

    const result = await designsService.getCategoryById(
      params.tenantId,
      params.id,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateCategoryInput>(createCategorySchema, req.body);

    const result = await designsService.createCategory(
      params.tenantId,
      input,
      authReq.user,
    );

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<CategoryParams>(categoryParamsSchema, req.params);
    const input = parseOrThrow<UpdateCategoryInput>(updateCategorySchema, req.body);

    const result = await designsService.updateCategory(
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

export const softDeleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<CategoryParams>(categoryParamsSchema, req.params);

    await designsService.softDeleteCategory(params.tenantId, params.id, authReq.user);

    successResponse(res, { message: "Design category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getAllDesigns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListDesignsQuery>(listDesignsQuerySchema, req.query);

    const result = await designsService.getAllDesigns(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getDesignById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DesignParams>(designParamsSchema, req.params);

    const result = await designsService.getDesignById(
      params.tenantId,
      params.id,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createDesign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const uploadedImage = req.file;

  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateDesignInput>(createDesignSchema, {
      ...req.body,
      imageUrl: uploadedImage ? toLocalDesignImagePath(uploadedImage.path) : undefined,
    });

    const result = await designsService.createDesign(
      params.tenantId,
      input,
      authReq.user.userId,
      authReq.user,
    );

    successResponse(res, result, 201);
  } catch (error) {
    if (uploadedImage) {
      await fs.unlink(uploadedImage.path).catch(() => undefined);
    }

    next(error);
  }
};

export const updateDesign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const uploadedImage = req.file;

  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DesignParams>(designParamsSchema, req.params);
    const input = parseOrThrow<UpdateDesignInput>(updateDesignSchema, {
      ...req.body,
      imageUrl: uploadedImage ? toLocalDesignImagePath(uploadedImage.path) : undefined,
    });

    const result = await designsService.updateDesign(
      params.tenantId,
      params.id,
      input,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    if (uploadedImage) {
      await fs.unlink(uploadedImage.path).catch(() => undefined);
    }

    next(error);
  }
};

export const updateDesignStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DesignParams>(designParamsSchema, req.params);
    const input = parseOrThrow<UpdateDesignStatusInput>(
      updateDesignStatusSchema,
      req.body,
    );

    const result = await designsService.updateDesignStatus(
      params.tenantId,
      params.id,
      input.status,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const softDeleteDesign = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DesignParams>(designParamsSchema, req.params);

    await designsService.softDeleteDesign(params.tenantId, params.id, authReq.user);

    successResponse(res, { message: "Design deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getDesignSupplementaryNeeds = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DesignParams>(designParamsSchema, req.params);

    const result = await designsService.getDesignSupplementaryNeeds(
      params.tenantId,
      params.id,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const addSupplementaryNeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DesignParams>(designParamsSchema, req.params);
    const input = parseOrThrow<CreateSupplementaryNeedInput>(
      createSupplementaryNeedSchema,
      req.body,
    );

    const result = await designsService.addSupplementaryNeed(
      params.tenantId,
      params.id,
      input,
      authReq.user,
    );

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateSupplementaryNeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DesignNeedParams>(designNeedParamsSchema, req.params);
    const input = parseOrThrow<UpdateSupplementaryNeedInput>(
      updateSupplementaryNeedSchema,
      req.body,
    );

    const result = await designsService.updateSupplementaryNeed(
      params.tenantId,
      params.id,
      params.needId,
      input,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const removeSupplementaryNeed = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DesignNeedParams>(designNeedParamsSchema, req.params);

    await designsService.removeSupplementaryNeed(
      params.tenantId,
      params.id,
      params.needId,
      authReq.user,
    );

    successResponse(res, { message: "Design supplementary need removed successfully" });
  } catch (error) {
    next(error);
  }
};
