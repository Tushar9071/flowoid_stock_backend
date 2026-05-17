import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import { Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { AppError, notFoundError, validationError } from "../../common/errors/app-error";
import prisma from "../../lib/prisma";
import * as documentsService from "../documents/documents.service";
import { assertTenantAccess, getEnabledConfigOrThrow } from "./whatsapp-config.service";
import type { GetLogsQuery } from "./whatsapp.validation";

type CurrentUser = {
  userId: string;
  role: string;
};

type EnabledWhatsappConfig = Awaited<ReturnType<typeof getEnabledConfigOrThrow>>;

const logger = new Logger("WhatsappService");

const getApiVersion = (): string => process.env.WHATSAPP_API_VERSION || "v19.0";
const DEFAULT_TEMPLATE_LANGUAGE_CODE = "en_US";
const DEFAULT_INVOICE_TEMPLATE_NAME = "invoice";

const serviceUnavailableError = (message: string, details?: unknown): AppError =>
  new AppError(503, message, "WHATSAPP_META_API_FAILED", details);

const getMetaError = (error: any): { code?: string; message: string; details?: unknown } => ({
  code: error?.response?.data?.error?.code?.toString(),
  message: error?.response?.data?.error?.message || error?.message || "Meta API failed",
  details: error?.response?.data,
});

export const formatPhoneE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12) return digits;
  throw validationError("Invalid phone number");
};

const getDocumentFilename = (documentNumber: string): string => `${documentNumber}.pdf`;

const resolveLocalPath = (filePath: string): string =>
  path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

const readPdfBuffer = async (filePath: string | null): Promise<Buffer> => {
  if (!filePath) {
    throw validationError("PDF not yet generated. Please generate the document first.");
  }

  if (/^https?:\/\//i.test(filePath)) {
    const response = await axios.get(filePath, {
      responseType: "arraybuffer",
      timeout: 10000,
    });
    return Buffer.from(response.data);
  }

  const localPath = resolveLocalPath(filePath);
  if (!fs.existsSync(localPath)) {
    throw notFoundError("Document file not found. Generate the document first.");
  }

  return fs.readFileSync(localPath);
};

const getOrGenerateDocument = async (input: {
  tenantId: string;
  referenceId: string;
  documentType: "SALES_INVOICE" | "DELIVERY_CHALLAN" | "PAYMENT_RECEIPT";
  referenceType: "ORDER" | "PAYMENT";
  generatedById: string;
  currentUser: CurrentUser;
}) => {
  const existing = await prisma.generatedDocument.findFirst({
    where: {
      tenantId: input.tenantId,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      documentType: input.documentType,
    },
  });

  if (existing?.filePath) return existing;

  if (input.documentType === "SALES_INVOICE") {
    await documentsService.generateInvoice(
      input.tenantId,
      input.referenceId,
      input.generatedById,
      input.currentUser,
    );
  } else if (input.documentType === "DELIVERY_CHALLAN") {
    await documentsService.generateChallan(
      input.tenantId,
      input.referenceId,
      input.generatedById,
      input.currentUser,
    );
  } else {
    await documentsService.generatePaymentReceipt(
      input.tenantId,
      input.referenceId,
      input.generatedById,
      input.currentUser,
    );
  }

  const generated = await prisma.generatedDocument.findFirst({
    where: {
      tenantId: input.tenantId,
      referenceId: input.referenceId,
      referenceType: input.referenceType,
      documentType: input.documentType,
    },
  });

  if (!generated) {
    throw new AppError(500, "Document metadata was not created", "DOCUMENT_METADATA_MISSING");
  }

  return generated;
};

