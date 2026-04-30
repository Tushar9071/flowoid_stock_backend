import type {NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { unauthorizedError } from '../common/errors/app-error.ts';
import { ACCESS_TOKEN_SECRET } from '../config/auth.ts';
import type { AuthenticatedRequest, JwtPayload } from '../types/auth.types.ts';
import { log } from 'console';

/**
 * Middleware that validates a Bearer token from the Authorization header.
 * On success, attaches `req.user` with the decoded JWT payload.
 */
export const requireAuth = (
	req: Request,
	_res: Response,
	next: NextFunction,
): void => {
	try {

		const authHeader = req.header('authorization');
		const cookieToken = req.cookies?.accessToken;

		let token = '';
		
		if (authHeader?.startsWith('Bearer ')) {
			token = authHeader.slice('Bearer '.length).trim();
		} else if (cookieToken) {
			token = cookieToken;
		} else {
			throw unauthorizedError(
				'Missing authentication token. Provide Bearer token or accessToken cookie.',
				'MISSING_ACCESS_TOKEN',
			);
		}

		if (!token) {
			throw unauthorizedError(
				'Access token is empty',
				'MISSING_ACCESS_TOKEN',
			);
		}

		const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;
		

		(req as AuthenticatedRequest).user = {
			userId: decoded.userId,
			role: decoded.role,
			sessionId: decoded.sessionId,
		};

		next();
	} catch (error: any) {
		if (error?.name === 'TokenExpiredError') {
			return next(unauthorizedError('Access token has expired', 'ACCESS_TOKEN_EXPIRED'));
		}
		if (error?.name === 'JsonWebTokenError') {
			return next(unauthorizedError('Access token is invalid', 'INVALID_ACCESS_TOKEN'));
		}
		next(error);
	}
};
