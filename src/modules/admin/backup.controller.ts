import type { NextFunction, Request, Response } from "express";
import * as backupService from "./backup.service";

export const listBackups = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json({ data: await backupService.listBackups() });
  } catch (error) {
    next(error);
  }
};

export const triggerBackup = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.status(202).json(await backupService.runBackup());
  } catch (error) {
    next(error);
  }
};

export const getBackupStatus = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await backupService.getBackupStatus());
  } catch (error) {
    next(error);
  }
};
