import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../types/auth.types";
import { validationError } from "../../common/errors/app-error";
import { successResponse } from "../../utils/response";

import * as assignmentsService from "./assignments.service";
import {
  assignmentParamsSchema,
  closeAssignmentSchema,
  createAssignmentSchema,
  createGoodsReturnSchema,
  goodsReturnParamsSchema,
  listAssignmentsQuerySchema,
  listGoodsReturnsQuerySchema,
  tenantParamsSchema,
  updateAssignmentSchema,
  updateAssignmentStatusSchema,
  type AssignmentParams,
  type CloseAssignmentInput,
  type CreateAssignmentInput,
  type CreateGoodsReturnInput,
  type GoodsReturnParams,
  type ListAssignmentsQuery,
  type ListGoodsReturnsQuery,
  type TenantParams,
  type UpdateAssignmentInput,
  type UpdateAssignmentStatusInput,
} from "./assignments.validation";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const getAllAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListAssignmentsQuery>(listAssignmentsQuerySchema, req.query);

    const result = await assignmentsService.getAllAssignments(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAssignmentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<AssignmentParams>(assignmentParamsSchema, req.params);

    const result = await assignmentsService.getAssignmentById(
      params.tenantId,
      params.id,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateAssignmentInput>(createAssignmentSchema, req.body);

    const result = await assignmentsService.createAssignment(
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

export const updateAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<AssignmentParams>(assignmentParamsSchema, req.params);
    const input = parseOrThrow<UpdateAssignmentInput>(updateAssignmentSchema, req.body);

    const result = await assignmentsService.updateAssignment(
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

export const updateAssignmentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<AssignmentParams>(assignmentParamsSchema, req.params);
    const input = parseOrThrow<UpdateAssignmentStatusInput>(
      updateAssignmentStatusSchema,
      req.body,
    );

    const result = await assignmentsService.updateAssignmentStatus(
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

export const closeAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<AssignmentParams>(assignmentParamsSchema, req.params);
    const input = parseOrThrow<CloseAssignmentInput>(closeAssignmentSchema, req.body);

    const result = await assignmentsService.closeAssignment(
      params.tenantId,
      params.id,
      input.notes,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const recordGoodsReturn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<AssignmentParams>(assignmentParamsSchema, req.params);
    const input = parseOrThrow<CreateGoodsReturnInput>(createGoodsReturnSchema, req.body);

    const result = await assignmentsService.recordGoodsReturn(
      params.tenantId,
      params.id,
      input,
      authReq.user.userId,
      authReq.user,
    );

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const getAssignmentReturns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<AssignmentParams>(assignmentParamsSchema, req.params);
    const query = parseOrThrow<ListGoodsReturnsQuery>(listGoodsReturnsQuerySchema, req.query);

    const result = await assignmentsService.getAssignmentReturns(
      params.tenantId,
      params.id,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAllGoodsReturns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListGoodsReturnsQuery>(listGoodsReturnsQuerySchema, req.query);

    const result = await assignmentsService.getAllGoodsReturns(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getGoodsReturnById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<GoodsReturnParams>(goodsReturnParamsSchema, req.params);

    const result = await assignmentsService.getGoodsReturnById(
      params.tenantId,
      params.returnId,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
