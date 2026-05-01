import type { NextFunction, Request, Response } from "express";
import { recordApiRequestEnd, recordApiRequestStart } from "../modules/monitoring/monitoring.service";

export const collectApiMetrics = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startedAt = recordApiRequestStart();

  res.on("finish", () => {
    const route = req.route?.path ? `${req.method} ${req.baseUrl}${req.route.path}` : `${req.method} ${req.path}`;
    recordApiRequestEnd(startedAt, res.statusCode, route);
  });

  next();
};
