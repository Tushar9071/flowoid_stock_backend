# Flowoid Stock Backend: Project Details and Standards

Project name:

```text
flowoid_stock_backend
```

Business/product name used in API docs:

```text
Ayanshi Imitation BMS
```

Purpose:

```text
A tenant-based backend for imitation jewellery manufacturing, stock, workers, parties, inventory, orders, dispatch, roles, users, and accounting-adjacent business flows.
```

---

## 1. Technology Stack

Runtime and framework:

- Node.js
- TypeScript
- Express 4

Database and ORM:

- PostgreSQL
- Prisma 7
- `@prisma/adapter-pg`

Validation:

- Zod

Authentication:

- JWT access token
- JWT refresh token
- HTTP-only cookies
- Bearer token fallback through `Authorization: Bearer <token>`

Security and middleware:

- `helmet`
- `cors`
- `cookie-parser`
- custom auth middleware
- custom permission middleware
- global error middleware

Documentation:

- Swagger/OpenAPI through `swagger-jsdoc`
- Swagger UI through `swagger-ui-express`

Realtime:

- Socket.IO for monitoring metrics

Package manager:

```bash
pnpm
```

Important commands:

```bash
pnpm dev
pnpm build
pnpm prisma generate
pnpm prisma migrate dev
pnpm start
```

---

## 2. Project Structure

Main files:

```text
src/index.ts
src/app.ts
src/lib/prisma.ts
src/config/auth.ts
src/config/swagger.ts
prisma/schema.prisma
```

Common backend structure:

```text
src/common/errors/app-error.ts
src/middleware/auth.middleware.ts
src/middleware/permission.middleware.ts
src/middleware/error.middleware.ts
src/middleware/metrics.middleware.ts
src/utils/response.ts
src/utils/password.ts
src/utils/auth.ts
src/types/auth.types.ts
```

Module structure standard:

```text
src/modules/<module>/<module>.routes.ts
src/modules/<module>/<module>.controller.ts
src/modules/<module>/<module>.service.ts
src/modules/<module>/<module>.validation.ts
```

Some older modules use slightly different naming:

```text
src/modules/Parties/Parties.route.ts
src/modules/Parties/Parties.controller.ts
src/modules/Parties/Parties.service.ts
src/modules/Parties/Parties.schema.ts
```

Prefer the newer lower-case pattern for new modules.

---

## 3. Application Startup Flow

Entry point:

```text
src/index.ts
```

Startup flow:

1. Load `.env` using `dotenv/config`.
2. Connect Prisma to PostgreSQL.
3. Create HTTP server from Express app.
4. Initialize monitoring Socket.IO.
5. Start listening on `PORT` or `3000`.

Express app:

```text
src/app.ts
```

App-level middleware order:

1. Swagger JSON and Swagger UI.
2. `helmet`.
3. CORS.
4. `cookieParser`.
5. `express.json`.
6. metrics middleware.
7. health route.
8. API routers.
9. global error handler.

Health endpoint:

```http
GET /health
```

Swagger:

```http
GET /api/docs
GET /api/docs-json
```

---

## 4. Standard API Response Shape

Success response:

```json
{
  "success": true,
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": null
  }
}
```

Use:

```text
src/utils/response.ts
```

Controllers should call:

```ts
successResponse(res, data);
successResponse(res, data, 201);
```

Services should throw errors from:

```text
src/common/errors/app-error.ts
```

Available helpers:

```ts
unauthorizedError()
forbiddenError()
validationError()
notFoundError()
```

Do not manually build error responses in controllers. Throw errors and let global middleware handle them.

---

## 5. Authentication Standard

Auth routes:

```text
/api/auth/register
/api/auth/login
/api/auth/refresh
/api/auth/logout
/api/auth/me
/api/auth/my-permissions
/api/auth/change-password
```

Access token sources:

1. `Authorization: Bearer <token>`
2. `accessToken` cookie

Refresh token source:

```text
refreshToken cookie
```

Auth middleware:

```text
src/middleware/auth.middleware.ts
```

Authenticated request user shape:

```ts
{
  userId: string;
  role: string;
  sessionId: string;
}
```

Login/register response sets cookies. The response body returns the public user, not raw token strings.

---

## 6. Authorization and Permissions Standard

Permission middleware:

```text
src/middleware/permission.middleware.ts
```

Usage pattern:

```ts
router.use(requireAuth);
router.get("/", requirePermission("module.read"), controllerMethod);
router.post("/", requirePermission("module.create"), controllerMethod);
router.patch("/:id", requirePermission("module.update"), controllerMethod);
router.delete("/:id", requirePermission("module.delete"), controllerMethod);
```

