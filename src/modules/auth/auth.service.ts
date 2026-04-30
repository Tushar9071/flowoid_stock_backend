import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";

import {
  AppError,
  forbiddenError,
  unauthorizedError,
  validationError,
} from "../../common/errors/app-error";
import {
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_SECRET,
  REFRESH_TOKEN_TTL_SECONDS,
} from "../../config/auth";
import prisma from "../../lib/prisma";
import { comparePassword, hashPassword } from "../../utils/password";
import type { JwtPayload } from "../../types/auth.types";
import { areTokenHashesEqual, hashToken } from "../../utils/auth";

// ─── Types ───────────────────────────────────────────────────────

type RequestContext = {
  ipAddress?: string;
  userAgent?: string;
};

type PublicUser = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: string;
};

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  accessTokenMaxAgeMs: number;
  refreshTokenMaxAgeMs: number;
};

type LoginInput = {
  email?: string;
  phone?: string;
  password: string;
};

type RegisterInput = {
  name: string;
  email?: string;
  phone: string;
  password: string;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

type RefreshPayload = JwtPayload & {
  jti: string;
};

// ─── Constants ───────────────────────────────────────────────────

const ACCESS_TOKEN_MAX_AGE_MS = ACCESS_TOKEN_TTL_SECONDS * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = REFRESH_TOKEN_TTL_SECONDS * 1000;

const USER_PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: { select: { id: true, name: true } },
  isActive: true,
} as const;

const USER_WITH_PASSWORD_SELECT = {
  ...USER_PROFILE_SELECT,
  passwordHash: true,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────

const toPublicUser = (user: {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: { id: string; name: string } | null;
}): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role?.name ?? "UNKNOWN",
});

const buildLoginIdentifier = (
  input: LoginInput,
): { phone?: string; email?: string } => {
  const phone = input.phone?.trim();
  const email = input.email?.trim();

  if (!phone && !email) {
    throw validationError("Either phone or email is required for login");
  }

  return phone ? { phone } : { email };
};

const revokeSessionTokens = async (
  sessionId: string,
  reason: string,
): Promise<void> => {
  await prisma.authRefreshToken.updateMany({
    where: { sessionId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
};

const revokeUserRefreshTokens = async (
  userId: string,
  reason: string,
): Promise<void> => {
  await prisma.authRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
};

const issueTokensForUser = async (
  payload: JwtPayload,
  context: RequestContext,
  sessionId: string = randomUUID(),
): Promise<TokenBundle> => {
  const tokenId = randomUUID();
  const accessTokenExpiresAt = new Date(Date.now() + ACCESS_TOKEN_MAX_AGE_MS);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

  const tokenPayload: JwtPayload = {
    userId: payload.userId,
    role: payload.role,
    sessionId,
  };

  const accessToken = jwt.sign(tokenPayload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  });

  const refreshToken = jwt.sign(tokenPayload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    jwtid: tokenId,
  });

  await prisma.authRefreshToken.create({
    data: {
      id: tokenId,
      userId: payload.userId,
      tokenHash: hashToken(refreshToken),
      sessionId,
      userAgent: context.userAgent,
      ipAddress: context.ipAddress,
      expiresAt: refreshTokenExpiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenId: tokenId,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    accessTokenMaxAgeMs: ACCESS_TOKEN_MAX_AGE_MS,
    refreshTokenMaxAgeMs: REFRESH_TOKEN_MAX_AGE_MS,
  };
};

const verifyRefreshToken = (token: string): RefreshPayload => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw unauthorizedError(
        "Refresh token has expired",
        "REFRESH_TOKEN_EXPIRED",
      );
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw unauthorizedError(
        "Refresh token is invalid",
        "INVALID_REFRESH_TOKEN",
      );
    }
    throw error;
  }
};

const purgeExpiredTokens = async (userId?: string): Promise<void> => {
  await prisma.authRefreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
};

// ─── Public API ──────────────────────────────────────────────────

export const register = async (
  input: RegisterInput,
  context: RequestContext,
): Promise<{ token: string; user: PublicUser; tokens: TokenBundle }> => {
  // Check if phone already exists
  const existingUser = await prisma.user.findUnique({
    where: { phone: input.phone },
  });

  if (existingUser) {
    throw validationError("A user with this phone number already exists");
  }

  // Check if email already exists (if provided)
  if (input.email) {
    const existingEmail = await prisma.user.findFirst({
      where: { email: input.email },
    });
    if (existingEmail) {
      throw validationError("A user with this email already exists");
    }
  }

  // Find the default role
  const defaultRole = await prisma.role.findFirst({
    where: { isDefault: true },
  });
  if (!defaultRole) {
    throw validationError("No default role is configured in the system");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email || null,
      phone: input.phone,
      passwordHash,
      roleId: defaultRole.id,
    },
    select: USER_PROFILE_SELECT,
  });

  const sessionId = randomUUID();
  const jwtPayload: JwtPayload = {
    userId: user.id,
    role: user.role?.name ?? "UNKNOWN",
    sessionId,
  };

  const tokens = await issueTokensForUser(jwtPayload, context, sessionId);

  return {
    token: tokens.accessToken,
    user: toPublicUser(user),
    tokens,
  };
};

