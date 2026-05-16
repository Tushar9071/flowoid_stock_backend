import crypto from "crypto";
import axios from "axios";
import { Logger } from "@nestjs/common";

import { AppError, forbiddenError, notFoundError, validationError } from "../../common/errors/app-error";
import prisma from "../../lib/prisma";
import type {
  SaveWhatsappConfigInput,
  UpdateWhatsappAccessTokenInput,
} from "./whatsapp.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

const logger = new Logger("WhatsappConfigService");

const getApiVersion = (): string => process.env.WHATSAPP_API_VERSION || "v19.0";

const serviceUnavailableError = (message: string, details?: unknown): AppError =>
  new AppError(503, message, "WHATSAPP_META_API_FAILED", details);

const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.length !== 32) {
    throw new AppError(
      500,
      "ENCRYPTION_SECRET must be set to a 32-character string",
      "WHATSAPP_ENCRYPTION_NOT_CONFIGURED",
    );
  }
  return Buffer.from(secret, "utf8");
};

export const encryptAccessToken = (plainText: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}${encrypted.toString("hex")}`;
};

export const decryptAccessToken = (cipherText: string | null): string | null => {
  if (!cipherText) return null;
  const [ivHex, payloadHex] = cipherText.split(":");
  if (!ivHex || !payloadHex || payloadHex.length <= 32) {
    throw new AppError(500, "Stored WhatsApp token is invalid", "WHATSAPP_TOKEN_INVALID");
  }
  const tagHex = payloadHex.slice(0, 32);
  const encryptedHex = payloadHex.slice(32);

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
};

export const assertTenantAccess = async (tenantId: string, currentUser: CurrentUser) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });

  if (!tenant) {
    throw notFoundError("Tenant not found");
  }

  if (currentUser.role === "SUPER_ADMIN") {
    return tenant;
  }

  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId, userId: currentUser.userId, isActive: true },
    select: { id: true },
  });

  if (!membership) {
    throw forbiddenError("You do not have access to this tenant");
  }

  return tenant;
};

export const assertWhatsappConfigAdmin = async (tenantId: string, currentUser: CurrentUser) => {
  await assertTenantAccess(tenantId, currentUser);
  if (currentUser.role === "SUPER_ADMIN" || currentUser.role === "TENANT_OWNER") {
    return;
  }
  throw forbiddenError("Only SUPER_ADMIN or TENANT_OWNER can manage WhatsApp configuration");
};

export const getConfig = async (tenantId: string, currentUser: CurrentUser) => {
  await assertTenantAccess(tenantId, currentUser);
  const config = await prisma.tenantWhatsappConfig.findUnique({ where: { tenantId } });
  if (!config) return null;
  return { ...config, accessToken: decryptAccessToken(config.accessToken) };
};

export const getMaskedConfig = async (tenantId: string, currentUser: CurrentUser) => {
  const config = await getConfig(tenantId, currentUser);
  if (!config) return null;
  const token = config.accessToken;
  return {
    ...config,
    accessToken: token ? `********${token.slice(-4)}` : null,
  };
};

export const saveConfig = async (
  tenantId: string,
  input: SaveWhatsappConfigInput,
  currentUser: CurrentUser,
) => {
  await assertWhatsappConfigAdmin(tenantId, currentUser);
  const encryptedToken = encryptAccessToken(input.accessToken);

  const config = await prisma.tenantWhatsappConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      provider: input.provider,
      isEnabled: input.isEnabled ?? false,
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      accessToken: encryptedToken,
      fromPhoneNumber: input.fromPhoneNumber,
      invoiceTemplateName: input.invoiceTemplateName,
      paymentReceiptTemplateName: input.paymentReceiptTemplateName,
      challansTemplateName: input.challansTemplateName,
    },
    update: {
      provider: input.provider,
      isEnabled: input.isEnabled,
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      accessToken: encryptedToken,
      fromPhoneNumber: input.fromPhoneNumber,
      invoiceTemplateName: input.invoiceTemplateName,
      paymentReceiptTemplateName: input.paymentReceiptTemplateName,
      challansTemplateName: input.challansTemplateName,
    },
  });

  return { ...config, accessToken: "********" };
};

export const updateAccessToken = async (
  tenantId: string,
  input: UpdateWhatsappAccessTokenInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);

  const existingConfig = await prisma.tenantWhatsappConfig.findUnique({
    where: { tenantId },
    select: { id: true },
  });

  if (!existingConfig) {
    throw notFoundError("WhatsApp configuration not found for this tenant");
  }

  const config = await prisma.tenantWhatsappConfig.update({
    where: { tenantId },
    data: { accessToken: encryptAccessToken(input.accessToken) },
  });

  return { ...config, accessToken: "********" };
};

export const getEnabledConfigOrThrow = async (tenantId: string) => {
  const config = await prisma.tenantWhatsappConfig.findUnique({ where: { tenantId } });
  if (!config || !config.isEnabled) {
    throw validationError("WhatsApp not configured for this tenant");
  }
  if (!config.phoneNumberId || !config.wabaId || !config.accessToken) {
    throw validationError("WhatsApp configuration is incomplete");
  }
  return { ...config, accessToken: decryptAccessToken(config.accessToken) || "" };
};

export const testConnection = async (tenantId: string, currentUser: CurrentUser) => {
  await assertWhatsappConfigAdmin(tenantId, currentUser);
  const config = await getEnabledConfigOrThrow(tenantId);

  try {
    logger.log(`Testing WhatsApp connection for tenant ${tenantId}`);
    const response = await axios.get(
      `https://graph.facebook.com/${getApiVersion()}/${config.phoneNumberId}`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    const metaMessage = error?.response?.data?.error?.message || error.message || "Meta API failed";
    logger.error(`WhatsApp connection test failed for tenant ${tenantId}: ${metaMessage}`);
    throw serviceUnavailableError(metaMessage, error?.response?.data);
  }
};
