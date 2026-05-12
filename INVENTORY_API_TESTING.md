# Inventory Module API Testing Guide

This file contains all Inventory module API endpoints and demo request payloads for manual testing.

## Base URL

```text
http://localhost:3000/api/tenants/{tenantId}/inventory
```

Replace:

- `{tenantId}` with a real tenant UUID
- `{designId}` with a real design UUID
- `{batchId}` with a real packaging batch UUID

## Required Headers

Use these headers for all protected requests:

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

## Important Notes Before Testing

- Inventory endpoints are tenant-scoped.
- All routes require authentication.
- Permission checks are enabled:
  - `inventory.read`
  - `inventory.create`
  - `inventory.update`
- `piecesUsed` is calculated on the server as `dozensPackaged * 12`.
- Do not send server-managed fields like `tenantId`, `packedById`, `adjustedById`, or `piecesUsed` in request bodies.
- Packaging will fail if unpackaged stock is insufficient.
- Negative stock adjustments are blocked.

## Suggested Test Order

1. Get stock overview
2. Get stock by design
3. Update low stock alert
4. Create packaging batch
5. List packaging batches
6. Get packaging batch by ID
7. Create stock adjustment
8. Get low stock alerts

## 1. Get Stock Overview

### Endpoint

```http
GET /api/tenants/{tenantId}/inventory/stock
```

### Example URL

```http
GET http://localhost:3000/api/tenants/{tenantId}/inventory/stock
```

### Optional Query Params

- `designId`
- `categoryId`
- `isLow=true`
- `isLow=false`
- `page=1`
- `limit=20`

### Example URLs

```http
GET http://localhost:3000/api/tenants/{tenantId}/inventory/stock?page=1&limit=20
GET http://localhost:3000/api/tenants/{tenantId}/inventory/stock?designId={designId}
GET http://localhost:3000/api/tenants/{tenantId}/inventory/stock?categoryId={categoryId}
GET http://localhost:3000/api/tenants/{tenantId}/inventory/stock?isLow=true
```

### Request Body

No body

## 2. Get Low Stock Alerts

### Endpoint

```http
GET /api/tenants/{tenantId}/inventory/stock/alerts
```

### Example URL

```http
GET http://localhost:3000/api/tenants/{tenantId}/inventory/stock/alerts
```

### Request Body

No body

## 3. Get Stock By Design

### endpoints

```http
GET /api/tenants/{tenantId}/inventory/stock/{designId}
```

### Example URL

```http
GET http://localhost:3000/api/tenants/{tenantId}/inventory/stock/{designId}
```

### Request Body

No body

## 4. Update Low Stock Alert

### Endpoint

```http
PATCH /api/tenants/{tenantId}/inventory/stock/{designId}/alert
```

### Example URL

```http
PATCH http://localhost:3000/api/tenants/{tenantId}/inventory/stock/{designId}/alert
```

### Demo Request JSON

```json
  {
    "lowStockAlertAt": 5
  }
```

## 5. Create Stock Adjustment

### Endpoint

```http
POST /api/tenants/{tenantId}/inventory/stock/{designId}/adjustment
```

### Example URL

```http
POST http://localhost:3000/api/tenants/{tenantId}/inventory/stock/{designId}/adjustment
```

### Demo Request JSON For Unpackaged Increase

```json
{
  "type": "UNPACKAGED",
  "adjustment": 12,
  "notes": "Manual stock correction after count"
}
```

### Demo Request JSON For Unpackaged Decrease

```json
{
  "type": "UNPACKAGED",
  "adjustment": -6,
  "notes": "Damaged loose pieces removed"
}
```

### Demo Request JSON For Packaged Increase

```json
{
  "type": "PACKAGED",
  "adjustment": 2,
  "notes": "Packaged stock correction"
}
```

### Demo Request JSON For Packaged Decrease

```json
{
  "type": "PACKAGED",
  "adjustment": -1,
  "notes": "One dozen removed after damage check"
}
```

## 6. Create Packaging Batch

### Endpoint

```http
POST /api/tenants/{tenantId}/inventory/packaging
```

### Example URL

```http
POST http://localhost:3000/api/tenants/{tenantId}/inventory/packaging
```

### Demo Request JSON

```json
{
  "designId": "{designId}",
  "dozensPackaged": 3,
  "notes": "Packed for showroom stock"
}
```

### What This Does

- Uses `3 * 12 = 36` unpackaged pieces
- Creates one packaging batch
- Increases packaged dozens
- Fails if available unpackaged pieces are less than 36

## 7. List Packaging Batches

### Endpoint

```http
GET /api/tenants/{tenantId}/inventory/packaging
```

### Example URL

```http
GET http://localhost:3000/api/tenants/{tenantId}/inventory/packaging
```

### Optional Query Params

- `designId`
- `dateFrom`
- `dateTo`
- `page=1`
- `limit=20`

### Example URLs

```http
GET http://localhost:3000/api/tenants/{tenantId}/inventory/packaging?page=1&limit=20
GET http://localhost:3000/api/tenants/{tenantId}/inventory/packaging?designId={designId}
GET http://localhost:3000/api/tenants/{tenantId}/inventory/packaging?dateFrom=2026-05-01T00:00:00.000Z&dateTo=2026-05-31T23:59:59.999Z
```

### Request Body

No body

## 8. Get Packaging Batch By ID

### Endpoint

```http
GET /api/tenants/{tenantId}/inventory/packaging/{batchId}
```

### Example URL

```http
GET http://localhost:3000/api/tenants/{tenantId}/inventory/packaging/{batchId}
```

### Request Body

No body

## Sample Postman Raw JSON Collection

### Update Alert

```json
{
  "lowStockAlertAt": 10
}
```

### Create Packaging

```json
{
  "designId": "11111111-1111-1111-1111-111111111111",
  "dozensPackaged": 2,
  "notes": "Packed for dealer dispatch"
}
```

### Create Adjustment

```json
{
  "type": "UNPACKAGED",
  "adjustment": -4,
  "notes": "Broken pieces removed after QC"
}
```

## Expected Validation Rules

- `tenantId` must be a valid UUID in path
- `designId` must be a valid UUID in path or query
- `batchId` must be a valid UUID in path
- `dozensPackaged` must be a positive integer
- `lowStockAlertAt` must be an integer `>= 0`
- `adjustment` must be a non-zero integer
- `type` must be either `UNPACKAGED` or `PACKAGED`
- `dateTo` must be greater than or equal to `dateFrom`

## Common Failure Cases To Test

### Invalid design ID

```http
GET /api/tenants/{tenantId}/inventory/stock/invalid-id
```

### Packaging with insufficient stock

```json
{
  "designId": "{designId}",
  "dozensPackaged": 999,
  "notes": "Should fail due to insufficient unpackaged stock"
}
```

### Adjustment causing negative packaged stock

```json
{
  "type": "PACKAGED",
  "adjustment": -999,
  "notes": "Should fail due to negative stock"
}
```

### Sending forbidden extra fields

```json
{
  "designId": "{designId}",
  "dozensPackaged": 2,
  "piecesUsed": 24,
  "tenantId": "11111111-1111-1111-1111-111111111111",
  "packedById": "11111111-1111-1111-1111-111111111111"
}
```
This should fail because those fields are server-managed.