Permission naming convention:

```text
<module>.<action>
```

Examples:

```text
users.read
users.create
users.update
users.delete
inventory.read
inventory.create
inventory.update
roles.read
roles.create
permissions.read
```

Important:

- Some existing newer modules have permission middleware commented out.
- For new production-ready modules, add active permission middleware.
- The required permissions must exist in the database and be assigned to the logged-in user's role.

---

## 7. Tenant Model and Access Pattern

Core tenant chain:

```text
User -> TenantUser -> Tenant -> Business Data
```

Tenant-scoped route pattern:

```text
/api/tenants/:tenantId/<module>
```

Examples:

```text
/api/tenants/:tenantId/parties
/api/tenants/:tenantId/raw-materials
/api/tenants/:tenantId/designs
/api/tenants/:tenantId/workers
/api/tenants/:tenantId/assignments
/api/tenants/:tenantId/inventory
/api/tenants/:tenantId/orders
```

Tenant access service pattern:

```ts
const assertTenantAccess = async (tenantId: string, currentUser: CurrentUser) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });

  if (!tenant) throw notFoundError("Tenant not found");

  if (currentUser.role === "SUPER_ADMIN") return tenant;

  const membership = await prisma.tenantUser.findFirst({
    where: { tenantId, userId: currentUser.userId, isActive: true },
    select: { id: true },
  });

  if (!membership) throw forbiddenError("You do not have access to this tenant");

  return tenant;
};
```

Rules:

- Never trust `tenantId` from request body.
- Tenant-scoped queries must always filter by `tenantId`.
- Validate tenant access in service functions before reading/writing tenant data.

---

## 8. Database Standards

Schema file:

```text
prisma/schema.prisma
```

Every tenant-owned business model should include:

```prisma
tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
tenantId String
```

Common fields:

