import type {NextFunction, Request, Response } from 'express';
import { isAppError } from '../common/errors/app-error.ts';

// Global error handler middleware
export const errorHandler = (
	err: any,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
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

	console.error('Unhandled error:', err);

	res.status(500).json({
		success: false,
		error: {
			code: 'INTERNAL_SERVER_ERROR',
			message: 'An unexpected error occurred',
			details: null,
		},
	});
};
