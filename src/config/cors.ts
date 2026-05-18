import type { CorsOptions } from "cors";

const parseOrigins = (value?: string) =>
  value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const isProduction = process.env.NODE_ENV === "production";

export const allowedCorsOrigins = parseOrigins(process.env.CORS_ORIGINS);

export const isOriginAllowed = (origin?: string): boolean => {
  if (!isProduction) return true;

  if (!origin) return true;

  return allowedCorsOrigins.includes(origin);
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin) ? origin ?? true : false);
  },
  credentials: true,
};

export const socketCorsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
    callback(null, isOriginAllowed(origin));
  },
  credentials: true,
};
