-- CreateEnum
CREATE TYPE "WhatsappProvider" AS ENUM ('META_CLOUD_API');

-- CreateEnum
CREATE TYPE "WhatsappMessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WhatsappMessageType" AS ENUM ('INVOICE', 'PAYMENT_RECEIPT', 'DELIVERY_CHALLAN', 'CUSTOM');

-- CreateTable
CREATE TABLE "tenant_whatsapp_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "WhatsappProvider" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumberId" TEXT,
    "wabaId" TEXT,
    "accessToken" TEXT,
    "fromPhoneNumber" TEXT,
    "invoiceTemplateName" TEXT DEFAULT 'send_invoice',
    "paymentReceiptTemplateName" TEXT DEFAULT 'payment_receipt',
    "challansTemplateName" TEXT DEFAULT 'delivery_challan',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_whatsapp_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_message_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "partyId" TEXT,
    "toPhone" TEXT NOT NULL,
    "messageType" "WhatsappMessageType" NOT NULL,
    "messageStatus" "WhatsappMessageStatus" NOT NULL DEFAULT 'QUEUED',
    "documentId" TEXT,
    "providerMessageId" TEXT,
    "templateName" TEXT,
    "templateVars" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "sentById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_whatsapp_configs_tenantId_key" ON "tenant_whatsapp_configs"("tenantId");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_tenantId_partyId_idx" ON "whatsapp_message_logs"("tenantId", "partyId");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_tenantId_messageStatus_idx" ON "whatsapp_message_logs"("tenantId", "messageStatus");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_tenantId_createdAt_idx" ON "whatsapp_message_logs"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_message_logs_providerMessageId_idx" ON "whatsapp_message_logs"("providerMessageId");

-- AddForeignKey
ALTER TABLE "tenant_whatsapp_configs" ADD CONSTRAINT "tenant_whatsapp_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "tenant_whatsapp_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "generated_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_message_logs" ADD CONSTRAINT "whatsapp_message_logs_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
