import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";

import {
  AppError,
  forbiddenError,
  isAppError,
  notFoundError,
  validationError,
} from "../../common/errors/app-error";
import prisma from "../../lib/prisma";
import { generatePdfBuffer } from "../../services/pdf.service";

type CurrentUser = {
  userId: string;
  role: string;
};

type DocumentResult = {
  pdfBuffer: Buffer;
  fileName: string;
  documentNumber: string;
};

type DocumentType = "SALES_INVOICE" | "DELIVERY_CHALLAN" | "PAYMENT_RECEIPT";
type ReferenceType = "ORDER" | "PAYMENT";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown error";

const documentGenerationError = (
  message: string,
  details?: Record<string, unknown>,
): AppError => new AppError(500, message, "DOCUMENT_GENERATION_FAILED", details);

const getDocumentStorageRoot = (): string =>
  process.env.DOCUMENT_STORAGE_DIR ||
  path.join(process.cwd(), "storage", "generated-documents");

const safeFileName = (fileName: string): string =>
  fileName.replace(/[^a-zA-Z0-9._-]/g, "_");

const saveGeneratedDocumentPdf = async (input: {
  tenantId: string;
  documentType: DocumentType;
  fileName: string;
  pdfBuffer: Buffer;
}): Promise<string> => {
  const directory = path.join(
    getDocumentStorageRoot(),
    input.tenantId,
    input.documentType.toLowerCase(),
  );
  const filePath = path.join(directory, safeFileName(input.fileName));

  try {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, input.pdfBuffer);
    return filePath;
  } catch (error) {
    throw documentGenerationError("PDF was generated but could not be saved locally", {
      documentType: input.documentType,
      filePath,
      reason: getErrorMessage(error),
    });
  }
};

const money = (value: Prisma.Decimal | number | null | undefined): string => {
  const decimal =
    value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value ?? 0);
  return decimal.toFixed(2);
};

const formatDate = (date: Date | null | undefined): string =>
  date ? date.toLocaleDateString("en-IN") : "-";

const joinAddress = (
  value: {
    address?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
  },
): string =>
  [
    value.address ?? value.addressLine1,
    value.addressLine2,
    value.city,
    value.state,
    value.country,
    value.postalCode,
  ]
    .filter(Boolean)
    .join(", ") || "-";

const assertTenantAccess = async (tenantId: string, currentUser: CurrentUser) => {
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
    where: {
      tenantId,
      userId: currentUser.userId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!membership) {
    throw forbiddenError("You do not have access to this tenant");
  }

  return tenant;
};

const numberWordsUnder1000 = (value: number): string => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const parts: string[] = [];
  if (value >= 100) {
    parts.push(`${ones[Math.floor(value / 100)]} Hundred`);
    value %= 100;
  }

  if (value >= 20) {
    parts.push(tens[Math.floor(value / 10)]);
    value %= 10;
  }

  if (value > 0) {
    parts.push(ones[value]);
  }

  return parts.join(" ");
};

const amountToWords = (amount: Prisma.Decimal): string => {
  let value = Number(amount.toDecimalPlaces(0).toString());
  if (value === 0) return "Zero Rupees Only";

  const groups = [
    { label: "Crore", divisor: 10000000 },
    { label: "Lakh", divisor: 100000 },
    { label: "Thousand", divisor: 1000 },
    { label: "", divisor: 1 },
  ];
  const parts: string[] = [];

  for (const group of groups) {
    const current = Math.floor(value / group.divisor);
    if (current > 0) {
      parts.push(`${numberWordsUnder1000(current)} ${group.label}`.trim());
      value %= group.divisor;
    }
  }

  return `${parts.join(" ")} Rupees Only`;
};

