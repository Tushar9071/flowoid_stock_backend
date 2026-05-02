# Parties Module Guide

This file explains what must exist before testing the Parties module and how the database relationships work.

## Why Parties Are Tenant-Scoped

Parties are not created directly under a user.

The actual relationship flow is:

`User -> TenantUser -> Tenant -> Party`

That means:

- `User` is the login identity
- `Tenant` is the business/workspace
- `TenantUser` is the membership row that links a user to a tenant
- `Party` belongs to a tenant

So a user can access parties only when that user belongs to the tenant.

## Prerequisites Before Testing Parties

Before testing the Parties module, these records and flows should exist:

1. A `User` must exist in the `users` table.
2. A `TENANT_OWNER` role should exist in the `roles` table.
3. The user should log in and obtain an access token.
4. The user should create a tenant using `POST /api/tenants`.
5. Tenant creation should create:
   - one row in `tenants`
   - one row in `tenant_users`
6. The `tenant_users` row should link:
   - `userId`
   - `tenantId`
   - `roleId = TENANT_OWNER`

Once that is done, the user is not a tenant owner globally.
The user is a tenant owner for that specific tenant.

## Minimum Entity Flow

### Step 1: User exists

The user must already be registered and able to log in.

### Step 2: Tenant owner role exists

The backend tenant creation logic looks for the `TENANT_OWNER` role.
If this role does not exist, tenant membership may fall back to the user's global role, which is not ideal for tenant ownership.

### Step 3: Create tenant

Call:

`POST /api/tenants`

This creates the tenant and also links the current user to that tenant in `tenant_users`.

### Step 4: Use tenant-scoped parties APIs

All parties APIs are tenant-scoped:

`/api/tenants/:tenantId/parties/...`

This is required because parties belong to a business tenant, not directly to a user.

## Core Database Entities Used By Parties

### `users`

Stores login identities.

### `tenants`

Stores business accounts/workspaces.

### `tenant_users`

Stores which user belongs to which tenant and what role that user has inside that tenant.

### `parties`

Stores tenant-specific dealers and suppliers.

Important fields:

- `tenantId`
- `type`
- `name`
- `phone`
- `email`
- `gstin`
- `creditLimit`
- `openingBalance`
- `openingBalanceType`
- `openingBalanceDate`
- `isActive`

### `party_ledger_entries`

Stores accounting entries for party statements and ledger history.

Used for:

- opening balance
- future sales postings
- future purchase postings
- payment receipts
- payment made
- debit/credit notes
- manual adjustments

## Party Types

Currently supported:

- `DEALER`
- `SUPPLIER`

This is sufficient for the current v1 implementation.

## Recommended Testing Order

1. Register or confirm a user exists.
2. Confirm `TENANT_OWNER` exists in `roles`.
3. Login and get auth token.
4. Create tenant.
5. Verify `tenant_users` membership exists.
6. Create a party.
7. List parties.
8. Get party by ID.
9. Update party.
10. Check duplicate API.
11. Toggle party status.
12. Create opening balance if not already provided during party creation.
13. Get opening balance.
14. Get party statement.
15. Get party ledger.

## Current Parties APIs

### CRUD

- `POST /api/tenants/:tenantId/parties`
- `GET /api/tenants/:tenantId/parties`
- `GET /api/tenants/:tenantId/parties/:partyId`
- `PUT /api/tenants/:tenantId/parties/:partyId`
- `DELETE /api/tenants/:tenantId/parties/:partyId`

### Utility

- `GET /api/tenants/:tenantId/parties/dropdown`
- `GET /api/tenants/:tenantId/parties/check-duplicate`
- `PATCH /api/tenants/:tenantId/parties/:partyId/status`

### Opening Balance

- `GET /api/tenants/:tenantId/parties/:partyId/opening-balance`
- `POST /api/tenants/:tenantId/parties/:partyId/opening-balance`
- `PUT /api/tenants/:tenantId/parties/:partyId/opening-balance`

Rules:

- `POST` is for first-time opening balance creation
- if opening balance already exists, use `PUT`
- opening balance is synced to the ledger entry table

### Statement / Ledger

- `GET /api/tenants/:tenantId/parties/:partyId/statement`
- `GET /api/tenants/:tenantId/parties/:partyId/ledger`

Current behavior:

- both are backed by `party_ledger_entries`
- both support date filters and pagination
- both include summary totals and balance nature

## Important Behavior Notes

### Soft delete

Deleting a party does not remove historical ledger data.
The API marks the party inactive and sets `deletedAt`.

### Duplicate checks

Duplicates are checked inside the same tenant, not globally.

Current duplicate fields:

- `name`
- `phone`
- `code`
- `gstin`

### Opening balance handling

If opening balance is provided during party creation, the backend automatically creates the opening ledger entry.

If opening balance is later updated, the backend updates the matching opening ledger entry and recalculates running balances.

## Final Mental Model

If you want to understand the Parties module quickly, remember this:

- user logs in
- user belongs to a tenant
- tenant owns parties
- party owns ledger entries

So the real business chain is:

`User -> Tenant -> Party -> Ledger`
