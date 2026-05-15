import PDFDocument from "pdfkit";

type PdfTemplateName = "invoice" | "challan" | "paymentReceipt";

type InvoiceData = {
  tenant: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
  };
  dealer: {
    name: string;
    address: string;
    city: string;
    gstin: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  paymentTerms: string;
  dueDate?: string | null;
  isCreditOrder: boolean;
  items: Array<{
    designCode: string;
    designName: string;
    quantityDozens: number;
    pricePerDozen: string;
    lineTotal: string;
  }>;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
};

type ChallanData = {
  tenant: {
    name: string;
    address: string;
  };
  dealer: {
    name: string;
    address: string;
    city: string;
  };
  challanNumber: string;
  challanDate: string;
  items: Array<{
    designCode: string;
    designName: string;
    dozens: number;
  }>;
  totalDozens: number;
  transportMode: string;
  trackingRef: string;
};

type PaymentReceiptData = {
  tenant: {
    name: string;
    address: string;
  };
  party: {
    name: string;
  };
  receiptNumber: string;
  receiptDate: string;
  amount: string;
  amountInWords: string;
  paymentMethod: string;
  referenceNumber: string;
  allocations: Array<{
    orderNumber: string;
    amount: string;
  }>;
};

const PAGE_MARGIN = 42;
const PAGE_BOTTOM = 790;

const collectPdfBuffer = (doc: PDFKit.PDFDocument): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

const createDocument = (): PDFKit.PDFDocument =>
  new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    bufferPages: true,
    info: {
      Creator: "Ayanshi BMS",
      Producer: "Ayanshi BMS PDFKit",
    },
  });

const ensureSpace = (doc: PDFKit.PDFDocument, height: number): void => {
  if (doc.y + height <= PAGE_BOTTOM) return;
  doc.addPage();
};

const writeText = (
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions = {},
): void => {
  doc.text(text || "-", x, y, options);
};

const sectionTitle = (doc: PDFKit.PDFDocument, title: string): void => {
  ensureSpace(doc, 28);
  doc
    .moveDown(1.2)
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor("#5f6b7a")
    .text(title.toUpperCase());
  doc.fillColor("#172033");
};

const drawHeader = (
  doc: PDFKit.PDFDocument,
  input: {
    businessName: string;
    businessAddress: string;
    documentTitle: string;
    documentNumberLabel: string;
    documentNumber: string;
    dateLabel: string;
    date: string;
    phone?: string;
    email?: string;
  },
): void => {
  const rightX = 360;

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor("#172033")
    .text(input.businessName, PAGE_MARGIN, PAGE_MARGIN, { width: 285 });

  const contact = [input.businessAddress, [input.phone, input.email].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join("\n");

  doc
    .moveDown(0.4)
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#5f6b7a")
    .text(contact || "-", PAGE_MARGIN, doc.y, { width: 285, lineGap: 2 });

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("#172033")
    .text(input.documentTitle, rightX, PAGE_MARGIN, { width: 190, align: "right" });

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`${input.documentNumberLabel}: ${input.documentNumber}`, rightX, PAGE_MARGIN + 30, {
      width: 190,
      align: "right",
    })
    .text(`${input.dateLabel}: ${input.date}`, rightX, PAGE_MARGIN + 47, {
      width: 190,
      align: "right",
    });

  doc
    .strokeColor("#172033")
    .lineWidth(1.4)
    .moveTo(PAGE_MARGIN, 116)
    .lineTo(553, 116)
    .stroke();

  doc.y = 132;
};

const drawBox = (
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  body: string,
): void => {
  doc.rect(x, y, width, height).strokeColor("#d7dde8").lineWidth(1).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#5f6b7a")
    .text(title.toUpperCase(), x + 10, y + 10, { width: width - 20 });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#172033")
    .text(body || "-", x + 10, y + 27, { width: width - 20, lineGap: 2 });
};

