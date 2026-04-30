import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { unauthorizedError, validationError } from '../../common/errors/app-error.ts';
import type { AuthenticatedRequest } from '../../types/auth.types.ts';
import { successResponse } from '../../utils/response.ts';
import * as authService from './auth.service.ts';

// ─── Validation Schemas ──────────────────────────────────────────

const registerSchema = z.object({
	name: z.string().trim().min(2, 'Name must be at least 2 characters'),
	email: z.string().email('Invalid email address').optional(),
	phone: z.string().trim().min(6, 'Phone must be at least 6 digits'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
	email: z.string().email().optional(),
	phone: z.string().trim().min(6, 'Phone must be at least 6 digits').optional(),
	password: z.string().min(8, 'Password must be at least 8 characters'),
}).refine(
	(data) => data.email || data.phone,
	{ message: 'Either email or phone is required', path: ['phone'] },
);

const changePasswordSchema = z.object({
	currentPassword: z.string().min(8, 'Current password must be at least 8 characters'),
	newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// ─── Helpers ─────────────────────────────────────────────────────

const getRequestContext = (req: Request) => ({
	userAgent: req.get('user-agent'),
	ipAddress: req.ip || req.socket.remoteAddress || undefined,
});

const parseOrThrow = <T>(schema: z.ZodSchema<T>, value: unknown): T => {
	const result = schema.safeParse(value);
	if (!result.success) {
		throw validationError('Request validation failed', result.error.flatten());
	}
	return result.data;
};

// ─── Route Handlers ──────────────────────────────────────────────

/**
 * Helper to set authentication cookies
 */
const setAuthCookies = (res: Response, tokens: any) => {
	res.cookie('accessToken', tokens.accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: tokens.accessTokenMaxAgeMs,
	});
	res.cookie('refreshToken', tokens.refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'strict',
		maxAge: tokens.refreshTokenMaxAgeMs,
	});
};

/**
 * Helper to clear authentication cookies
 */
const clearAuthCookies = (res: Response) => {
	res.clearCookie('accessToken');
	res.clearCookie('refreshToken');
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account
 * @access  PUBLIC
 */
export const register = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const input = parseOrThrow(registerSchema, req.body);
		const result = await authService.register(input, getRequestContext(req));

		setAuthCookies(res, result.tokens);

		successResponse(
			res,
			{
				user: result.user,
			},
			201,
		);
	} catch (error) {
		next(error);
	}
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user with email/phone + password, returns bearer tokens
 * @access  PUBLIC
 */
export const login = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const input = parseOrThrow(loginSchema, req.body);
		const result = await authService.login(input, getRequestContext(req));

		setAuthCookies(res, result.tokens);

		successResponse(res, {
			user: result.user,
		});
	} catch (error) {
		next(error);
	}
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Rotate refresh token and issue fresh access token
 * @access  PUBLIC (requires valid refresh token in body)
 */
export const refresh = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
		if (!refreshToken || typeof refreshToken !== 'string') {
			throw unauthorizedError(
				'Refresh token is required in request body',
				'MISSING_REFRESH_TOKEN',
			);
		}

		const result = await authService.refreshSession(refreshToken, getRequestContext(req));

		setAuthCookies(res, result.tokens);

		successResponse(res, {
			user: result.user,
		});
	} catch (error) {
		next(error);
	}
};

/**
 * @route   POST /api/auth/logout
 * @desc    Revoke the provided refresh token
 * @access  AUTHENTICATED
 */
export const logout = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
		await authService.logout(refreshToken);
		clearAuthCookies(res);
		successResponse(res, { message: 'Logged out successfully' });
	} catch (error) {
		next(error);
	}
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user's profile
 * @access  AUTHENTICATED
 */
export const getMe = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const user = await authService.getMe(authReq.user.userId);
		successResponse(res, user);
	} catch (error) {
		next(error);
	}
};

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for the authenticated user, revokes all sessions
 * @access  AUTHENTICATED
 */
export const changePassword = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const input = parseOrThrow(changePasswordSchema, req.body);
		await authService.changePassword(authReq.user.userId, input);
		clearAuthCookies(res);
		successResponse(res, {
			message: 'Password updated successfully. Please log in again.',
		});
	} catch (error) {
		next(error);
	}
};
export const getMyPermissions = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const permissions = await authService.getMyPermissions(authReq.user.userId);
		successResponse(res, permissions);
	} catch (error) {
		next(error);
	}
};
