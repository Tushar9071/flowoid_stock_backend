import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import type { Application } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import swaggerSpec from "./config/swagger";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import roleRoutes from "./modules/role/role.routes";
import permissionRoutes from "./modules/permission/permission.routes";

const app: Application = express();

// Swagger UI - registered before helmet() so CSP headers don't block its JS bundles
app.get("/api/docs-json", (_req, res) => {
  res.json(swaggerSpec);
});

app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "Ayanshi BMS API Docs",
    customCss: ".swagger-ui .topbar { background-color: #0F3460; }",
    swaggerOptions: {
      persistAuthorization: true,
    },
  }),
);

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin ?? true);
    },
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

// Routes
app.get("/health", (req, res) => {
  res.status(200).json({ message: "OK new update" });
});

app.use("/api/auth", authRoutes);

// Future protected routes go here:
// app.use('/api/users', requireAuth, userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);

// Global error handler - always last
app.use(errorHandler);

export default app;
