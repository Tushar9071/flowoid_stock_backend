import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import multer from "multer";

import { validationError } from "../common/errors/app-error";

const TENANT_LOGO_STORAGE_DIR = path.resolve(process.cwd(), "storage", "tenant-logos");
const TENANT_LOGO_RELATIVE_DIR = path.join("storage", "tenant-logos");
const DESIGN_IMAGE_STORAGE_DIR = path.resolve(process.cwd(), "storage", "design-images");
const DESIGN_IMAGE_RELATIVE_DIR = path.join("storage", "design-images");
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

fs.mkdirSync(TENANT_LOGO_STORAGE_DIR, { recursive: true });
fs.mkdirSync(DESIGN_IMAGE_STORAGE_DIR, { recursive: true });

const createStorage = (storageDirectory: string) => multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storageDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

const createImageUpload = (storageDirectory: string, label: string) => multer({
  storage: createStorage(storageDirectory),
  limits: {
    fileSize: MAX_LOGO_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      cb(validationError(`${label} must be an image file`, {
        allowedMimeTypes: Array.from(ALLOWED_IMAGE_MIME_TYPES),
      }));
      return;
    }

    cb(null, true);
  },
});

const tenantLogoUpload = createImageUpload(TENANT_LOGO_STORAGE_DIR, "Logo");
const designImageUpload = createImageUpload(DESIGN_IMAGE_STORAGE_DIR, "Design image");

export const toLocalStoragePath = (filePath: string): string => {
  const fileName = path.basename(filePath);
  return path.join(TENANT_LOGO_RELATIVE_DIR, fileName).split(path.sep).join("/");
};

export const toLocalDesignImagePath = (filePath: string): string => {
  const fileName = path.basename(filePath);
  return path.join(DESIGN_IMAGE_RELATIVE_DIR, fileName).split(path.sep).join("/");
};

const handleSingleImageUpload = (
  upload: RequestHandler,
  sizeErrorMessage: string,
): RequestHandler => (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  upload(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(validationError(sizeErrorMessage));
        return;
      }

      next(validationError("Invalid image upload", { code: error.code, field: error.field }));
      return;
    }

    next(error);
  });
};

export const uploadTenantLogo: RequestHandler = handleSingleImageUpload(
  tenantLogoUpload.single("logo"),
  "Logo image must be 2MB or smaller",
);

export const uploadDesignImage: RequestHandler = handleSingleImageUpload(
  designImageUpload.single("image"),
  "Design image must be 2MB or smaller",
);
