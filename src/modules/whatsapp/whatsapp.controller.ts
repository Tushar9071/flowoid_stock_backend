import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { validationError } from "../../common/errors/app-error";
import type { AuthenticatedRequest } from "../../types/auth.types";
import { successResponse } from "../../utils/response";
import * as configService from "./whatsapp-config.service";
import * as service from "./whatsapp.service";
import * as templateService from "./whatsapp-template.service";
import {
  dispatchParamsSchema,
  getLogsQuerySchema,
  logParamsSchema,
  orderParamsSchema,
  paymentParamsSchema,
  saveWhatsappConfigSchema,
  submitTemplateSchema,
  tenantParamsSchema,
  updateWhatsappAccessTokenSchema,
  type DispatchParams,
  type GetLogsQuery,
  type LogParams,
  type OrderParams,
  type PaymentParams,
  type SaveWhatsappConfigInput,
  type SubmitTemplateInput,
  type TenantParams,
  type UpdateWhatsappAccessTokenInput,
} from "./whatsapp.validation";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const saveConfig = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<SaveWhatsappConfigInput>(saveWhatsappConfigSchema, req.body);
    const result = await configService.saveConfig(params.tenantId, input, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getConfig = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const result = await configService.getMaskedConfig(params.tenantId, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<UpdateWhatsappAccessTokenInput>(
      updateWhatsappAccessTokenSchema,
      req.body,
    );
    const result = await configService.updateAccessToken(params.tenantId, input, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const testConnection = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const result = await configService.testConnection(params.tenantId, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const sendInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);
    const result = await service.sendInvoice(
      params.tenantId,
      params.orderId,
      authReq.user.userId,
      authReq.user,
    );
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const sendPaymentReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PaymentParams>(paymentParamsSchema, req.params);
    const result = await service.sendPaymentReceipt(
      params.tenantId,
      params.paymentId,
      authReq.user.userId,
      authReq.user,
    );
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const sendDeliveryChallan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<DispatchParams>(dispatchParamsSchema, req.params);
    const result = await service.sendDeliveryChallan(
      params.tenantId,
      params.dispatchId,
      authReq.user.userId,
      authReq.user,
    );
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const getLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<GetLogsQuery>(getLogsQuerySchema, req.query);
    const result = await service.getLogs(params.tenantId, query, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getLogById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<LogParams>(logParamsSchema, req.params);
    const result = await service.getLogById(params.tenantId, params.id, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const submitTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<SubmitTemplateInput>(submitTemplateSchema, req.body);
    const result = await templateService.submitTemplate(params.tenantId, input, authReq.user);
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const listTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const result = await templateService.listTemplates(params.tenantId, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
