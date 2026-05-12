import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { validationError } from "../../common/errors/app-error";
import type { AuthenticatedRequest } from "../../types/auth.types";
import { successResponse } from "../../utils/response";

import * as ordersService from "./orders.service";
import {
  addOrderItemSchema,
  cancelOrderSchema,
  createOrderSchema,
  dispatchOrderSchema,
  listOrdersQuerySchema,
  orderItemParamsSchema,
  orderParamsSchema,
  tenantParamsSchema,
  updateOrderItemSchema,
  updateOrderSchema,
  type AddOrderItemInput,
  type CancelOrderInput,
  type CreateOrderInput,
  type DispatchOrderInput,
  type ListOrdersQuery,
  type OrderItemParams,
  type OrderParams,
  type TenantParams,
  type UpdateOrderInput,
  type UpdateOrderItemInput,
} from "./orders.validation";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListOrdersQuery>(listOrdersQuerySchema, req.query);

    const result = await ordersService.getOrders(params.tenantId, query, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);

    const result = await ordersService.getOrderById(
      params.tenantId,
      params.orderId,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreateOrderInput>(createOrderSchema, req.body);

    const result = await ordersService.createOrder(
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

export const updateOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);
    const input = parseOrThrow<UpdateOrderInput>(updateOrderSchema, req.body);

    const result = await ordersService.updateOrder(
      params.tenantId,
      params.orderId,
      input,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const confirmOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);

    const result = await ordersService.confirmOrder(
      params.tenantId,
      params.orderId,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const packOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);

    const result = await ordersService.packOrder(
      params.tenantId,
      params.orderId,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const dispatchOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);
    const input = parseOrThrow<DispatchOrderInput>(dispatchOrderSchema, req.body);

    const result = await ordersService.dispatchOrder(
      params.tenantId,
      params.orderId,
      input,
      authReq.user.userId,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);
    const input = parseOrThrow<CancelOrderInput>(cancelOrderSchema, req.body);

    const result = await ordersService.cancelOrder(
      params.tenantId,
      params.orderId,
      input,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const addOrderItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);
    const input = parseOrThrow<AddOrderItemInput>(addOrderItemSchema, req.body);

    const result = await ordersService.addOrderItem(
      params.tenantId,
      params.orderId,
      input,
      authReq.user,
    );
    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateOrderItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderItemParams>(orderItemParamsSchema, req.params);
    const input = parseOrThrow<UpdateOrderItemInput>(updateOrderItemSchema, req.body);

    const result = await ordersService.updateOrderItem(
      params.tenantId,
      params.orderId,
      params.itemId,
      input,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const removeOrderItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderItemParams>(orderItemParamsSchema, req.params);

    const result = await ordersService.removeOrderItem(
      params.tenantId,
      params.orderId,
      params.itemId,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getOverdueOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);

    const result = await ordersService.getOverdueOrders(params.tenantId, authReq.user);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getDispatchSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderParams>(orderParamsSchema, req.params);

    const result = await ordersService.getDispatchSummary(
      params.tenantId,
      params.orderId,
      authReq.user,
    );
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