const uploadPdfToMeta = async (
  config: EnabledWhatsappConfig,
  pdfBuffer: Buffer,
  filename: string,
): Promise<string> => {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append("file", pdfBuffer, {
    filename,
    contentType: "application/pdf",
  });

  try {
    logger.log(`Uploading WhatsApp PDF media ${filename}`);
    const response = await axios.post(
      `https://graph.facebook.com/${getApiVersion()}/${config.phoneNumberId}/media`,
      form,
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          ...form.getHeaders(),
        },
        timeout: 30000,
      },
    );
    return response.data.id;
  } catch (error: any) {
    const metaError = getMetaError(error);
    logger.error(`WhatsApp PDF upload failed: ${metaError.message}`);
    throw serviceUnavailableError(metaError.message, metaError.details);
  }
};

export const sendTemplateMessage = async (
  config: EnabledWhatsappConfig,
  toPhone: string,
  templateName: string,
  components: Record<string, unknown>[],
  logId: string,
) => {
  try {
    logger.log(`Sending WhatsApp template ${templateName} to ${toPhone}`);
    const response = await axios.post(
      `https://graph.facebook.com/${getApiVersion()}/${config.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: toPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: DEFAULT_TEMPLATE_LANGUAGE_CODE },
          components,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    const messageId = response.data?.messages?.[0]?.id;
    const log = await prisma.whatsappMessageLog.update({
      where: { id: logId },
      data: {
        providerMessageId: messageId,
        messageStatus: "SENT",
        sentAt: new Date(),
      },
    });
    return { success: true, messageId, log };
  } catch (error: any) {
    const metaError = getMetaError(error);
    logger.error(`WhatsApp template send failed for log ${logId}: ${metaError.message}`);
    await prisma.whatsappMessageLog.update({
      where: { id: logId },
      data: {
        messageStatus: "FAILED",
        errorCode: metaError.code,
        errorMessage: metaError.message,
        failedAt: new Date(),
      },
    });
    throw serviceUnavailableError(metaError.message, metaError.details);
  }
};

const markLogFailed = async (logId: string, error: unknown) => {
  const message = error instanceof Error ? error.message : "WhatsApp send failed";
  await prisma.whatsappMessageLog.update({
    where: { id: logId },
    data: {
      messageStatus: "FAILED",
      errorMessage: message,
      failedAt: new Date(),
    },
  });
};

const sendDocumentTemplate = async (input: {
  tenantId: string;
  partyId: string;
  phone: string | null;
  documentId: string;
  documentNumber: string;
  filePath: string | null;
  templateName: string;
  messageType: "INVOICE" | "PAYMENT_RECEIPT" | "DELIVERY_CHALLAN";
  sentById: string;
}) => {
  if (!input.phone) {
    throw validationError("Dealer has no phone number");
  }

  const config = await getEnabledConfigOrThrow(input.tenantId);
  const toPhone = formatPhoneE164(input.phone);
  const filename = getDocumentFilename(input.documentNumber);
  const pdfBuffer = await readPdfBuffer(input.filePath);

  const log = await prisma.whatsappMessageLog.create({
    data: {
      tenantId: input.tenantId,
      configId: config.id,
      partyId: input.partyId,
      toPhone,
      messageType: input.messageType,
      messageStatus: "QUEUED",
      documentId: input.documentId,
      templateName: input.templateName,
      templateVars: { documentNumber: input.documentNumber, filename },
      sentById: input.sentById,
    },
  });

  try {
    const mediaId = await uploadPdfToMeta(config, pdfBuffer, filename);
    const components = [
      {
        type: "header",
        parameters: [
          {
            type: "document",
            document: {
              id: mediaId,
              filename,
            },
          },
        ],
      },
    ];

    const result = await sendTemplateMessage(config, toPhone, input.templateName, components, log.id);
    return result.log;
  } catch (error) {
    const current = await prisma.whatsappMessageLog.findUnique({
      where: { id: log.id },
      select: { messageStatus: true },
    });
    if (current?.messageStatus !== "FAILED") {
      await markLogFailed(log.id, error);
    }
    throw error;
  }
};

export const sendInvoice = async (
  tenantId: string,
  orderId: string,
  sentById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const config = await getEnabledConfigOrThrow(tenantId);
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId, deletedAt: null },
    include: { dealer: true },
  });
  if (!order) throw notFoundError("Order not found");

  const document = await getOrGenerateDocument({
    tenantId,
    referenceId: orderId,
    referenceType: "ORDER",
    documentType: "SALES_INVOICE",
    generatedById: sentById,
    currentUser,
  });

  return sendDocumentTemplate({
    tenantId,
    partyId: order.dealerId,
    phone: order.dealer.phone,
    documentId: document.id,
    documentNumber: document.documentNumber,
    filePath: document.filePath,
    templateName: config.invoiceTemplateName || DEFAULT_INVOICE_TEMPLATE_NAME,
    messageType: "INVOICE",
    sentById,
  });
};

export const sendPaymentReceipt = async (
  tenantId: string,
  paymentId: string,
  sentById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const config = await getEnabledConfigOrThrow(tenantId);
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, tenantId },
    include: { party: true },
  });
  if (!payment) throw notFoundError("Payment not found");

  const document = await getOrGenerateDocument({
    tenantId,
    referenceId: paymentId,
    referenceType: "PAYMENT",
    documentType: "PAYMENT_RECEIPT",
    generatedById: sentById,
    currentUser,
  });

  return sendDocumentTemplate({
    tenantId,
    partyId: payment.partyId,
    phone: payment.party.phone,
    documentId: document.id,
    documentNumber: document.documentNumber,
    filePath: document.filePath,
    templateName: config.paymentReceiptTemplateName || "payment_receipt",
    messageType: "PAYMENT_RECEIPT",
    sentById,
  });
};

export const sendDeliveryChallan = async (
  tenantId: string,
  dispatchId: string,
  sentById: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const config = await getEnabledConfigOrThrow(tenantId);
  const dispatch = await prisma.orderDispatch.findFirst({
    where: { id: dispatchId, tenantId },
    include: { order: { include: { dealer: true } } },
  });
  if (!dispatch) throw notFoundError("Dispatch not found");

  const document = await getOrGenerateDocument({
    tenantId,
    referenceId: dispatch.orderId,
    referenceType: "ORDER",
    documentType: "DELIVERY_CHALLAN",
    generatedById: sentById,
    currentUser,
  });

  return sendDocumentTemplate({
    tenantId,
    partyId: dispatch.order.dealerId,
    phone: dispatch.order.dealer.phone,
    documentId: document.id,
    documentNumber: document.documentNumber,
    filePath: document.filePath,
    templateName: config.challansTemplateName || "delivery_challan",
    messageType: "DELIVERY_CHALLAN",
    sentById,
  });
};

export const getLogs = async (
  tenantId: string,
  query: GetLogsQuery,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const where: Prisma.WhatsappMessageLogWhereInput = {
    tenantId,
    messageType: query.messageType,
    messageStatus: query.messageStatus,
    partyId: query.partyId,
  };

  if (query.fromDate || query.toDate) {
    where.createdAt = {
      gte: query.fromDate ? new Date(query.fromDate) : undefined,
      lte: query.toDate ? new Date(query.toDate) : undefined,
    };
  }

  const skip = (query.page - 1) * query.limit;
  const [items, totalItems] = await prisma.$transaction([
    prisma.whatsappMessageLog.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: query.limit,
      include: {
        party: { select: { id: true, name: true, phone: true } },
        document: { select: { id: true, documentNumber: true, documentType: true } },
        sentBy: { select: { id: true, name: true } },
      },
    }),
    prisma.whatsappMessageLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));
  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
};

export const getLogById = async (
  tenantId: string,
  id: string,
  currentUser: CurrentUser,
) => {
  await assertTenantAccess(tenantId, currentUser);
  const log = await prisma.whatsappMessageLog.findFirst({
    where: { id, tenantId },
    include: {
      party: true,
      document: true,
      sentBy: { select: { id: true, name: true, phone: true } },
    },
  });
  if (!log) throw notFoundError("WhatsApp message log not found");
  return log;
};
