import type { NextFunction, Request, Response } from "express";
import { forbiddenError, unauthorizedError } from "../../common/errors/app-error";
import type { AuthenticatedRequest } from "../../types/auth.types";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN"]);

export const requireAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    next(unauthorizedError("Authentication required", "UNAUTHORIZED"));
    return;
  }

  if (!ADMIN_ROLES.has(user.role)) {
    next(forbiddenError("Admin access required", "FORBIDDEN"));
    return;
  }

  next();
};
