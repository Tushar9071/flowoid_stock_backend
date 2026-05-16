import axios from "axios";
import { Logger } from "@nestjs/common";

import { AppError } from "../../common/errors/app-error";
import { assertTenantAccess, getEnabledConfigOrThrow } from "./whatsapp-config.service";
import type { SubmitTemplateInput } from "./whatsapp.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

const logger = new Logger("WhatsappTemplateService");

const getApiVersion = (): string => process.env.WHATSAPP_API_VERSION || "v19.0";

const serviceUnavailableError = (message: string, details?: unknown): AppError =>
  new AppError(503, message, "WHATSAPP_META_API_FAILED", details);

const getMetaError = (error: any): { message: string; details?: unknown } => ({
  message: error?.response?.data?.error?.message || error?.message || "Meta API failed",
  details: error?.response?.data,
});

export const submitTemplate = async (
  tenantId: string,
  input: SubmitTemplateInput,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const config = await getEnabledConfigOrThrow(tenantId);

  try {
    logger.log(`Submitting WhatsApp template ${input.name} for tenant ${tenantId}`);
    const response = await axios.post(
      `https://graph.facebook.com/${getApiVersion()}/${config.wabaId}/message_templates`,
      {
        name: input.name,
        language: input.language,
        category: input.category,
        components: input.components,
      },
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    const metaError = getMetaError(error);
    logger.error(`WhatsApp template submit failed: ${metaError.message}`);
    throw serviceUnavailableError(metaError.message, metaError.details);
  }
};

export const getTemplateStatus = async (
  tenantId: string,
  templateName: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const config = await getEnabledConfigOrThrow(tenantId);

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${getApiVersion()}/${config.wabaId}/message_templates`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        params: { name: templateName },
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    const metaError = getMetaError(error);
    logger.error(`WhatsApp template status fetch failed: ${metaError.message}`);
    throw serviceUnavailableError(metaError.message, metaError.details);
  }
};

export const listTemplates = async (tenantId: string, currentUser: CurrentUser) => {
  await assertTenantAccess(tenantId, currentUser);
  const config = await getEnabledConfigOrThrow(tenantId);

  try {
    const response = await axios.get(
      `https://graph.facebook.com/${getApiVersion()}/${config.wabaId}/message_templates`,
      {
        headers: { Authorization: `Bearer ${config.accessToken}` },
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error: any) {
    const metaError = getMetaError(error);
    logger.error(`WhatsApp template list failed: ${metaError.message}`);
    throw serviceUnavailableError(metaError.message, metaError.details);
  }
};
