import type { NextFunction, Request, Response } from "express";
import * as logsService from "./logs.service";

export const listLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await logsService.listLogs(req.query as any));
  } catch (error) {
    next(error);
  }
};

export const getLogStats = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    res.json(await logsService.getLogStats());
  } catch (error) {
    next(error);
  }
};
