import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../types/auth.types";
import { forbiddenError } from "../../common/errors/app-error";
import { successResponse } from "../../utils/response";
import { getMetricsSnapshot } from "./monitoring.service";

const assertAdmin = (req: Request): void => {
  const authReq = req as AuthenticatedRequest;

  if (authReq.user.role !== "SUPER_ADMIN") {
    throw forbiddenError("Only admins can access system monitoring");
  }
};

export const getMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    assertAdmin(req);
    const metrics = await getMetricsSnapshot();

    successResponse(res, metrics);
  } catch (error) {
    next(error);
  }
};
