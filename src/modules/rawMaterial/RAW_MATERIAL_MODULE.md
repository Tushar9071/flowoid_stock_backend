# Raw Material Module

## 1. Overview
The Raw Material module manages the master catalogue of materials, purchase intake from suppliers, stock issuance to workers, and the resulting stock balance. It fits into the business flow as:

Supplier (Party, type = SUPPLIER) → RawMaterialPurchase → RawMaterialType catalogue → RawMaterialIssuance → Stock summary

The module is tenant-scoped and enforces access via tenant membership checks.

## 2. Database Models

### RawMaterialType
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | UUID | Yes | Primary key |
| tenantId | UUID | Yes | FK → Tenant |
| name | String | Yes | Unique per tenant (case-insensitive enforced at app layer) |
| unit | RawMaterialUnit | Yes | KG, GRAM, PIECE, METER, DOZEN |
| description | String | No | Optional notes |
| isActive | Boolean | Yes | Defaults true |
| deletedAt | DateTime | No | Soft delete marker |
| createdAt | DateTime | Yes | Auto |
| updatedAt | DateTime | Yes | Auto |

Relationships:
- Tenant → RawMaterialType (one-to-many)
- RawMaterialType → RawMaterialPurchase (one-to-many)
- RawMaterialType → RawMaterialIssuance (one-to-many)

### RawMaterialPurchase
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | UUID | Yes | Primary key |
| tenantId | UUID | Yes | FK → Tenant |
| materialTypeId | UUID | Yes | FK → RawMaterialType |
| supplierId | UUID | Yes | FK → Party (type=SUPPLIER required) |
| quantity | Decimal(18,4) | Yes | Positive quantity |
| costPerUnit | Decimal(18,2) | Yes | Positive unit cost |
| totalCost | Decimal(18,2) | Yes | Computed server-side: quantity × costPerUnit |
| status | RawMaterialPurchaseStatus | Yes | PENDING, RECEIVED, CANCELLED |
| purchaseDate | DateTime | Yes | Purchase date |
| invoiceNumber | String | No | Optional |
| notes | String | No | Optional |
| deletedAt | DateTime | No | Soft delete marker |
| createdById | UUID | Yes | FK → User |
| createdAt | DateTime | Yes | Auto |
| updatedAt | DateTime | Yes | Auto |

Relationships:
- Tenant → RawMaterialPurchase (one-to-many)
- RawMaterialPurchase → RawMaterialType (many-to-one)
- RawMaterialPurchase → Party (supplier) (many-to-one)
- RawMaterialPurchase → User (createdBy) (many-to-one)

### RawMaterialIssuance
| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| id | UUID | Yes | Primary key |
| tenantId | UUID | Yes | FK → Tenant |
| materialTypeId | UUID | Yes | FK → RawMaterialType |
| quantity | Decimal(18,4) | Yes | Positive quantity |
| issuedTo | String | No | Free text (worker name, etc.) |
| referenceId | String | No | Soft reference to future assignment |
| referenceType | String | No | e.g. MANUAL, WORKER_ASSIGNMENT |
| issuedAt | DateTime | Yes | Defaults now |
| notes | String | No | Optional |
| createdById | UUID | Yes | FK → User |
| createdAt | DateTime | Yes | Auto |
| updatedAt | DateTime | Yes | Auto |

Relationships:
- Tenant → RawMaterialIssuance (one-to-many)
- RawMaterialIssuance → RawMaterialType (many-to-one)
- RawMaterialIssuance → User (createdBy) (many-to-one)

## 3. Business Rules
1. Tenant access is enforced for all operations. Errors:
   - "Tenant not found"
   - "You do not have access to this tenant"
2. RawMaterialType name must be unique per tenant (soft-deleted types are excluded in app checks).
3. A purchase supplier must be a Party with type = SUPPLIER. Errors:
   - "Supplier not found"
   - "Selected party is not a supplier"
4. totalCost is calculated server-side: quantity × costPerUnit.
5. Stock = SUM(received purchases) − SUM(issuances).
6. RawMaterialType and RawMaterialPurchase are soft-deleted (set deletedAt, never hard delete).
7. Cannot deactivate a material type if current stock > 0:
   - "Cannot deactivate material type with remaining stock: {value} {unit}"
8. Cannot delete a purchase if its removal would make stock negative:
   - "Cannot delete purchase because issued quantity exceeds remaining stock"
9. Insufficient stock for issuance:
   - "Insufficient stock. Available: {currentStock} {unit}"
10. Read endpoints require read permission; writes require create/update; deletes require delete.
11. Issuances created via this module are MANUAL (referenceType = "MANUAL").

## 4. API Reference