const drawTable = (
  doc: PDFKit.PDFDocument,
  columns: Array<{ label: string; width: number; align?: "left" | "right" }>,
  rows: string[][],
  options: { headerFill?: string; headerText?: string } = {},
): void => {
  const rowHeight = 25;
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  let y = doc.y;

  const drawHeaderRow = (): void => {
    ensureSpace(doc, rowHeight + 10);
    y = doc.y;
    doc.rect(PAGE_MARGIN, y, tableWidth, rowHeight).fill(options.headerFill || "#172033");
    let x = PAGE_MARGIN;
    for (const column of columns) {
      doc
        .fillColor(options.headerText || "#ffffff")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(column.label, x + 6, y + 8, {
          width: column.width - 12,
          align: column.align || "left",
        });
      x += column.width;
    }
    doc.y = y + rowHeight;
  };

  drawHeaderRow();

  rows.forEach((row) => {
    ensureSpace(doc, rowHeight + 8);
    if (doc.y < y) drawHeaderRow();

    y = doc.y;
    let x = PAGE_MARGIN;
    doc.strokeColor("#e3e7ef").lineWidth(0.8);

    row.forEach((cell, index) => {
      const column = columns[index];
      writeText(doc, cell, x + 6, y + 8, {
        width: column.width - 12,
        align: column.align || "left",
      });
      x += column.width;
    });

    doc.moveTo(PAGE_MARGIN, y + rowHeight).lineTo(PAGE_MARGIN + tableWidth, y + rowHeight).stroke();
    doc.y = y + rowHeight;
  });

  doc.fillColor("#172033");
};

