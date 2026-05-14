import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { validationError } from "../../common/errors/app-error";
import type { AuthenticatedRequest } from "../../types/auth.types";
import { successResponse } from "../../utils/response";

import * as paymentsService from "./payments.service";
import {
  agingReportQuerySchema,
  createDealerPaymentSchema,
  createSupplierPaymentSchema,
  dailyCashFlowQuerySchema,
  listPaymentsQuerySchema,
  partyParamsSchema,
  paymentParamsSchema,
  tenantParamsSchema,
  updatePaymentStatusSchema,
  type AgingReportQuery,
  type CreateDealerPaymentInput,
  type CreateSupplierPaymentInput,
  type DailyCashFlowQuery,
  type ListPaymentsQuery,
  type PartyParams,
  type PaymentParams,
  type TenantParams,
  type UpdatePaymentStatusInput,
} from "./payments.validation";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const getAllPayments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListPaymentsQuery>(listPaymentsQuerySchema, req.query);

    const result = await paymentsService.getAllPayments(params.tenantId, query, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PaymentParams>(paymentParamsSchema, req.params);

    const result = await paymentsService.getPaymentById(
      params.tenantId,
      params.paymentId,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createDealerPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateDealerPaymentInput>(createDealerPaymentSchema, req.body);

    const result = await paymentsService.createDealerPayment(
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

export const createSupplierPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateSupplierPaymentInput>(createSupplierPaymentSchema, req.body);

    const result = await paymentsService.createSupplierPayment(
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

export const updatePaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PaymentParams>(paymentParamsSchema, req.params);
    const input = parseOrThrow<UpdatePaymentStatusInput>(updatePaymentStatusSchema, req.body);

    const result = await paymentsService.updatePaymentStatus(
      params.tenantId,
      params.paymentId,
      input,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPartyOutstanding = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);

    const result = await paymentsService.getPartyOutstanding(
      params.tenantId,
      params.partyId,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getAgingReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<AgingReportQuery>(agingReportQuerySchema, req.query);

    const result = await paymentsService.getAgingReport(params.tenantId, query, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getDailyCashFlow = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<DailyCashFlowQuery>(dailyCashFlowQuerySchema, req.query);

    const result = await paymentsService.getDailyCashFlow(params.tenantId, query, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