```prisma
id        String   @id @default(uuid())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

Soft delete pattern:

```prisma
deletedAt DateTime?
isActive  Boolean @default(true)
```

Money fields:

```prisma
Decimal @db.Decimal(18, 2)
Decimal @db.Decimal(12, 2)
Decimal @db.Decimal(10, 2)
```

Quantity fields:

```prisma
Decimal @db.Decimal(18, 4)
Int
```

Use `Decimal` for:

- money
- raw material quantities
- supplementary material quantities

Use `Int` for:

- pieces
- dozens
- counts

Indexes:

Add indexes for commonly filtered fields:

```prisma
@@index([tenantId, status])
@@index([tenantId, createdAt])
@@index([tenantId, designId])
@@index([tenantId, workerId])
@@index([tenantId, partyId])
```

Unique tenant-scoped business identifiers:

```prisma
@@unique([tenantId, name])
@@unique([tenantId, designCode])
@@unique([tenantId, orderNumber])
```

Migration command:

```bash
pnpm prisma migrate dev
```

Generate client:

```bash
pnpm prisma generate
```

Validate schema:

```bash
pnpm prisma validate
```

---

## 9. Existing Business Modules

### Auth

Purpose:

```text
User registration, login, refresh-session rotation, logout, profile, permissions, password change.
```

Main files:

```text
src/modules/auth/auth.routes.ts
src/modules/auth/auth.controller.ts
src/modules/auth/auth.service.ts
```

Important models:

```text
User
AuthRefreshToken
Role
Permission
RolePermission
```

Important behavior:

- Passwords are hashed using bcrypt.
- Refresh tokens are hashed and stored.
- Refresh token reuse revokes the session.
- Changing password revokes active refresh tokens.

---

### Users

Purpose:

```text
Global user management.
```

Routes:

```text
POST   /api/users
GET    /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
```

Permissions:

```text
users.create
users.read
users.update
users.delete
```

Important behavior:

- Create users with default or assigned role.
- Only assign roles allowed by current user's permission scope.
- Delete means deactivate, not hard delete.

---

### Tenants

Purpose:

```text
Business/workspace onboarding and user membership.
```

Routes:

```text
POST /api/tenants
GET  /api/tenants/mine
```

Important behavior:

- Creating a tenant also creates a `TenantUser` membership.
- Tenant owner role is preferred when available.
- Slug is unique globally.

---

### Roles and Permissions

Purpose:

```text
RBAC system.
```

Role routes:

```text
POST   /api/roles
GET    /api/roles
GET    /api/roles/:id
PUT    /api/roles/:id
DELETE /api/roles/:id
```

Permission routes:

```text
POST   /api/permissions
GET    /api/permissions
GET    /api/permissions/:id
PUT    /api/permissions/:id
DELETE /api/permissions/:id
```

Important behavior:

- `SUPER_ADMIN` can manage all.
- Non-super users can only assign permissions they already have.
- System/default roles have restrictions.

---

### Parties

Purpose:

```text
Tenant-scoped dealers and suppliers with ledger/opening balance support.
```

Party types:

```text
DEALER
SUPPLIER
```

Main route:

```text
/api/tenants/:tenantId/parties
```

Important behavior:

- Parties belong to tenants.
- Duplicate checks are tenant-scoped.
- Opening balance creates or updates a `PartyLedgerEntry`.
- Party statement and ledger are based on `party_ledger_entries`.
- Deleting a party is soft delete.

Ledger concepts:

```text
debitAmount  = party owes us / receivable
creditAmount = we owe party / payable
runningBalance = debit - credit over time
```

---

### Raw Materials

Purpose:

```text
Raw material master, supplier purchases, raw stock, and read-only issuances.
```

Main route:

```text
/api/tenants/:tenantId/raw-materials
```

Important concepts:

```text
RawMaterialType
RawMaterialPurchase
RawMaterialIssuance
```

Stock formula:

```text
currentStock = SUM(RECEIVED purchases) - SUM(issuances)
```

Important behavior:

- Supplier must be a Party with `type = SUPPLIER`.
- `totalCost` is calculated server-side.
- Manual raw material issuance is disabled.
- Raw material issuance is created through worker assignment flow.

---

### Designs

Purpose:

```text
Jewellery design catalogue, design categories, and supplementary material templates.
```

Main route:

```text
/api/tenants/:tenantId/designs
```

Important concepts:

```text
DesignCategory
Design
DesignSupplementaryNeed
```

Important behavior:

- `designCode` is unique per tenant.
- `pieceRateRs` drives worker earnings.
- `salePricePerDozen` is used later for sales/order pricing.
- Design supplementary needs define materials required per piece.
- Design status:

```text
ACTIVE
DISCONTINUED
DRAFT
```

---

### Supplementary Materials

Purpose:

```text
Manage stones, fittings, hooks, coatings, and other supporting material stock.
```

Main route:

```text
/api/tenants/:tenantId/supplementary
```

Important concepts:

```text
SupplementaryMaterialType
SupplementaryIssuance
```

Important behavior:

- `stockQuantity` is stored directly.
- Assignment creation deducts supplementary stock based on design needs.
- Manual stock adjustment endpoint exists.

---

### Workers

Purpose:

```text
Worker profiles, worker payment summaries, payments, assignments listing, and worker ledger.
```

Main route:

```text
/api/tenants/:tenantId/workers
```

Important concepts:

```text
Worker
WorkerPayment
WorkerAssignment
GoodsReturn
```

Payment types:

```text
EARNING_SETTLEMENT
ADVANCE
ADVANCE_RECOVERY
```

Important behavior:

- Workers can have opening payable/receivable balances.
- Worker cannot be deleted with active assignments.
- Worker ledger combines opening balance, goods returns, and payments.

---

### Assignments and Goods Returns

Purpose:

```text
Issue raw material and supplementary material to workers, track returned finished pieces, and calculate worker earnings.
```

Main route:

```text
/api/tenants/:tenantId/assignments
```

Assignment status:

```text
ISSUED
IN_PROGRESS
PARTIALLY_RETURNED
COMPLETED
CLOSED
```

Important behavior:

- Assignment creation validates worker, design, raw material stock, and supplementary stock.
- Assignment creation automatically creates raw material issuance.
- Assignment creation automatically creates supplementary issuances.
- Goods return calculates:

```text
acceptedPieces = piecesReturned - rejectedPieces
earningAmount = acceptedPieces * pieceRateAtAssignment
```

- Assignment status is updated based on returned pieces.

---

### Inventory

Purpose:

```text
Manage finished goods inventory in two stages: unpackaged stock and packaged stock.
```

Main route:

```text
/api/tenants/:tenantId/inventory
```

Models:

```text
InventoryStock
PackagingBatch
InventoryAdjustment
```

Permissions:

```text
inventory.read
inventory.create
inventory.update
```

Endpoints:

```text
GET   /stock
GET   /stock/alerts
GET   /stock/:designId
PATCH /stock/:designId/alert
POST  /stock/:designId/adjustment
POST  /packaging
GET   /packaging
GET   /packaging/:batchId
```

Unpackaged stock formula:

```text
unpackagedPieces =
  SUM(goodsReturns.acceptedPieces)
  + SUM(UNPACKAGED inventory adjustments)
  - SUM(packagingBatches.piecesUsed)
