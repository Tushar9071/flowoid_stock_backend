import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../types/auth.types";
import { validationError } from "../../common/errors/app-error";
import { successResponse } from "../../utils/response";

import * as workersService from "./workers.service";
import {
  createWorkerPaymentSchema,
  createWorkerSchema,
  listAssignmentsQuerySchema,
  listPaymentsQuerySchema,
  listWorkerPaymentsQuerySchema,
  listWorkersQuerySchema,
  tenantParamsSchema,
  updateWorkerSchema,
  workerPaymentParamsSchema,
  workerParamsSchema,
  type CreateWorkerPaymentInput,
  type CreateWorkerInput,
  type ListAssignmentsQuery,
  type ListPaymentsQuery,
  type ListWorkerPaymentsQuery,
  type ListWorkersQuery,
  type TenantParams,
  type UpdateWorkerInput,
  type WorkerPaymentParams,
  type WorkerParams,
} from "./workers.validation";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const getAllWorkers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListWorkersQuery>(listWorkersQuerySchema, req.query);

    const result = await workersService.getAllWorkers(params.tenantId, query, authReq.user);

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getWorkerById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<WorkerParams>(workerParamsSchema, req.params);

    const result = await workersService.getWorkerById(
      params.tenantId,
      params.id,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createWorker = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateWorkerInput>(createWorkerSchema, req.body);

    const result = await workersService.createWorker(params.tenantId, input, authReq.user);

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateWorker = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<WorkerParams>(workerParamsSchema, req.params);
    const input = parseOrThrow<UpdateWorkerInput>(updateWorkerSchema, req.body);

    const result = await workersService.updateWorker(
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

export const softDeleteWorker = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<WorkerParams>(workerParamsSchema, req.params);

    await workersService.softDeleteWorker(params.tenantId, params.id, authReq.user);

    successResponse(res, { message: "Worker deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getWorkerAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<WorkerParams>(workerParamsSchema, req.params);
    const query = parseOrThrow<ListAssignmentsQuery>(listAssignmentsQuerySchema, req.query);

    const result = await workersService.getWorkerAssignments(
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

export const getWorkerPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<WorkerParams>(workerParamsSchema, req.params);
    const query = parseOrThrow<ListPaymentsQuery>(listPaymentsQuerySchema, req.query);

    const result = await workersService.getWorkerPayments(
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

export const getAllWorkerPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListWorkerPaymentsQuery>(listWorkerPaymentsQuerySchema, req.query);

    const result = await workersService.getAllWorkerPayments(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getWorkerPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<WorkerPaymentParams>(workerPaymentParamsSchema, req.params);

    const result = await workersService.getWorkerPaymentById(
      params.tenantId,
      params.paymentId,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createWorkerPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateWorkerPaymentInput>(createWorkerPaymentSchema, req.body);

    const result = await workersService.createWorkerPayment(
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

export const getWorkerLedger = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<WorkerParams>(workerParamsSchema, req.params);

    const result = await workersService.getWorkerLedger(
      params.tenantId,
      params.id,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