export const login = async (
  input: LoginInput,
  context: RequestContext,
): Promise<{ token: string; user: PublicUser; tokens: TokenBundle }> => {
  const identifier = buildLoginIdentifier(input);

  const user = await prisma.user.findFirst({
    where: identifier,
    select: USER_WITH_PASSWORD_SELECT,
  });

  if (!user) {
    throw unauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw forbiddenError("User account is inactive", "USER_INACTIVE");
  }

  const passwordMatches = await comparePassword(
    input.password,
    user.passwordHash,
  );
  if (!passwordMatches) {
    throw unauthorizedError("Invalid credentials", "INVALID_CREDENTIALS");
  }

  await purgeExpiredTokens(user.id);

  const sessionId = randomUUID();
  const jwtPayload: JwtPayload = {
    userId: user.id,
    role: user.role?.name ?? "UNKNOWN",
    sessionId,
  };

  const tokens = await issueTokensForUser(jwtPayload, context, sessionId);

  return {
    token: tokens.accessToken,
    user: toPublicUser(user),
    tokens,
  };
};

export const refreshSession = async (
  refreshToken: string,
  context: RequestContext,
): Promise<{ token: string; user: PublicUser; tokens: TokenBundle }> => {
  const payload = verifyRefreshToken(refreshToken);

  const storedToken = await prisma.authRefreshToken.findUnique({
    where: { id: payload.jti },
    include: {
      user: { select: USER_PROFILE_SELECT },
    },
  });

  if (!storedToken) {
    throw unauthorizedError(
      "Refresh token is invalid",
      "INVALID_REFRESH_TOKEN",
    );
  }

  // Validate token integrity
  const providedHash = hashToken(refreshToken);
  if (
    storedToken.userId !== payload.userId ||
    storedToken.sessionId !== payload.sessionId ||
    !areTokenHashesEqual(storedToken.tokenHash, providedHash)
  ) {
    await revokeSessionTokens(storedToken.sessionId, "refresh_token_mismatch");
    throw unauthorizedError(
      "Refresh token is invalid",
      "INVALID_REFRESH_TOKEN",
    );
  }

  // Detect reuse
  if (storedToken.revokedAt) {
    await revokeSessionTokens(
      storedToken.sessionId,
      "refresh_token_reuse_detected",
    );
    throw new AppError(
      401,
      "Refresh token has already been used",
      "REFRESH_TOKEN_REUSED",
    );
  }

  if (storedToken.expiresAt <= new Date()) {
    await revokeSessionTokens(storedToken.sessionId, "refresh_token_expired");
    throw unauthorizedError(
      "Refresh token has expired",
      "REFRESH_TOKEN_EXPIRED",
    );
  }

  if (!storedToken.user.isActive) {
    await revokeSessionTokens(
      storedToken.sessionId,
      "inactive_user_refresh_attempt",
    );
    throw forbiddenError("User account is inactive", "USER_INACTIVE");
  }

  const jwtPayload: JwtPayload = {
    userId: storedToken.user.id,
    role: storedToken.user.role?.name ?? "UNKNOWN",
    sessionId: storedToken.sessionId,
  };

  const tokens = await issueTokensForUser(
    jwtPayload,
    {
      userAgent: context.userAgent ?? storedToken.userAgent ?? undefined,
      ipAddress: context.ipAddress ?? storedToken.ipAddress ?? undefined,
    },
    storedToken.sessionId,
  );

  // Revoke old token (rotation)
  await prisma.authRefreshToken.update({
    where: { id: storedToken.id },
    data: {
      revokedAt: new Date(),
      revokedReason: "rotated",
      replacedByTokenId: tokens.refreshTokenId,
    },
  });

  return {
    token: tokens.accessToken,
    user: toPublicUser(storedToken.user),
    tokens,
  };
};

export const logout = async (refreshToken?: string): Promise<void> => {
  if (!refreshToken) return;

  await prisma.authRefreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: "logout" },
  });
};

export const getMe = async (userId: string): Promise<PublicUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PROFILE_SELECT,
  });

  if (!user) {
    throw unauthorizedError("User account was not found", "USER_NOT_FOUND");
  }

  if (!user.isActive) {
    throw forbiddenError("User account is inactive", "USER_INACTIVE");
  }

  return toPublicUser(user);
};

export const changePassword = async (
  userId: string,
  input: ChangePasswordInput,
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_WITH_PASSWORD_SELECT,
  });

  if (!user) {
    throw unauthorizedError("User account was not found", "USER_NOT_FOUND");
  }

  if (!user.isActive) {
    throw forbiddenError("User account is inactive", "USER_INACTIVE");
  }

  const passwordMatches = await comparePassword(
    input.currentPassword,
    user.passwordHash,
  );
  if (!passwordMatches) {
    throw unauthorizedError(
      "Current password is incorrect",
      "INVALID_CREDENTIALS",
    );
  }

  const isSamePassword = await comparePassword(
    input.newPassword,
    user.passwordHash,
  );
  if (isSamePassword) {
    throw validationError(
      "New password must be different from the current password",
    );
  }

  const newPasswordHash = await hashPassword(input.newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.authRefreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: "password_changed" },
    }),
  ]);
};

export const getMyPermissions = async (userId: string): Promise<string[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw unauthorizedError("User account was not found", "USER_NOT_FOUND");
  }

  if (!user.isActive) {
    throw forbiddenError("User account is inactive", "USER_INACTIVE");
  }

  if (!user.role) {
    return [];
  }

  if (user.role.name === "SUPER_ADMIN") {
    const allPermissions = await prisma.permission.findMany();
    return allPermissions.map((p) => p.code);
  }

  return user.role.permissions.map((rp) => rp.permission.code);
};

export const revokeAllSessionsForUser = revokeUserRefreshTokens;
