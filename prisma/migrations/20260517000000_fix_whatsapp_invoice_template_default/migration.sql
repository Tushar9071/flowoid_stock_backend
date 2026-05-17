ALTER TABLE "tenant_whatsapp_configs"
ALTER COLUMN "invoiceTemplateName" SET DEFAULT 'invoice';

UPDATE "tenant_whatsapp_configs"
SET "invoiceTemplateName" = 'invoice'
WHERE "invoiceTemplateName" = 'send_invoice';
