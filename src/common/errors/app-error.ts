export class AppError extends Error {
	public readonly statusCode: number;
	public readonly code: string;
	public readonly details?: any;

	constructor(
		statusCode: number,
		message: string,
		code: string = 'INTERNAL_SERVER_ERROR',
		details?: unknown,
	) {
		super(message);
		this.name = 'AppError';
		this.statusCode = statusCode;
		this.code = code;
		this.details = details;
	}
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;

export const unauthorizedError = (
	message: string = 'Authentication is required',
	code: string = 'UNAUTHORIZED',
) => new AppError(401, message, code);

export const forbiddenError = (
	message: string = 'You do not have permission to perform this action',
	code: string = 'FORBIDDEN',
) => new AppError(403, message, code);

export const validationError = (
	message: string,
	details?: unknown,
	code: string = 'VALIDATION_ERROR',
) => new AppError(400, message, code, details);

export const notFoundError = (
	message: string = 'Resource not found',
	code: string = 'NOT_FOUND',
) => new AppError(404, message, code);
