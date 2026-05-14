import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import puppeteer from "puppeteer";

const resolveTemplatePath = (templateName: string): string => {
  const candidates = [
    path.join(__dirname, "..", "templates", `${templateName}.html`),
    path.join(process.cwd(), "src", "templates", `${templateName}.html`),
  ];

  const templatePath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!templatePath) {
    throw new Error(`PDF template not found: ${templateName}`);
  }

  return templatePath;
};

export const generatePdfBuffer = async (
  templateName: string,
  data: Record<string, any>,
): Promise<Buffer> => {
  const templateHtml = fs.readFileSync(resolveTemplatePath(templateName), "utf8");
  const compiled = handlebars.compile(templateHtml);
  const html = compiled(data);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
};