const recordGeneratedDocument = async (input: {
  tenantId: string;
  documentType: DocumentType;
  referenceId: string;
  referenceType: ReferenceType;
  documentNumber: string;
  generatedById: string;
  filePath: string;
  fileSize: number;
}) => {
  try {
    const existing = await prisma.generatedDocument.findFirst({
      where: {
        tenantId: input.tenantId,
        documentType: input.documentType,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
      },
      select: { id: true },
    });

    if (existing) {
      return prisma.generatedDocument.update({
        where: { id: existing.id },
        data: {
          documentNumber: input.documentNumber,
          filePath: input.filePath,
          fileSize: input.fileSize,
          generatedAt: new Date(),
          generatedById: input.generatedById,
        },
      });
    }

    return prisma.generatedDocument.create({
      data: {
        tenantId: input.tenantId,
        documentType: input.documentType,
        referenceId: input.referenceId,
        referenceType: input.referenceType,
        documentNumber: input.documentNumber,
        filePath: input.filePath,
        fileSize: input.fileSize,
        generatedAt: new Date(),
        generatedById: input.generatedById,
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    throw documentGenerationError("Document was generated but metadata could not be saved", {
      documentType: input.documentType,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      filePath: input.filePath,
      reason: getErrorMessage(error),
    });
  }
};

const persistGeneratedDocument = async (input: {
  tenantId: string;
  documentType: DocumentType;
  referenceId: string;
  referenceType: ReferenceType;
  documentNumber: string;
  generatedById: string;
  fileName: string;
  pdfBuffer: Buffer;
}) => {
  const filePath = await saveGeneratedDocumentPdf({
    tenantId: input.tenantId,
    documentType: input.documentType,
    fileName: input.fileName,
    pdfBuffer: input.pdfBuffer,
  });

  await recordGeneratedDocument({
    tenantId: input.tenantId,
    documentType: input.documentType,
    referenceId: input.referenceId,
    referenceType: input.referenceType,
    documentNumber: input.documentNumber,
    generatedById: input.generatedById,
    filePath,
    fileSize: input.pdfBuffer.length,
  });
};

const generateDocumentPdf = async (
  templateName: "invoice" | "challan" | "paymentReceipt",
  data: Record<string, unknown>,
): Promise<Buffer> => {
  try {
    return await generatePdfBuffer(templateName, data);
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    const displayName =
      templateName === "paymentReceipt"
        ? "payment receipt"
        : templateName === "invoice"
          ? "sales invoice"
          : "delivery challan";

    throw documentGenerationError(`Failed to generate ${displayName} PDF`, {
      template: templateName,
      reason: getErrorMessage(error),
    });
  }
};

const getOrderForDocument = async (tenantId: string, orderId: string) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenantId,
      deletedAt: null,
    },
    include: {
      tenant: true,
      dealer: true,
      items: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          design: {
            select: {
              designCode: true,
              name: true,
            },
          },
        },
      },
      dispatches: {
        orderBy: [{ dispatchedAt: "asc" }, { id: "asc" }],
        include: {
          items: {
            include: {
              orderItem: {
                include: {
                  design: {
                    select: {
                      designCode: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw notFoundError("Order not found");
  }

  if (order.status !== "DISPATCHED" && order.status !== "PARTIALLY_DISPATCHED") {
    throw validationError("Documents can only be generated for dispatched or partially dispatched orders");
  }

  return order;
};

export const generateInvoice = async (
  tenantId: string,
  orderId: string,
  generatedById: string,
  currentUser: CurrentUser,
): Promise<DocumentResult> => {
  await assertTenantAccess(tenantId, currentUser);
  const order = await getOrderForDocument(tenantId, orderId);
  const documentNumber = `INV-${order.orderNumber}`;
  const pdfBuffer = await generateDocumentPdf("invoice", {
    tenant: {
      name: order.tenant.name,
      address: joinAddress(order.tenant),
      phone: order.tenant.phone ?? "",
      email: order.tenant.email ?? "",
    },
    dealer: {
      name: order.dealer.name,
      address: joinAddress(order.dealer),
      city: order.dealer.city ?? "-",
      gstin: order.dealer.gstin ?? "-",
    },
    invoiceNumber: documentNumber,
    invoiceDate: formatDate(order.dispatchedAt ?? order.orderDate),
    orderNumber: order.orderNumber,
    paymentTerms: order.isCreditOrder ? "Credit" : "Cash",
    dueDate: order.isCreditOrder ? formatDate(order.dueDate) : null,
    isCreditOrder: order.isCreditOrder,
    items: order.items.map((item) => ({
      designCode: item.design.designCode,
      designName: item.design.name,
      quantityPieces: item.quantityPieces,
      pricePerPiece: money(item.pricePerPiece),
      lineTotal: money(item.lineTotal),
    })),
    subtotalAmount: money(order.subtotalAmount),
    discountAmount: money(order.discountAmount),
    totalAmount: money(order.totalAmount),
  });

  const fileName = `${documentNumber}.pdf`;
  await persistGeneratedDocument({
    tenantId,
    documentType: "SALES_INVOICE",
    referenceId: order.id,
    referenceType: "ORDER",
    documentNumber,
    generatedById,
    fileName,
    pdfBuffer,
  });

  return {
    pdfBuffer,
    fileName,
    documentNumber,
  };
};

export const generateChallan = async (
  tenantId: string,
  orderId: string,
  generatedById: string,
  currentUser: CurrentUser,
): Promise<DocumentResult> => {
  await assertTenantAccess(tenantId, currentUser);
  const order = await getOrderForDocument(tenantId, orderId);
  const latestDispatch = order.dispatches[order.dispatches.length - 1];

  if (!latestDispatch) {
    throw validationError("No dispatch is available for this order");
  }

  const items = order.dispatches.flatMap((dispatch) =>
    dispatch.items.map((item) => ({
      designCode: item.orderItem.design.designCode,
      designName: item.orderItem.design.name,
      pieces: item.piecesDispatched,
    })),
  );
  const totalPieces = items.reduce((sum, item) => sum + item.pieces, 0);
  const documentNumber = `CH-${order.orderNumber}`;
  const pdfBuffer = await generateDocumentPdf("challan", {
    tenant: {
      name: order.tenant.name,
      address: joinAddress(order.tenant),
    },
    dealer: {
      name: order.dealer.name,
      address: joinAddress(order.dealer),
      city: order.dealer.city ?? "-",
    },
    challanNumber: order.orderNumber,
    challanDate: formatDate(latestDispatch.dispatchedAt),
    items,
    totalPieces,
    transportMode: latestDispatch.transportMode,
    trackingRef: latestDispatch.trackingRef ?? "-",
  });

  const fileName = `${documentNumber}.pdf`;
  await persistGeneratedDocument({
    tenantId,
    documentType: "DELIVERY_CHALLAN",
    referenceId: order.id,
    referenceType: "ORDER",
    documentNumber,
    generatedById,
    fileName,
    pdfBuffer,
  });

  return {
    pdfBuffer,
    fileName,
    documentNumber,
  };
};

export const generatePaymentReceipt = async (
  tenantId: string,
  paymentId: string,
  generatedById: string,
  currentUser: CurrentUser,
): Promise<DocumentResult> => {
  await assertTenantAccess(tenantId, currentUser);
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      tenantId,
    },
    include: {
      tenant: true,
      party: true,
      allocations: {
        include: {
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw notFoundError("Payment not found");
  }

  if (payment.paymentStatus === "CANCELLED") {
    throw validationError("Receipt cannot be generated for a cancelled payment");
  }

  const documentNumber = `RCPT-${payment.id.slice(0, 8).toUpperCase()}`;
  const pdfBuffer = await generateDocumentPdf("paymentReceipt", {
    tenant: {
      name: payment.tenant.name,
      address: joinAddress(payment.tenant),
    },
    party: {
      name: payment.party.name,
    },
    receiptNumber: documentNumber,
    receiptDate: formatDate(payment.paymentDate),
    amount: money(payment.amount),
    amountInWords: amountToWords(payment.amount),
    paymentMethod: payment.paymentMethod,
    referenceNumber: payment.referenceNumber ?? "-",
    allocations:
      payment.allocations.length > 0
        ? payment.allocations.map((allocation) => ({
            orderNumber: allocation.order.orderNumber,
            amount: money(allocation.amount),
          }))
        : [{ orderNumber: "Advance / Unallocated", amount: money(payment.amount) }],
  });

  const fileName = `${documentNumber}.pdf`;
  await persistGeneratedDocument({
    tenantId,
    documentType: "PAYMENT_RECEIPT",
    referenceId: payment.id,
    referenceType: "PAYMENT",
    documentNumber,
    generatedById,
    fileName,
    pdfBuffer,
  });

  return {
    pdfBuffer,
    fileName,
    documentNumber,
  };
};
