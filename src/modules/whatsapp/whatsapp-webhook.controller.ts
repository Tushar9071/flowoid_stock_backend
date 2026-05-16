import type { NextFunction, Request, Response } from "express";

import { successResponse } from "../../utils/response";
import * as webhookService from "./whatsapp-webhook.service";

export const verifyWebhook = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  try {
    const challenge = webhookService.verifyWebhook(req.query);
    res.status(200).send(challenge);
  } catch (error) {
    next(error);
  }
};

export const receiveStatusUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await webhookService.handleStatusUpdate(req.body);
    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
