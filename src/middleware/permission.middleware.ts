import type { NextFunction, Request, Response } from "express";
import {
  forbiddenError,
  unauthorizedError,
} from "../common/errors/app-error.ts";
import prisma from "../lib/prisma.ts";
import type { AuthenticatedRequest } from "../types/auth.types.ts";

export const requirePermission = (permissionCode: string) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const user = authReq.user;

      if (!user) {
        throw unauthorizedError("Authentication required", "UNAUTHORIZED");
      }

      if (user.role === "SUPER_ADMIN") {
        return next();
      }

      const role = await prisma.role.findFirst({
        where: { name: user.role, isActive: true },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!role) {
        throw forbiddenError("Role not found or inactive", "FORBIDDEN");
      }

      const hasPermission = role.permissions.some(
        (rp) => rp.permission.code === permissionCode,
      );

      if (!hasPermission) {
        throw forbiddenError(
          `Missing required permission: ${permissionCode}`,
          "FORBIDDEN",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
