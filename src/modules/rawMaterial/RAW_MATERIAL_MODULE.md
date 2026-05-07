# Raw Material Module

## 1. Overview
The Raw Material module manages the master catalogue of materials, purchase intake from suppliers, and stock visibility. Issuances are **now created via the worker-assignment flow**, so manual issuance creation is disabled in this module.

Business flow:

Supplier (Party, type = SUPPLIER) → RawMaterialPurchase → RawMaterialType catalogue → RawMaterialIssuance (via assignments) → Stock summary

All endpoints are tenant-scoped and require authentication.

---

## 2. Authentication & Permissions
All endpoints require authentication via either:
- **Cookie**: `accessToken`
- **Header**: `Authorization: Bearer <accessToken>`

**Permissions** (middleware currently commented out in routes, but expected codes are):

| Permission | Usage |
| --- | --- |
| `raw-materials.read` | Read types, purchases, stock, issuances |
| `raw-materials.create` | Create types, purchases |
| `raw-materials.update` | Update types, purchases |
| `raw-materials.delete` | Delete types, purchases |

---

## 3. Core Data Models

### RawMaterialType
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| tenantId | UUID | FK → Tenant |
| name | String | Unique per tenant (case-insensitive enforced) |
| unit | `KG`, `GRAM`, `PIECE`, `METER`, `DOZEN` | Required |
| description | String | Optional |
| isActive | Boolean | Defaults true |
| deletedAt | DateTime | Soft delete marker |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |
| currentStock | Decimal (string) | Computed in list/get by ID |

### RawMaterialPurchase
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| tenantId | UUID | FK → Tenant |
| materialTypeId | UUID | FK → RawMaterialType |
| supplierId | UUID | FK → Party (must be SUPPLIER) |
| quantity | Decimal(18,4) | Positive |
| costPerUnit | Decimal(18,2) | Positive |
| totalCost | Decimal(18,2) | Computed server-side |
| status | `PENDING`, `RECEIVED`, `CANCELLED` | Defaults `RECEIVED` |
| purchaseDate | DateTime | Required |
| invoiceNumber | String | Optional |
| notes | String | Optional |
| deletedAt | DateTime | Soft delete marker |
| createdById | UUID | FK → User |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |
| materialType | Object | Included in list/get responses |
| supplier | Object | Included in list/get responses |

### RawMaterialIssuance (read-only in this module)
| Field | Type | Notes |
| --- | --- | --- |
| id | UUID | Primary key |
| tenantId | UUID | FK → Tenant |
| materialTypeId | UUID | FK → RawMaterialType |
| assignmentId | UUID | FK → WorkerAssignment (unique) |
| quantity | Decimal(18,4) | Positive |
| issuedAt | DateTime | Defaults now |
| notes | String | Optional |
| createdById | UUID | FK → User |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |
| materialType | Object | Included in list/get responses |

> Decimal fields are returned as **strings** in JSON to preserve precision.

---

## 4. Business Rules
1. Tenant access is enforced for all operations.
2. RawMaterialType name must be unique per tenant (soft-deleted types excluded).
3. Purchase supplier must be a Party with type = SUPPLIER.
4. `totalCost` is computed server-side: `quantity × costPerUnit` (clients must not send it).
5. Stock is computed dynamically:

$$
\text{currentStock} = \sum(\text{purchases.quantity where status=RECEIVED}) - \sum(\text{issuances.quantity})
$$

6. RawMaterialType and RawMaterialPurchase are soft-deleted (never hard delete).
7. Cannot deactivate a material type if current stock > 0.
8. Cannot delete a purchase if removal would make stock negative.
9. Manual issuance creation is **disabled**. Issuances are created via worker assignments.

---

## 5. API Reference

