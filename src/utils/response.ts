import type {Response } from 'express';

export const successResponse = (
	res: Response,
	data: unknown,
	statusCode: number = 200,
): void => {
	res.status(statusCode).json({
		success: true,
		data,
	});
};

export const errorResponse = (
	res: Response,
	statusCode: number,
	code: string,
	message: string,
	details?: unknown,
): void => {
	res.status(statusCode).json({
		success: false,
		error: { code, message, details: details ?? null },
	});
};
