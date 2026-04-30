import { createHash, timingSafeEqual } from 'crypto';

/**
 * SHA-256 hash a token string for secure storage.
 */
export const hashToken = (token: string): string => {
	return createHash('sha256').update(token).digest('hex');
};

/**
 * Timing-safe comparison of two hex-encoded token hashes.
 */
export const areTokenHashesEqual = (a: string, b: string): boolean => {
	if (a.length !== b.length) return false;
	return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
};
