import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { validationError } from "../../common/errors/app-error";
import type { AuthenticatedRequest } from "../../types/auth.types";

import * as documentsService from "./documents.service";

const tenantParamsSchema = z.object({
  tenantId: z.string().uuid("Tenant ID must be a valid UUID"),
});

const orderDocumentParamsSchema = tenantParamsSchema.extend({
  orderId: z.string().uuid("Order ID must be a valid UUID"),
});

const paymentDocumentParamsSchema = tenantParamsSchema.extend({
  paymentId: z.string().uuid("Payment ID must be a valid UUID"),
});

type OrderDocumentParams = z.infer<typeof orderDocumentParamsSchema>;
type PaymentDocumentParams = z.infer<typeof paymentDocumentParamsSchema>;

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

const sendPdf = (res: Response, pdfBuffer: Buffer, fileName: string): void => {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(pdfBuffer);
};

export const getInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderDocumentParams>(orderDocumentParamsSchema, req.params);
    const result = await documentsService.generateInvoice(
      params.tenantId,
      params.orderId,
      authReq.user.userId,
      authReq.user,
    );

    sendPdf(res, result.pdfBuffer, result.fileName);
  } catch (error) {
    next(error);
  }
};

export const getChallan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<OrderDocumentParams>(orderDocumentParamsSchema, req.params);
    const result = await documentsService.generateChallan(
      params.tenantId,
      params.orderId,
      authReq.user.userId,
      authReq.user,
    );

    sendPdf(res, result.pdfBuffer, result.fileName);
  } catch (error) {
    next(error);
  }
};

export const getPaymentReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PaymentDocumentParams>(
      paymentDocumentParamsSchema,
      req.params,
    );
    const result = await documentsService.generatePaymentReceipt(
      params.tenantId,
      params.paymentId,
      authReq.user.userId,
      authReq.user,
    );

    sendPdf(res, result.pdfBuffer, result.fileName);
  } catch (error) {
    next(error);
  }
};
