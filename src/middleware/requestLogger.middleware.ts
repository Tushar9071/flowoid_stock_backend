import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import logger from "../utils/logger";
import type { AuthenticatedRequest } from "../types/auth.types";

type RequestWithId = Request & { requestId?: string };

const SKIPPED_PATHS = new Set(["/health", "/favicon.ico"]);

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (SKIPPED_PATHS.has(req.path)) {
    next();
    return;
  }

  const requestId = req.header("X-Request-Id") || randomUUID();
  const startedAt = process.hrtime.bigint();

  (req as RequestWithId).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const duration = Number((process.hrtime.bigint() - startedAt) / BigInt(1_000_000));
    const userId = (req as AuthenticatedRequest).user?.userId;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    logger.log(level, "HTTP request completed", {
      category: "http",
      requestId,
      userId,
      ip: req.ip,
      endpoint: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      meta: {
        method: req.method,
        url: req.originalUrl,
        responseTimeMs: duration,
        userAgent: req.get("user-agent"),
      },
    });
  });

  next();
};
