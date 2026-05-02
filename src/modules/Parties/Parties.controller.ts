import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../types/auth.types";
import { validationError } from "../../common/errors/app-error";
import { successResponse } from "../../utils/response";

import {
  checkDuplicatePartyQuerySchema,
  createPartySchema,
  dropdownPartiesQuerySchema,
  openingBalanceSchema,
  listPartiesQuerySchema,
  partyParamsSchema,
  statementQuerySchema,
  tenantParamsSchema,
  updatePartySchema,
  updatePartyStatusSchema,
  type CheckDuplicatePartyQuery,
  type DropdownPartiesQuery,
  type PartyParams,
  type CreatePartyInput,
  type ListPartiesQuery,
  type OpeningBalanceInput,
  type StatementQuery,
  type TenantParams,
  type UpdatePartyInput,
  type UpdateOpeningBalanceInput,
  type UpdatePartyStatusInput,
  updateOpeningBalanceSchema,
} from "./Parties.schema";
import * as partiesService from "./Parties.service";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError("Request validation failed", result.error.flatten());
  }
  return result.data as T;
};

export const createParty = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const input = parseOrThrow<CreatePartyInput>(createPartySchema, req.body);

    const party = await partiesService.createParty(
      params.tenantId,
      input,
      authReq.user,
    );

    successResponse(res, party, 201);
  } catch (error) {
    next(error);
  }
};

export const listParties = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<ListPartiesQuery>(listPartiesQuerySchema, req.query);

    const result = await partiesService.listParties(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPartyById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);

    const party = await partiesService.getPartyById(
      params.tenantId,
      params.partyId,
      authReq.user,
    );

    successResponse(res, party);
  } catch (error) {
    next(error);
  }
};

export const updateParty = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);
    const input = parseOrThrow<UpdatePartyInput>(updatePartySchema, req.body);

    const party = await partiesService.updateParty(
      params.tenantId,
      params.partyId,
      input,
      authReq.user,
    );

    successResponse(res, party);
  } catch (error) {
    next(error);
  }
};

export const deleteParty = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);

    await partiesService.deleteParty(
      params.tenantId,
      params.partyId,
      authReq.user,
    );

    successResponse(res, { message: "Party deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getOpeningBalance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);

    const result = await partiesService.getOpeningBalance(
      params.tenantId,
      params.partyId,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const createOpeningBalance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);
    const input = parseOrThrow<OpeningBalanceInput>(openingBalanceSchema, req.body);

    const result = await partiesService.createOpeningBalance(
      params.tenantId,
      params.partyId,
      input,
      authReq.user,
    );

    successResponse(res, result, 201);
  } catch (error) {
    next(error);
  }
};

export const updateOpeningBalance = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);
    const input = parseOrThrow<UpdateOpeningBalanceInput>(
      updateOpeningBalanceSchema,
      req.body,
    );

    const result = await partiesService.updateOpeningBalance(
      params.tenantId,
      params.partyId,
      input,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPartyStatement = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);
    const query = parseOrThrow<StatementQuery>(statementQuerySchema, req.query);

    const result = await partiesService.getPartyStatement(
      params.tenantId,
      params.partyId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPartyLedger = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);
    const query = parseOrThrow<StatementQuery>(statementQuerySchema, req.query);

    const result = await partiesService.getPartyLedger(
      params.tenantId,
      params.partyId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const updatePartyStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<PartyParams>(partyParamsSchema, req.params);
    const input = parseOrThrow<UpdatePartyStatusInput>(
      updatePartyStatusSchema,
      req.body,
    );

    const result = await partiesService.updatePartyStatus(
      params.tenantId,
      params.partyId,
      input,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const getPartiesDropdown = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<DropdownPartiesQuery>(
      dropdownPartiesQuerySchema,
      req.query,
    );

    const result = await partiesService.getPartiesDropdown(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};

export const checkPartyDuplicate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
    const query = parseOrThrow<CheckDuplicatePartyQuery>(
      checkDuplicatePartyQuerySchema,
      req.query,
    );

    const result = await partiesService.checkPartyDuplicate(
      params.tenantId,
      query,
      authReq.user,
    );

    successResponse(res, result);
  } catch (error) {
    next(error);
  }
};
