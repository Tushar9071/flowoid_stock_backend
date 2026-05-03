# Raw Material API – Quick Testing Guide

This guide provides a short description of each endpoint and a demo JSON request format. All routes are tenant-scoped and require authentication.

Base path: `/api/tenants/:tenantId/raw-materials`

---

## Material Types

### 1) List material types
**GET** `/types`
- Returns material types with current stock and pagination.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>" },
  "query": { "page": 1, "limit": 20, "search": "Gold", "isActive": true }
}
```

### 2) Get material type by ID
**GET** `/types/:materialTypeId`
- Returns a single material type with current stock.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>", "materialTypeId": "<type-uuid>" }
}
```

### 3) Create material type
**POST** `/types`
- Creates a new material type.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>" },
  "body": {
    "name": "Gold Plated Base",
    "unit": "KG",
    "description": "Base layer"
  }
}
```

### 4) Update material type
**PATCH** `/types/:materialTypeId`
- Updates name/unit/description/isActive.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>", "materialTypeId": "<type-uuid>" },
    "body": {
        "name": "Rhodium Base",
        "isActive": true
    }
}
```

### 5) Delete material type (soft delete)
**DELETE** `/types/:materialTypeId`
- Soft deletes if stock is zero.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>", "materialTypeId": "<type-uuid>" }
}
```

---

## Purchases

### 6) List purchases
**GET** `/purchases`
- Returns purchases with supplier + material type details.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>" },
  "query": {
    "page": 1,
    "limit": 20,
    "materialTypeId": "<type-uuid>",
    "supplierId": "<party-uuid>",
    "status": "RECEIVED",
    "dateFrom": "2026-05-01T00:00:00.000Z",
    "dateTo": "2026-05-31T23:59:59.999Z"
  }
}
```

### 7) Get purchase by ID
**GET** `/purchases/:purchaseId`
- Returns a single purchase with relations.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>", "purchaseId": "<purchase-uuid>" }
}
```

### 8) Create purchase
**POST** `/purchases`
- Creates a purchase; `totalCost` is computed server-side.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>" },
  "body": {
    "materialTypeId": "<type-uuid>",
    "supplierId": "<party-uuid>",
    "quantity": 100.25,
    "costPerUnit": 12.5,
    "purchaseDate": "2026-05-03T10:00:00.000Z",
    "status": "RECEIVED",
    "invoiceNumber": "INV-1024",
    "notes": "First lot"
  }
}
```

### 9) Update purchase
**PATCH** `/purchases/:purchaseId`
- Updates quantity/cost/status/etc.; cannot change materialTypeId or supplierId.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>", "purchaseId": "<purchase-uuid>" },
  "body": {
    "quantity": 120.5,
    "costPerUnit": 13.0,
    "status": "RECEIVED",
    "notes": "Adjusted after inspection"
  }
}
```

### 10) Delete purchase (soft delete)
**DELETE** `/purchases/:purchaseId`
- Soft deletes if it won’t cause negative stock.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>", "purchaseId": "<purchase-uuid>" }
}
```

---

## Stock

### 11) Stock summary
**GET** `/stock`
- Returns stock summary per material type.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>" }
}
```

---

## Issuances

### 12) List issuances
**GET** `/issuances`
- Returns issuances with material type details.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>" },
  "query": {
    "page": 1,
    "limit": 20,
    "materialTypeId": "<type-uuid>",
    "referenceId": "manual-issue-001",
    "dateFrom": "2026-05-01T00:00:00.000Z",
    "dateTo": "2026-05-31T23:59:59.999Z"
  }
}
```

### 13) Get issuance by ID
**GET** `/issuances/:issuanceId`
- Returns a single issuance.

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>", "issuanceId": "<issuance-uuid>" }
}
```

### 14) Create issuance
**POST** `/issuances`
- Creates a manual issuance. `referenceType` is set to `MANUAL` server-side.

**Note**
- `issuedTo` is currently free text (e.g., worker name).
- Next target: implement a Worker module to store worker profiles and later link issuances via `referenceId`/`referenceType`.
- `tenant_users` is used for authenticated app users; worker storage should be a separate entity (design to be finalized).

**Demo JSON request**
```json
{
  "params": { "tenantId": "<tenant-uuid>" },
  "body": {
    "materialTypeId": "<type-uuid>",
    "quantity": 10.5,
    "issuedAt": "2026-05-03T12:00:00.000Z",
    "issuedTo": "Worker A",
    "notes": "Manual issue"
  }
}
```
