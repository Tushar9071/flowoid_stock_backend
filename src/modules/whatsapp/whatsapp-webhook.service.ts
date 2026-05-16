import { Logger } from "@nestjs/common";

import { unauthorizedError } from "../../common/errors/app-error";
import prisma from "../../lib/prisma";

const logger = new Logger("WhatsappWebhookService");

type MetaStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  errors?: Array<{ code?: number | string; title?: string; message?: string }>;
};

export const verifyWebhook = (query: Record<string, unknown>): string => {
  const mode = query["hub.mode"];
  const token = query["hub.verify_token"];
  const challenge = query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return String(challenge ?? "");
  }

  throw unauthorizedError("Invalid WhatsApp webhook verification token", "INVALID_WEBHOOK_TOKEN");
};

const extractStatuses = (body: any): MetaStatus[] => {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  return entries.flatMap((entry: any) =>
    (entry?.changes || []).flatMap((change: any) => change?.value?.statuses || []),
  );
};

export const handleStatusUpdate = async (body: unknown) => {
  const statuses = extractStatuses(body);
  const updated: string[] = [];

  for (const status of statuses) {
    if (!status.id || !status.status) continue;

    const timestamp = status.timestamp
      ? new Date(Number(status.timestamp) * 1000)
      : new Date();
    const data: any = {};

    switch (status.status) {
      case "sent":
        data.messageStatus = "SENT";
        data.sentAt = timestamp;
        break;
      case "delivered":
        data.messageStatus = "DELIVERED";
        data.deliveredAt = timestamp;
        break;
      case "read":
        data.messageStatus = "READ";
        data.readAt = timestamp;
        break;
      case "failed":
        data.messageStatus = "FAILED";
        data.failedAt = timestamp;
        data.errorCode = status.errors?.[0]?.code?.toString();
        data.errorMessage =
          status.errors?.[0]?.message || status.errors?.[0]?.title || "WhatsApp delivery failed";
        break;
      default:
        logger.warn(`Ignoring unsupported WhatsApp status ${status.status}`);
        continue;
    }

    const result = await prisma.whatsappMessageLog.updateMany({
      where: { providerMessageId: status.id },
      data,
    });

    if (result.count > 0) {
      updated.push(status.id);
    }
  }

  return { received: statuses.length, updated: updated.length };
};