const renderInvoice = (doc: PDFKit.PDFDocument, data: InvoiceData): void => {
  drawHeader(doc, {
    businessName: data.tenant.name,
    businessAddress: data.tenant.address,
    phone: data.tenant.phone,
    email: data.tenant.email,
    documentTitle: "Sales Invoice",
    documentNumberLabel: "Invoice No",
    documentNumber: data.invoiceNumber,
    dateLabel: "Date",
    date: data.invoiceDate,
  });

  drawBox(
    doc,
    PAGE_MARGIN,
    doc.y,
    245,
    100,
    "Bill To",
    `${data.dealer.name}\n${data.dealer.address}\n${data.dealer.city}\nGSTIN: ${data.dealer.gstin}`,
  );
  drawBox(
    doc,
    308,
    doc.y,
    245,
    100,
    "Payment Terms",
    `${data.paymentTerms}${data.dueDate ? `\nDue Date: ${data.dueDate}` : ""}`,
  );
  doc.y += 118;

  sectionTitle(doc, "Items");
  drawTable(
    doc,
    [
      { label: "Design Code", width: 95 },
      { label: "Design Name", width: 190 },
      { label: "Qty (Dozens)", width: 80, align: "right" },
      { label: "Price/Dozen", width: 90, align: "right" },
      { label: "Total", width: 98, align: "right" },
    ],
    data.items.map((item) => [
      item.designCode,
      item.designName,
      String(item.quantityDozens),
      item.pricePerDozen,
      item.lineTotal,
    ]),
  );

  ensureSpace(doc, 100);
  const totalX = 345;
  const totalY = doc.y + 14;
  doc.fontSize(10).font("Helvetica");
  writeText(doc, "Subtotal", totalX, totalY, { width: 95 });
  writeText(doc, data.subtotalAmount, totalX + 95, totalY, { width: 110, align: "right" });
  writeText(doc, "Discount", totalX, totalY + 22, { width: 95 });
  writeText(doc, data.discountAmount, totalX + 95, totalY + 22, { width: 110, align: "right" });
  doc.moveTo(totalX, totalY + 47).lineTo(553, totalY + 47).strokeColor("#172033").stroke();
  doc.font("Helvetica-Bold").fontSize(12);
  writeText(doc, "Grand Total", totalX, totalY + 55, { width: 95 });
  writeText(doc, data.totalAmount, totalX + 95, totalY + 55, { width: 110, align: "right" });

  doc.y = totalY + 100;
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Order No: ${data.orderNumber}`, PAGE_MARGIN, doc.y)
    .text(data.isCreditOrder ? "Credit invoice" : "Cash invoice", 420, doc.y - 12, {
      width: 133,
      align: "right",
    });

  doc.fontSize(9).fillColor("#5f6b7a").text("Thank you for your business", PAGE_MARGIN, 745, {
    width: 511,
    align: "center",
  });
};

const renderChallan = (doc: PDFKit.PDFDocument, data: ChallanData): void => {
  drawHeader(doc, {
    businessName: data.tenant.name,
    businessAddress: data.tenant.address,
    documentTitle: "Delivery Challan",
    documentNumberLabel: "Challan No",
    documentNumber: data.challanNumber,
    dateLabel: "Date",
    date: data.challanDate,
  });

  drawBox(
    doc,
    PAGE_MARGIN,
    doc.y,
    511,
    82,
    "Deliver To",
    `${data.dealer.name}\n${data.dealer.address}\n${data.dealer.city}`,
  );
  doc.y += 100;

  sectionTitle(doc, "Items");
  drawTable(
    doc,
    [
      { label: "Design Code", width: 120 },
      { label: "Design Name", width: 310 },
      { label: "Dozens", width: 123, align: "right" },
    ],
    data.items.map((item) => [item.designCode, item.designName, String(item.dozens)]),
    { headerFill: "#f2f4f7", headerText: "#1f2937" },
  );

  ensureSpace(doc, 80);
  doc.font("Helvetica-Bold").fontSize(10);
  writeText(doc, "Total Dozens", PAGE_MARGIN, doc.y + 12, { width: 200 });
  writeText(doc, String(data.totalDozens), 430, doc.y + 12, { width: 123, align: "right" });
  doc.y += 55;

  drawBox(doc, PAGE_MARGIN, doc.y, 245, 48, "Transport Mode", data.transportMode);
  drawBox(doc, 308, doc.y, 245, 48, "Tracking Reference", data.trackingRef);

  doc
    .moveTo(PAGE_MARGIN, 720)
    .lineTo(245, 720)
    .moveTo(350, 720)
    .lineTo(553, 720)
    .strokeColor("#1f2937")
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(10)
    .text("Dispatched by", PAGE_MARGIN, 730, { width: 203, align: "center" })
    .text("Received by", 350, 730, { width: 203, align: "center" });
};

const renderPaymentReceipt = (doc: PDFKit.PDFDocument, data: PaymentReceiptData): void => {
  drawHeader(doc, {
    businessName: data.tenant.name,
    businessAddress: data.tenant.address,
    documentTitle: "Payment Receipt",
    documentNumberLabel: "Receipt No",
    documentNumber: data.receiptNumber,
    dateLabel: "Date",
    date: data.receiptDate,
  });

  const rows = [
    ["Received From", data.party.name],
    ["Amount", data.amount],
    ["Amount in Words", data.amountInWords],
    ["Payment Method", data.paymentMethod],
    ["Reference Number", data.referenceNumber],
  ];
  const panelY = doc.y;
  doc.rect(PAGE_MARGIN, panelY, 511, 130).strokeColor("#d1d5db").stroke();
  rows.forEach(([label, value], index) => {
    const y = panelY + 12 + index * 23;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#6b7280").text(label, PAGE_MARGIN + 12, y, {
      width: 135,
    });
    doc
      .font(index === 1 ? "Helvetica-Bold" : "Helvetica")
      .fontSize(index === 1 ? 14 : 10)
      .fillColor("#111827")
      .text(value, PAGE_MARGIN + 160, y, { width: 335 });
  });
  doc.y = panelY + 152;

  sectionTitle(doc, "Against Orders");
  drawTable(
    doc,
    [
      { label: "Order Number", width: 370 },
      { label: "Allocated Amount", width: 183, align: "right" },
    ],
    data.allocations.map((allocation) => [allocation.orderNumber, allocation.amount]),
    { headerFill: "#f3f4f6", headerText: "#111827" },
  );

  doc
    .moveTo(350, 720)
    .lineTo(553, 720)
    .strokeColor("#111827")
    .stroke();
  doc.font("Helvetica").fontSize(10).text("Authorized Signature", 350, 730, {
    width: 203,
    align: "center",
  });
};

export const generatePdfBuffer = async (
  templateName: string,
  data: Record<string, unknown>,
): Promise<Buffer> => {
  const name = templateName as PdfTemplateName;
  const doc = createDocument();
  const bufferPromise = collectPdfBuffer(doc);

  if (name === "invoice") {
    renderInvoice(doc, data as InvoiceData);
  } else if (name === "challan") {
    renderChallan(doc, data as ChallanData);
  } else if (name === "paymentReceipt") {
    renderPaymentReceipt(doc, data as PaymentReceiptData);
  } else {
    throw new Error(`Unsupported PDF template: ${templateName}`);
  }

  doc.end();
  return bufferPromise;
};
