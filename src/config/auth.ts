// JWT & cookie configuration — all values read from env at startup

const parseDuration = (value: string | undefined, defaultMs: number): number => {
	if (!value) return defaultMs;
	const match = value.match(/^(\d+)(s|m|h|d)$/);
	if (!match) return defaultMs;
	const n = parseInt(match[1], 10);
	const unit = match[2];
	switch (unit) {
		case 's': return n;
		case 'm': return n * 60;
		case 'h': return n * 3600;
		case 'd': return n * 86400;
		default:  return defaultMs;
	}
};

export const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'change-me';
export const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh';

export const ACCESS_TOKEN_TTL_SECONDS = parseDuration(process.env.JWT_ACCESS_EXPIRES_IN, 1800);   // default 30m
export const REFRESH_TOKEN_TTL_SECONDS = parseDuration(process.env.JWT_REFRESH_EXPIRES_IN, 604800); // default 7d

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
export const AUTH_COOKIE_SAME_SITE: 'lax' | 'strict' | 'none' =
	(process.env.AUTH_COOKIE_SAME_SITE as any) || 'lax';
export const AUTH_COOKIE_DOMAIN = process.env.AUTH_COOKIE_DOMAIN || undefined;
