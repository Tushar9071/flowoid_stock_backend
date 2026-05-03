import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedRequest } from "../../types/auth.types";
import { validationError } from "../../common/errors/app-error";
import { successResponse } from "../../utils/response";

import * as rawMaterialService from "./rawMaterial.service";
import {
	createIssuanceSchema,
	createMaterialTypeSchema,
	createPurchaseSchema,
	issuanceParamsSchema,
	listIssuancesQuerySchema,
	listMaterialTypesQuerySchema,
	listPurchasesQuerySchema,
	materialTypeParamsSchema,
	purchaseParamsSchema,
	tenantParamsSchema,
	updateMaterialTypeSchema,
	updatePurchaseSchema,
	type CreateIssuanceInput,
	type CreateMaterialTypeInput,
	type CreatePurchaseInput,
	type IssuanceParams,
	type ListIssuancesQuery,
	type ListMaterialTypesQuery,
	type ListPurchasesQuery,
	type MaterialTypeParams,
	type PurchaseParams,
	type TenantParams,
	 type UpdateMaterialTypeInput,
	 type UpdatePurchaseInput,
} from "./rawMaterial.schema";

const parseOrThrow = <T>(schema: z.ZodTypeAny, value: unknown): T => {
	const result = schema.safeParse(value);
	if (!result.success) {
		throw validationError("Request validation failed", result.error.flatten());
	}
	return result.data as T;
};

export const getAllMaterialTypes = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
		const query = parseOrThrow<ListMaterialTypesQuery>(
			listMaterialTypesQuerySchema,
			req.query,
		);

		const result = await rawMaterialService.getAllMaterialTypes(
			params.tenantId,
			query,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const getMaterialTypeById = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<MaterialTypeParams>(
			materialTypeParamsSchema,
			req.params,
		);

		const result = await rawMaterialService.getMaterialTypeById(
			params.tenantId,
			params.materialTypeId,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const createMaterialType = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
		const input = parseOrThrow<CreateMaterialTypeInput>(
			createMaterialTypeSchema,
			req.body,
		);

		const result = await rawMaterialService.createMaterialType(
			params.tenantId,
			input,
			authReq.user,
		);

		successResponse(res, result, 201);
	} catch (error) {
		next(error);
	}
};

export const updateMaterialType = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<MaterialTypeParams>(
			materialTypeParamsSchema,
			req.params,
		);
		const input = parseOrThrow<UpdateMaterialTypeInput>(
			updateMaterialTypeSchema,
			req.body,
		);

		const result = await rawMaterialService.updateMaterialType(
			params.tenantId,
			params.materialTypeId,
			input,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const softDeleteMaterialType = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<MaterialTypeParams>(
			materialTypeParamsSchema,
			req.params,
		);

		await rawMaterialService.softDeleteMaterialType(
			params.tenantId,
			params.materialTypeId,
			authReq.user,
		);

		successResponse(res, { message: "Material type deleted successfully" });
	} catch (error) {
		next(error);
	}
};

export const getAllPurchases = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
		const query = parseOrThrow<ListPurchasesQuery>(
			listPurchasesQuerySchema,
			req.query,
		);

		const result = await rawMaterialService.getAllPurchases(
			params.tenantId,
			query,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const getPurchaseById = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<PurchaseParams>(purchaseParamsSchema, req.params);

		const result = await rawMaterialService.getPurchaseById(
			params.tenantId,
			params.purchaseId,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const createPurchase = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
		const input = parseOrThrow<CreatePurchaseInput>(
			createPurchaseSchema,
			req.body,
		);

		const result = await rawMaterialService.createPurchase(
			params.tenantId,
			input,
			authReq.user.userId,
			authReq.user,
		);

		successResponse(res, result, 201);
	} catch (error) {
		next(error);
	}
};

export const updatePurchase = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<PurchaseParams>(purchaseParamsSchema, req.params);
		const input = parseOrThrow<UpdatePurchaseInput>(
			updatePurchaseSchema,
			req.body,
		);

		const result = await rawMaterialService.updatePurchase(
			params.tenantId,
			params.purchaseId,
			input,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const softDeletePurchase = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<PurchaseParams>(purchaseParamsSchema, req.params);

		await rawMaterialService.softDeletePurchase(
			params.tenantId,
			params.purchaseId,
			authReq.user,
		);

		successResponse(res, { message: "Purchase deleted successfully" });
	} catch (error) {
		next(error);
	}
};

export const getRawMaterialStock = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);

		const result = await rawMaterialService.getRawMaterialStock(
			params.tenantId,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const getAllIssuances = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
		const query = parseOrThrow<ListIssuancesQuery>(
			listIssuancesQuerySchema,
			req.query,
		);

		const result = await rawMaterialService.getAllIssuances(
			params.tenantId,
			query,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const getIssuanceById = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<IssuanceParams>(issuanceParamsSchema, req.params);

		const result = await rawMaterialService.getIssuanceById(
			params.tenantId,
			params.issuanceId,
			authReq.user,
		);

		successResponse(res, result);
	} catch (error) {
		next(error);
	}
};

export const createIssuance = async (
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> => {
	try {
		const authReq = req as AuthenticatedRequest;
		const params = parseOrThrow<TenantParams>(tenantParamsSchema, req.params);
		const input = parseOrThrow<CreateIssuanceInput>(
			createIssuanceSchema,
			req.body,
		);

		const result = await rawMaterialService.createIssuance(
			params.tenantId,
			input,
			authReq.user.userId,
			authReq.user,
		);

		successResponse(res, result, 201);
	} catch (error) {
		next(error);
	}
};
