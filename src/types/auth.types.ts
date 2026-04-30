import type { Request } from 'express';

export interface JwtPayload {
	userId: string;
	role: string;
	sessionId: string;
}

export interface AuthenticatedRequest extends Request {
	user: JwtPayload;
}