### Endpoint Summary
| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | /api/tenants/:tenantId/raw-materials/types | raw-materials.read |
| GET | /api/tenants/:tenantId/raw-materials/types/:materialTypeId | raw-materials.read |
| POST | /api/tenants/:tenantId/raw-materials/types | raw-materials.create |
| PATCH | /api/tenants/:tenantId/raw-materials/types/:materialTypeId | raw-materials.update |
| DELETE | /api/tenants/:tenantId/raw-materials/types/:materialTypeId | raw-materials.delete |
| GET | /api/tenants/:tenantId/raw-materials/purchases | raw-materials.read |
| GET | /api/tenants/:tenantId/raw-materials/purchases/:purchaseId | raw-materials.read |
| POST | /api/tenants/:tenantId/raw-materials/purchases | raw-materials.create |
| PATCH | /api/tenants/:tenantId/raw-materials/purchases/:purchaseId | raw-materials.update |
| DELETE | /api/tenants/:tenantId/raw-materials/purchases/:purchaseId | raw-materials.delete |
| GET | /api/tenants/:tenantId/raw-materials/stock | raw-materials.read |
| GET | /api/tenants/:tenantId/raw-materials/issuances | raw-materials.read |
| GET | /api/tenants/:tenantId/raw-materials/issuances/:issuanceId | raw-materials.read |
| POST | /api/tenants/:tenantId/raw-materials/issuances | raw-materials.create |

### GET /raw-materials/types
**Query**: page, limit, search, isActive

**Response (200)**
```json
{
  "success": true,
  "data": {
    "items": ["RawMaterialType"],
    "pagination": { "page": 1, "limit": 20, "totalItems": 1, "totalPages": 1 }
  }
}
```

### POST /raw-materials/types
**Request**
```json
{ "name": "Gold Plated Base", "unit": "KG", "description": "Base layer" }
```
**Response (201)**: RawMaterialType

### PATCH /raw-materials/types/:materialTypeId
**Request**
```json
{ "name": "Rhodium Base", "isActive": true }
```

### DELETE /raw-materials/types/:materialTypeId
**Response (200)**
```json
{ "success": true, "data": { "message": "Material type deleted successfully" } }
```

### GET /raw-materials/purchases
**Query**: page, limit, materialTypeId, supplierId, status, dateFrom, dateTo

### POST /raw-materials/purchases
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

### PATCH /raw-materials/purchases/:purchaseId
**Request**
```json
{ "quantity": 120.5, "costPerUnit": 13.0, "status": "RECEIVED" }
```

### DELETE /raw-materials/purchases/:purchaseId
**Response (200)**
```json
{ "success": true, "data": { "message": "Purchase deleted successfully" } }
```

### GET /raw-materials/stock
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

### GET /raw-materials/issuances
**Query**: page, limit, materialTypeId, referenceId, dateFrom, dateTo

### POST /raw-materials/issuances
**Request**
```json
{
  "materialTypeId": "uuid",
  "quantity": 10.5,
  "issuedAt": "2026-05-03T12:00:00.000Z",
  "issuedTo": "Worker A",
  "notes": "Manual issue"
}
```

### GET /raw-materials/issuances/:issuanceId
**Response (200)**: RawMaterialIssuance

## 5. Stock Calculation
Stock is computed dynamically:

$$
\text{currentStock} = \sum(\text{purchases.quantity where status=RECEIVED}) - \sum(\text{issuances.quantity})
$$

It is not stored as a column to avoid drift and because purchases/issuances can be updated or soft-deleted.

Only purchases with status = RECEIVED are counted toward stock.

## 6. Issuances
Issuances are currently manual and not linked to worker assignments.

- referenceType is set to "MANUAL" for all API-created issuances.
- referenceId remains null until the WorkerAssignment module is added.

## 7. Soft Delete Behaviour
- RawMaterialType: soft deleted by setting deletedAt and isActive=false.
- RawMaterialPurchase: soft deleted by setting deletedAt.
- RawMaterialIssuance: not soft deleted in current module.

Deletion is blocked when:
- A material type still has remaining stock.
- A purchase’s removal would make stock go negative.

## 8. Usage Examples

### Setup + first purchase
1. Create a material type
2. Create a supplier (Party, type=SUPPLIER)
3. Create a purchase referencing that supplier and type

### Checking stock
1. Call GET /raw-materials/stock
2. Verify currentStock for each type

### Manual issuance
1. Call POST /raw-materials/issuances with quantity and issuedTo
2. Verify stock decreases

## 9. Error Reference
| Error Message | Cause |
| --- | --- |
| Tenant not found | Invalid tenantId path param |
| You do not have access to this tenant | User not a member of tenant |
| Material type not found | Type ID invalid or deleted |
| Material type with this name already exists | Duplicate name within tenant |
| Supplier not found | supplierId invalid or deleted |
| Selected party is not a supplier | supplierId points to non-supplier party |
| Cannot deactivate material type with remaining stock: {value} {unit} | Attempt to delete type with stock > 0 |
| Purchase not found | Purchase ID invalid or deleted |
| Cannot delete purchase because issued quantity exceeds remaining stock | Issuances would make stock negative |
| Issuance not found | Issuance ID invalid |
| Insufficient stock. Available: {currentStock} {unit} | Issuance quantity exceeds available stock |
| Request validation failed | Input schema validation error (details in response) |
