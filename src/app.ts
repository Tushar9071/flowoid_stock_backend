import express from "express";
import type { Application } from "express";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger";

import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import fs from "fs/promises";
import path from "path";

import { errorHandler } from "./middleware/error.middleware";
import { collectApiMetrics } from "./middleware/metrics.middleware";
import { requestLogger } from "./middleware/requestLogger.middleware";
import prisma from "./lib/prisma";
import { BACKUP_DIR, getBackupStatus } from "./modules/admin/backup.service";

//all routes import statement here
import authRoutes from "./modules/auth/auth.routes";
import roleRoutes from "./modules/role/role.routes";
import permissionRoutes from "./modules/permission/permission.routes";
import tenantRoutes from "./modules/tenant/tenant.routes";
import monitoringRoutes from "./modules/monitoring/monitoring.routes";
import partiesRoute from "./modules/Parties/Parties.route";
import userRoutes from "./modules/user/user.routes";
import rawMaterialRoutes from "./modules/rawMaterial/rawMaterial.routes";
import designsRoutes from "./modules/designs/designs.routes";
import supplementaryRoutes from "./modules/supplementary/supplementary.routes";
import workersRoutes from "./modules/workers/workers.routes";
import assignmentsRoutes from "./modules/assignments/assignments.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import ordersRoutes from "./modules/orders/orders.routes";
import paymentsRoutes from "./modules/payments/payments.routes";
import documentsRoutes from "./modules/documents/documents.routes";
import whatsappRoutes from "./modules/whatsapp/whatsapp.routes";
import whatsappWebhookRoutes from "./modules/whatsapp/whatsapp-webhook.routes";
import * as whatsappWebhookController from "./modules/whatsapp/whatsapp-webhook.controller";
import adminRoutes from "./modules/admin/admin.routes";



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
app.use(collectApiMetrics);
app.use(requestLogger);

const getDirectorySize = async (directory: string): Promise<number> => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const sizes = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          return getDirectorySize(entryPath);
        }
        const stat = await fs.stat(entryPath);
        return stat.size;
      }),
    );
    return sizes.reduce((sum, size) => sum + size, 0);
  } catch {
    return 0;
  }
};

const formatBytes = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

// Routes
app.get("/health", async (_req, res) => {
  let database: "connected" | "disconnected" = "connected";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "disconnected";
  }

  const [backupStatus, backupsDirSize, logsDirSize] = await Promise.all([
    getBackupStatus(),
    getDirectorySize(BACKUP_DIR),
    getDirectorySize(path.resolve(process.cwd(), "logs")),
  ]);

  const memory = process.memoryUsage();

  res.status(database === "connected" ? 200 : 503).json({
    status: database === "connected" ? "ok" : "degraded",
    uptime: Math.floor(process.uptime()),
    database,
    lastBackup: backupStatus.lastBackupTime,
    lastBackupStatus: backupStatus.status,
    diskSpace: {
      backupsDir: formatBytes(backupsDirSize),
      logsDir: formatBytes(logsDirSize),
    },
    memory: {
      used: formatBytes(memory.heapUsed),
      total: formatBytes(memory.heapTotal),
    },
  });
});

app.use("/api/auth", authRoutes);
// Future protected routes go here:
app.use("/api/tenants", tenantRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/permissions", permissionRoutes);
app.use("/api/tenants/:tenantId/parties", partiesRoute);
app.use("/api/tenants/:tenantId/raw-materials", rawMaterialRoutes);
app.use("/api/tenants/:tenantId/designs", designsRoutes);
app.use("/api/tenants/:tenantId/supplementary", supplementaryRoutes);
app.use("/api/tenants/:tenantId/workers", workersRoutes);
app.use("/api/tenants/:tenantId/assignments", assignmentsRoutes);
app.use("/api/tenants/:tenantId/inventory", inventoryRoutes);
app.use("/api/tenants/:tenantId/orders", ordersRoutes);
app.use("/api/tenants/:tenantId/payments", paymentsRoutes);
app.use("/api/tenants/:tenantId/documents", documentsRoutes);
app.use("/api/tenants/:tenantId/whatsapp", whatsappRoutes);
app.use("/api/admin", adminRoutes);
app.use("/admin", adminRoutes);
app.get("/api/whatsapp/webhook", whatsappWebhookController.verifyWebhook);
app.post("/api/whatsapp/webhook", whatsappWebhookController.receiveStatusUpdate);
app.use("/webhooks", whatsappWebhookRoutes);

// Global error handler - always last
app.use(errorHandler);

export default app;