```

Packaged stock formula:

```text
packagedDozens =
  SUM(packagingBatches.dozensPackaged)
  + SUM(PACKAGED inventory adjustments)
  - SUM(orderDispatchItems.dozensDispatched)
```

Orders/Dispatch subtracts dispatched dozens from packaged stock.

Packaging rule:

```text
piecesUsed = dozensPackaged * 12
```

Important behavior:

- Packaging requires sufficient unpackaged stock.
- Packaging is permanent; no delete endpoint.
- Adjustments are audited.
- Stock cannot go negative.
- Low stock alert is informational.
- Dispatched order dozens are included in packaged stock calculation.

---

### Orders and Dispatch

Purpose:

```text
Manage dealer orders from draft creation through confirmation, packing, partial/full dispatch, stock deduction, and party ledger SALE posting.
```

Main route:

```text
/api/tenants/:tenantId/orders
```

Models:

```text
Order
OrderItem
OrderDispatch
OrderDispatchItem
```

Permissions:

```text
orders.read
orders.create
orders.update
orders.dispatch
orders.cancel
```

Order status:

```text
DRAFT
CONFIRMED
PACKED
PARTIALLY_DISPATCHED
DISPATCHED
CANCELLED
```

Endpoints:

```text
GET    /
POST   /
GET    /overdue
GET    /:orderId
PATCH  /:orderId
PATCH  /:orderId/confirm
PATCH  /:orderId/pack
PATCH  /:orderId/dispatch
PATCH  /:orderId/cancel
POST   /:orderId/items
PATCH  /:orderId/items/:itemId
DELETE /:orderId/items/:itemId
GET    /:orderId/dispatch-summary
```

Important behavior:

- Orders belong to tenants and dealers.
- Dealer must be a `Party` with `type = DEALER`.
- `orderNumber` is generated server-side and unique per tenant.
- Prices are locked on `OrderItem.pricePerDozen`.
- Totals are calculated server-side.
- Draft orders do not validate stock.
- Confirmation validates packaged stock and reserves stock conceptually.
- Dispatch deducts packaged stock through `OrderDispatchItem`.
- Partial dispatch is supported and tracked per line item.
- Final dispatch status is `DISPATCHED`; partial dispatch status is `PARTIALLY_DISPATCHED`.
- Dispatch creates `PartyLedgerEntry` with `entryType = SALE`, `voucherType = ORDER`, and `voucherId = order.id`.
- Ledger debit totals reconcile to the order total across partial dispatches.
- Cancellation is allowed before full dispatch and requires a reason.
- `GET /overdue` is registered before `GET /:orderId`.

---

### Monitoring

Purpose:

```text
System metrics and live admin monitoring.
```

Main route:

```text
/api/monitoring/metrics
```

Socket:

```text
/admin-monitoring
```

Important behavior:

- Tracks API request counts and response time.
- Checks database health.
- Emits Socket.IO metric updates.

---

## 10. Business Flow Summary

High-level manufacturing flow:

```text
User registers/logs in
        |
        v
User creates Tenant
        |
        v
Tenant creates Parties, Workers, Raw Materials, Designs
        |
        v
Raw Materials purchased from Supplier Parties
        |
        v
Design created with piece rate, sale price, supplementary needs
        |
        v
Worker Assignment created
        |
        v
Raw material and supplementary material issued
        |
        v
Worker returns finished pieces
        |
        v
Goods Return records accepted/rejected pieces and earnings
        |
        v
Accepted pieces become Unpackaged Inventory
        |
        v
Owner creates Packaging Batch
        |
        v
Packaged dozens become sellable stock
        |
        v
Dealer order is created, confirmed, packed, and dispatched
        |
        v
