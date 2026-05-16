import type {NextFunction, Request, Response } from 'express';
import { isAppError } from '../common/errors/app-error';
import type { AuthenticatedRequest } from '../types/auth.types';
import logger from '../utils/logger';

// Global error handler middleware
export const errorHandler = (
	err: any,
	req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	const authReq = req as AuthenticatedRequest;
	const requestId = (req as Request & { requestId?: string }).requestId;
	const userId = authReq.user?.userId;

	logger.error(err?.message || 'Unhandled error', {
		category: 'system',
		requestId,
		userId,
		endpoint: req.originalUrl,
		statusCode: isAppError(err) ? err.statusCode : 500,
		meta: {
			method: req.method,
			code: err?.code,
			stack: err?.stack,
			details: err?.details,
		},
	});

	if (isAppError(err)) {
		res.status(err.statusCode).json({
			success: false,
			error: {
				code: err.code,
				message: err.message,
				details: err.details ?? null,
			},
		});
		return;
	}

	res.status(500).json({
		success: false,
		error: {
			code: 'INTERNAL_SERVER_ERROR',
			message: 'An unexpected error occurred',
			details: process.env.NODE_ENV === 'production' ? null : err?.stack ?? null,
		},
	});
};
