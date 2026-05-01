import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { ACCESS_TOKEN_SECRET } from "../config/auth";
import type { JwtPayload } from "../types/auth.types";
import { getMetricsSnapshot } from "../modules/monitoring/monitoring.service";

const MONITORING_INTERVAL_MS = 5000;

const parseCookieToken = (cookieHeader?: string): string | undefined => {
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const accessTokenCookie = cookies.find((cookie) => cookie.startsWith("accessToken="));

  return accessTokenCookie ? decodeURIComponent(accessTokenCookie.split("=")[1] || "") : undefined;
};

const getSocketToken = (socket: any): string | undefined => {
  const authToken = socket.handshake.auth?.token;
  const bearerToken = socket.handshake.headers.authorization;

  if (typeof authToken === "string" && authToken.trim()) {
    return authToken.trim();
  }

  if (typeof bearerToken === "string" && bearerToken.startsWith("Bearer ")) {
    return bearerToken.slice("Bearer ".length).trim();
  }

  return parseCookieToken(socket.handshake.headers.cookie);
};

export const initializeMonitoringSocket = (server: HttpServer): Server => {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  const monitoringNamespace = io.of("/admin-monitoring");

  monitoringNamespace.use((socket, next) => {
    try {
      const token = getSocketToken(socket);

      if (!token) {
        return next(new Error("Missing authentication token"));
      }

      const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as JwtPayload;

      if (payload.role !== "SUPER_ADMIN") {
        return next(new Error("Only admins can access system monitoring"));
      }

      socket.data.user = payload;
      next();
    } catch (error) {
      next(new Error("Invalid authentication token"));
    }
  });

  monitoringNamespace.on("connection", async (socket) => {
    socket.emit("metrics:update", await getMetricsSnapshot());

    const intervalId = setInterval(async () => {
      socket.emit("metrics:update", await getMetricsSnapshot());
    }, MONITORING_INTERVAL_MS);

    socket.on("metrics:refresh", async () => {
      socket.emit("metrics:update", await getMetricsSnapshot());
    });

    socket.on("disconnect", () => {
      clearInterval(intervalId);
    });
  });

  return io;
};