Dispatched dozens reduce packaged stock and create dealer SALE ledger entry
```

Accounting-adjacent flow:

```text
Party opening balance -> Party ledger
Order dispatch -> Party ledger SALE entry
Future payments -> Payment module
```

Worker earning flow:

```text
Goods return -> accepted pieces -> earning amount -> worker outstanding balance
Worker payment -> settlement/advance/recovery -> worker ledger
```

---

## 11. Module Development Standard

When creating a new module, follow this order:

1. Read relevant existing modules end to end.
2. Design Prisma models.
3. Add back-relations to existing models.
4. Add migration.
5. Run Prisma generate.
6. Create validation file.
7. Create service file.
8. Create controller file.
9. Create routes file.
10. Add Swagger route JSDoc.
11. Add central Swagger schemas/responses in `src/config/swagger.ts`.
12. Register router in `src/app.ts`.
13. Run build and Prisma validation.
14. Create Swagger testing guide if module is large.

Standard module files:

```text
src/modules/orders/orders.validation.ts
src/modules/orders/orders.service.ts
src/modules/orders/orders.controller.ts
src/modules/orders/orders.routes.ts
```

Validation rules:

- Use Zod.
- Coerce query numbers and booleans when appropriate.
- Validate UUID route params.
- Validate date ranges.
- Reject empty update bodies.

Controller rules:

- Parse params/query/body with Zod.
- Get current user from `AuthenticatedRequest`.
- Call service.
- Return via `successResponse`.
- Catch errors and call `next(error)`.

Service rules:

- Validate tenant access first.
- Keep all business rules in service.
- Use transactions for multi-table writes.
- Calculate totals server-side.
- Never trust client-calculated totals.
- Throw `validationError`, `notFoundError`, `forbiddenError`.

Route rules:

- Use `Router({ mergeParams: true })` for tenant-scoped modules.
- Use `router.use(requireAuth)`.
- Add `requirePermission`.
- Register static routes before dynamic routes.

Example:

```ts
router.get("/overdue", requirePermission("orders.read"), ctrl.getOverdueOrders);
router.get("/:orderId", requirePermission("orders.read"), ctrl.getOrderById);
```

This avoids Express treating `overdue` as an ID.

---

## 12. Swagger Documentation Standard

Central config:

```text
src/config/swagger.ts
```

Route files:

- Should contain endpoint-level `@swagger` JSDoc blocks.
- Should reference central schemas using `$ref`.
- Should not define large inline schemas.

Central Swagger should contain:

- enum schemas
- model schemas
- request schemas
- response schemas
- reusable parameters
- reusable responses

Route Swagger should contain:

- tags
- summary
- description where useful
- path params
- query params
- requestBody
- responses using `$ref`

Tag naming:

```text
Auth
Tenants
Users
Roles
Permissions
Parties
Raw Materials
Designs
Supplementary Materials
Workers
Assignments
Goods Returns
Inventory
Orders
```

New module tag example:

```text
Orders
```

---

## 13. Transaction Standards

Use Prisma transactions when an operation touches more than one table or must be atomic.

Examples:

- create assignment
- record goods return
- create packaging batch
- create inventory adjustment
- order dispatch
- future payment posting

Pattern:

```ts
return prisma.$transaction(async (tx) => {
  // validate current state
  // write records
  // update summaries
  // return final data
});
```

Never update status first and then perform critical deductions outside the transaction.

---

## 14. Stock and Accounting Rules

Raw material stock:

```text
received purchases - raw material issuances
```

Supplementary stock:

```text
stored stockQuantity, adjusted directly and deducted during assignment creation
```

Unpackaged finished stock:

```text
accepted goods returns + unpackaged adjustments - packaging pieces used
```

Packaged finished stock:

```text
packaging batches + packaged adjustments - order dispatch items
```

Order dispatch should:

```text
deduct packaged dozens
create SALE party ledger entry
```

Party ledger direction:

```text
SALE -> debitAmount because dealer owes money
PAYMENT_RECEIVED -> creditAmount because receivable decreases
```

Worker ledger direction:

```text
Goods return earning increases payable to worker
Payment decreases payable
Advance creates receivable/adjusted balance
```

---

## 15. Testing Standard

Basic backend verification:

```bash
pnpm prisma validate
pnpm prisma generate
pnpm build
```

Run server:

```bash
pnpm dev
```

Open Swagger:

```text
http://localhost:3000/api/docs
```

Testing order for most tenant modules:

1. Register or login.
2. Create or fetch tenant.
3. Confirm permissions.
4. Create prerequisite master data.
5. Test create endpoint.
6. Test list endpoint.
7. Test get-by-id endpoint.
8. Test update endpoint.
9. Test business action endpoints.
10. Test validation errors.

Useful test guide already created:

```text
SWAGGER_TESTING_AUTH_USER_TENANT_INVENTORY.md
ORDERS_DISPATCH_TESTING.md
```

---

## 16. Current Important Permissions

Auth:

```text
No permission required for register/login/refresh.
Auth required for me/logout/change-password/my-permissions.
```

Users:

```text
users.create
users.read
users.update
users.delete
```

Roles:

```text
roles.create
roles.read
roles.update
roles.delete
```

Permissions:

```text
permissions.create
permissions.read
permissions.update
permissions.delete
```

Parties:

```text
parties.create
parties.read
parties.update
parties.delete
```

Inventory:

```text
inventory.read
inventory.create
inventory.update
```

Orders:

```text
orders.read
orders.create
orders.update
orders.dispatch
orders.cancel
```

Monitoring:

```text
metrics.read
```

Some module permission checks are currently commented in route files. Decide before production whether to activate them consistently.

---

## 17. Known Engineering Notes

Encoding:

- Some comments/log strings show mojibake for emojis/arrows.
- Prefer plain ASCII in new files unless the file already uses Unicode intentionally.

CORS:

- Current CORS reflects request origin and allows credentials.
- Review before production hardening.

Tenant access:

- `assertTenantAccess` is repeated in many modules.
- Future refactor could extract it to a shared helper.

Swagger:

- `src/config/swagger.ts` is large.
- Keep central schemas organized and avoid duplicating schema names.

Prisma Client:

- After schema changes, always run:

```bash
pnpm prisma generate
```

Editor errors often disappear after restarting TypeScript server.

---

## 18. Orders and Dispatch Implementation Notes

Orders and Dispatch is implemented.

Module path:

```text
src/modules/orders/orders.validation.ts
src/modules/orders/orders.service.ts
src/modules/orders/orders.controller.ts
src/modules/orders/orders.routes.ts
```

Route base:

```text
/api/tenants/:tenantId/orders
```

Permissions:

```text
orders.read
orders.create
orders.update
orders.dispatch
orders.cancel
```

Important rules:

- Order numbers must be unique per tenant.
- Dealer must be a `Party` with `type = DEALER`.
- Prices must be locked on `OrderItem`.
- Totals must be calculated server-side.
- Confirmation validates packaged inventory.
- Dispatch deducts packaged inventory.
- Dispatch creates `PartyLedgerEntry` with `entryType = SALE`.
- Dispatch must be a single transaction.
- `GET /orders/overdue` must be registered before `GET /orders/:orderId`.
- Partial dispatch is supported with `OrderDispatch` and `OrderDispatchItem`.
- Inventory stock calculation subtracts `OrderDispatchItem.dozensDispatched`.

---

## 19. How To Explain This Project Simply

Short explanation:

```text
This is a multi-tenant backend for an imitation jewellery business. It manages users, roles, tenants, dealers, suppliers, raw materials, designs, workers, production assignments, finished goods returns, inventory packaging, dealer orders, dispatch, and business ledgers. The system tracks stock from purchase to worker issuance to finished goods packaging and dealer dispatch, while enforcing tenant isolation, authentication, permissions, and server-side business rules.
```

Long explanation:

```text
The backend starts with user authentication and tenant creation. Each tenant represents a business. Within a tenant, the business creates parties such as dealers and suppliers, raw material catalogues, supplementary material catalogues, workers, and jewellery designs. Raw material purchases increase raw stock. Worker assignments issue raw and supplementary materials to workers. Goods returns record accepted finished pieces and worker earnings. Accepted pieces become unpackaged inventory. The owner packages pieces into dozens, creating packaged inventory ready for sale. Dealer orders reserve stock during confirmation and deduct packaged stock during dispatch. Dispatch creates sale ledger entries for dealer receivables. Party ledgers and worker ledgers track financial history and outstanding balances. All APIs are documented in Swagger and protected by JWT authentication and role permissions.
```

---

## 20. Developer Checklist For Every New Feature

Use this before submitting any feature:

- [ ] Read related existing modules.
- [ ] Follow existing folder naming and file structure.
- [ ] Add or update Prisma schema carefully.
- [ ] Add migration.
- [ ] Add back-relations.
- [ ] Run Prisma generate.
- [ ] Add Zod validation.
- [ ] Keep business logic in service.
- [ ] Keep controllers thin.
- [ ] Use `successResponse`.
- [ ] Throw `AppError` helpers, not raw responses.
- [ ] Enforce tenant access.
- [ ] Add permissions.
- [ ] Add Swagger route docs.
- [ ] Add central Swagger schemas/responses.
- [ ] Register route in `app.ts`.
- [ ] Use transactions for multi-table writes.
- [ ] Run `pnpm prisma validate`.
- [ ] Run `pnpm build`.
- [ ] Add a small testing guide for large modules.