### Endpoint Summary
| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/tenants/:tenantId/raw-materials/types` | List types (with stock) |
| GET | `/api/tenants/:tenantId/raw-materials/types/:materialTypeId` | Get type by ID |
| POST | `/api/tenants/:tenantId/raw-materials/types` | Create type |
| PATCH | `/api/tenants/:tenantId/raw-materials/types/:materialTypeId` | Update type |
| DELETE | `/api/tenants/:tenantId/raw-materials/types/:materialTypeId` | Soft delete type |
| GET | `/api/tenants/:tenantId/raw-materials/purchases` | List purchases |
| GET | `/api/tenants/:tenantId/raw-materials/purchases/:purchaseId` | Get purchase by ID |
| POST | `/api/tenants/:tenantId/raw-materials/purchases` | Create purchase |
| PATCH | `/api/tenants/:tenantId/raw-materials/purchases/:purchaseId` | Update purchase |
| DELETE | `/api/tenants/:tenantId/raw-materials/purchases/:purchaseId` | Soft delete purchase |
| GET | `/api/tenants/:tenantId/raw-materials/stock` | Stock summary |
| GET | `/api/tenants/:tenantId/raw-materials/issuances` | List issuances |
| GET | `/api/tenants/:tenantId/raw-materials/issuances/:issuanceId` | Get issuance by ID |
| POST | `/api/tenants/:tenantId/raw-materials/issuances` | **Disabled** (use worker assignments) |

---

### GET `/raw-materials/types`
**Query Params**: `page`, `limit`, `search`, `isActive`

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": ["RawMaterialType"],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

### POST `/raw-materials/types`
**Request**
```json
{ "name": "Gold Plated Base", "unit": "KG", "description": "Base layer" }
```

**Response (201)**: `RawMaterialType` (includes `currentStock`)

---

### PATCH `/raw-materials/types/:materialTypeId`
**Request**
```json
{ "name": "Rhodium Base", "isActive": true }
```

**Response (200)**: `RawMaterialType`

---

### DELETE `/raw-materials/types/:materialTypeId`
**Response (200)**
```json
{ "success": true, "data": { "message": "Material type deleted successfully" } }
```

---

### GET `/raw-materials/purchases`
**Query Params**: `page`, `limit`, `materialTypeId`, `supplierId`, `status`, `dateFrom`, `dateTo`

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": ["RawMaterialPurchase"],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

### POST `/raw-materials/purchases`
**Request**
```json
{
  "materialTypeId": "uuid",
  "supplierId": "uuid",
  "quantity": 100.25,
  "costPerUnit": 12.5,
  "purchaseDate": "2026-05-03T10:00:00.000Z",
  "status": "RECEIVED",
  "invoiceNumber": "INV-1024",
  "notes": "First lot"
}
```

**Response (201)**: `RawMaterialPurchase`

> `totalCost` is computed server-side and must not be sent.

---

### PATCH `/raw-materials/purchases/:purchaseId`
**Request**
```json
{ "quantity": 120.5, "costPerUnit": 13.0, "status": "RECEIVED" }
```

**Notes**
- `materialTypeId` and `supplierId` **cannot** be updated.

---

### DELETE `/raw-materials/purchases/:purchaseId`
**Response (200)**
```json
{ "success": true, "data": { "message": "Purchase deleted successfully" } }
```

---

### GET `/raw-materials/stock`
**Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "materialTypeId": "uuid",
      "name": "Gold Plated Base",
      "unit": "KG",
      "totalPurchased": "120.0",
      "totalIssued": "25.0",
      "currentStock": "95.0",
      "isLow": false
    }
  ]
}
```

---

### GET `/raw-materials/issuances`
**Query Params**: `page`, `limit`, `materialTypeId`, `dateFrom`, `dateTo`

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": ["RawMaterialIssuance"],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

### GET `/raw-materials/issuances/:issuanceId`
**Response (200)**: `RawMaterialIssuance`

---

### POST `/raw-materials/issuances`
**Status**: **Disabled**

**Response (400)**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Manual raw material issuances are no longer supported after the worker-assignment migration. Create issuances through the assignment flow instead.",
    "details": null
  }
}
```

---

## 6. Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fieldErrors": {
        "name": ["Material type name must be at least 2 characters"]
      }
    }
  }
}
```