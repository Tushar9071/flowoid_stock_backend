# Designs Module Frontend API Documentation

## Recommended Next Module

After `rawMaterial`, the next frontend module should be `Designs`.

Reason:

- Backend route order is `raw-materials` followed by `designs`.
- Designs are required before worker assignments, inventory packaging, and dealer orders.
- Design data contains category, piece rate, sale price, status, and optional supplementary material needs.

Base URL:

```text
/api/tenants/:tenantId/designs
```

Authentication:

```http
Authorization: Bearer <accessToken>
```

Common success response wrapper:

```json
{
  "success": true,
  "data": {}
}
```

Common error response wrapper:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {}
  }
}
```

Supported design statuses:

```json
["ACTIVE", "DISCONTINUED", "DRAFT"]
```

## Frontend Implementation Order

1. Design Categories
2. Designs list and detail
3. Create and update design
4. Change design status
5. Delete design
6. Supplementary needs for a design

Note: supplementary needs require supplementary material types from `/api/tenants/:tenantId/supplementary`. If the supplementary module UI is not ready yet, keep the supplementary needs section hidden or disabled until that module is implemented.

## Data Models

### Design Category

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "Necklace",
  "sortOrder": 1,
  "isActive": true,
  "createdAt": "2026-05-15T08:30:00.000Z",
  "updatedAt": "2026-05-15T08:30:00.000Z",
  "designsCount": 12
}
```

### Design

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "categoryId": "uuid",
  "designCode": "AY-NK-001",
  "name": "Classic Necklace",
  "description": "Premium necklace design",
  "material": "Gold Plated",
  "finish": "Glossy",
  "diamondCount": 24,
  "pieceRateRs": "12.50",
  "salePricePerDozen": "1500.00",
  "imageUrl": "https://example.com/designs/ay-nk-001.jpg",
  "status": "ACTIVE",
  "deletedAt": null,
  "notes": "Fast moving design",
  "createdById": "uuid",
  "createdAt": "2026-05-15T08:30:00.000Z",
  "updatedAt": "2026-05-15T08:30:00.000Z",
  "category": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Necklace",
    "sortOrder": 1,
    "isActive": true,
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:30:00.000Z"
  }
}
```

### Design Supplementary Need

```json
{
  "id": "uuid",
  "designId": "uuid",
  "materialTypeId": "uuid",
  "quantityPerPiece": "2.0000",
  "notes": "Use for center fitting",
  "materialType": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "White Stone 3mm",
    "unit": "pieces",
    "description": "Round white stones",
    "stockQuantity": "5000.0000",
    "isActive": true,
    "deletedAt": null,
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:30:00.000Z"
  }
}
```

## Category APIs

### 1. List Design Categories

```http
GET /api/tenants/:tenantId/designs/categories?page=1&limit=20&isActive=true
```

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| page | number | No | Default `1` |
| limit | number | No | Default `20`, max `100` |
| isActive | boolean | No | `true` or `false` |

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "name": "Necklace",
        "sortOrder": 1,
        "isActive": true,
        "createdAt": "2026-05-15T08:30:00.000Z",
        "updatedAt": "2026-05-15T08:30:00.000Z",
        "designsCount": 12
      }
    ],
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

### 2. Get Design Category By ID

```http
GET /api/tenants/:tenantId/designs/categories/:id
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Necklace",
    "sortOrder": 1,
    "isActive": true,
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:30:00.000Z",
    "designsCount": 12
  }
}
```

### 3. Create Design Category

```http
POST /api/tenants/:tenantId/designs/categories
```

Request:

```json
{
  "name": "Necklace",
  "sortOrder": 1
}
```

Validation:

- `name`: required, string, min 2 chars, max 120 chars
- `sortOrder`: optional integer, default `0`

Response `201`:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Necklace",
    "sortOrder": 1,
    "isActive": true,
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:30:00.000Z",
    "designsCount": 0
  }
}
```

### 4. Update Design Category

```http
PATCH /api/tenants/:tenantId/designs/categories/:id
```

Request:

```json
{
  "name": "Premium Necklace",
  "sortOrder": 2,
  "isActive": true
}
```

Validation:

- At least one field is required.
- `name`: optional, min 2 chars, max 120 chars
- `sortOrder`: optional integer
- `isActive`: optional boolean

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "name": "Premium Necklace",
    "sortOrder": 2,
    "isActive": true,
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:35:00.000Z",
    "designsCount": 12
  }
}
```

### 5. Delete Design Category

```http
DELETE /api/tenants/:tenantId/designs/categories/:id
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Design category deleted successfully"
  }
}
```

Business rule:

- Category cannot be deleted if it has existing designs.

## Design APIs

### 6. List Designs

```http
GET /api/tenants/:tenantId/designs?page=1&limit=20&categoryId=:categoryId&status=ACTIVE&search=necklace
```

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| page | number | No | Default `1` |
| limit | number | No | Default `20`, max `100` |
| categoryId | uuid | No | Filter by category |
| status | string | No | `ACTIVE`, `DISCONTINUED`, `DRAFT` |
| search | string | No | Searches `designCode` and `name` |

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "tenantId": "uuid",
        "categoryId": "uuid",
        "designCode": "AY-NK-001",
        "name": "Classic Necklace",
        "description": "Premium necklace design",
        "material": "Gold Plated",
        "finish": "Glossy",
        "diamondCount": 24,
        "pieceRateRs": "12.50",
        "salePricePerDozen": "1500.00",
        "imageUrl": "https://example.com/designs/ay-nk-001.jpg",
        "status": "ACTIVE",
        "deletedAt": null,
        "notes": "Fast moving design",
        "createdById": "uuid",
        "createdAt": "2026-05-15T08:30:00.000Z",
        "updatedAt": "2026-05-15T08:30:00.000Z",
        "category": {
          "id": "uuid",
          "tenantId": "uuid",
          "name": "Necklace",
          "sortOrder": 1,
          "isActive": true,
          "createdAt": "2026-05-15T08:30:00.000Z",
          "updatedAt": "2026-05-15T08:30:00.000Z"
        }
      }
    ],
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

### 7. Get Design By ID

```http
GET /api/tenants/:tenantId/designs/:id
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "categoryId": "uuid",
    "designCode": "AY-NK-001",
    "name": "Classic Necklace",
    "description": "Premium necklace design",
    "material": "Gold Plated",
    "finish": "Glossy",
    "diamondCount": 24,
    "pieceRateRs": "12.50",
    "salePricePerDozen": "1500.00",
    "imageUrl": "https://example.com/designs/ay-nk-001.jpg",
    "status": "ACTIVE",
    "deletedAt": null,
    "notes": "Fast moving design",
    "createdById": "uuid",
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:30:00.000Z",
    "category": {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Necklace",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-05-15T08:30:00.000Z",
      "updatedAt": "2026-05-15T08:30:00.000Z"
    },
    "supplementaryNeeds": [
      {
        "id": "uuid",
        "designId": "uuid",
        "materialTypeId": "uuid",
        "quantityPerPiece": "2.0000",
        "notes": "Use for center fitting",
        "materialType": {
          "id": "uuid",
          "tenantId": "uuid",
          "name": "White Stone 3mm",
          "unit": "pieces",
          "description": "Round white stones",
          "stockQuantity": "5000.0000",
          "isActive": true,
          "deletedAt": null,
          "createdAt": "2026-05-15T08:30:00.000Z",
          "updatedAt": "2026-05-15T08:30:00.000Z"
        }
      }
    ]
  }
}
```

### 8. Create Design

```http
POST /api/tenants/:tenantId/designs
```

Request:

```json
{
  "categoryId": "uuid",
  "designCode": "AY-NK-001",
  "name": "Classic Necklace",
  "description": "Premium necklace design",
  "material": "Gold Plated",
  "finish": "Glossy",
  "diamondCount": 24,
  "pieceRateRs": 12.5,
  "salePricePerDozen": 1500,
  "imageUrl": "https://example.com/designs/ay-nk-001.jpg",
  "status": "ACTIVE",
  "notes": "Fast moving design"
}
```

Validation:

- `categoryId`: required uuid
- `designCode`: required string, max 120 chars, unique per tenant, saved uppercase
- `name`: required string, min 2 chars, max 160 chars
- `description`: optional string
- `material`: optional string
- `finish`: optional string
- `diamondCount`: required integer, minimum `0`
- `pieceRateRs`: required number, greater than `0`
- `salePricePerDozen`: required number, greater than `0`
- `imageUrl`: optional valid URL
- `status`: optional, default `ACTIVE`
- `notes`: optional string

Response `201`:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "categoryId": "uuid",
    "designCode": "AY-NK-001",
    "name": "Classic Necklace",
    "description": "Premium necklace design",
    "material": "Gold Plated",
    "finish": "Glossy",
    "diamondCount": 24,
    "pieceRateRs": "12.50",
    "salePricePerDozen": "1500.00",
    "imageUrl": "https://example.com/designs/ay-nk-001.jpg",
    "status": "ACTIVE",
    "deletedAt": null,
    "notes": "Fast moving design",
    "createdById": "uuid",
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:30:00.000Z",
    "category": {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Necklace",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-05-15T08:30:00.000Z",
      "updatedAt": "2026-05-15T08:30:00.000Z"
    }
  }
}
```

### 9. Update Design

```http
PATCH /api/tenants/:tenantId/designs/:id
```

Request:

```json
{
  "categoryId": "uuid",
  "designCode": "AY-NK-002",
  "name": "Classic Necklace Updated",
  "description": "Updated description",
  "material": "Silver Plated",
  "finish": "Matte",
  "diamondCount": 30,
  "pieceRateRs": 14,
  "salePricePerDozen": 1700,
  "imageUrl": "https://example.com/designs/ay-nk-002.jpg",
  "status": "ACTIVE",
  "notes": "Updated note"
}
```

Validation:

- At least one field is required.
- Same field rules as create design.
- `status` can be `ACTIVE`, `DISCONTINUED`, or `DRAFT`.

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "categoryId": "uuid",
    "designCode": "AY-NK-002",
    "name": "Classic Necklace Updated",
    "description": "Updated description",
    "material": "Silver Plated",
    "finish": "Matte",
    "diamondCount": 30,
    "pieceRateRs": "14.00",
    "salePricePerDozen": "1700.00",
    "imageUrl": "https://example.com/designs/ay-nk-002.jpg",
    "status": "ACTIVE",
    "deletedAt": null,
    "notes": "Updated note",
    "createdById": "uuid",
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:45:00.000Z",
    "category": {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Necklace",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-05-15T08:30:00.000Z",
      "updatedAt": "2026-05-15T08:30:00.000Z"
    }
  }
}
```

Business rule:

- A design cannot be discontinued if it has active assignments in `ISSUED` or `IN_PROGRESS`.

### 10. Update Design Status

```http
PATCH /api/tenants/:tenantId/designs/:id/status
```

Request:

```json
{
  "status": "DISCONTINUED"
}
```

Validation:

- `status`: required, one of `ACTIVE`, `DISCONTINUED`, `DRAFT`

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "categoryId": "uuid",
    "designCode": "AY-NK-001",
    "name": "Classic Necklace",
    "description": "Premium necklace design",
    "material": "Gold Plated",
    "finish": "Glossy",
    "diamondCount": 24,
    "pieceRateRs": "12.50",
    "salePricePerDozen": "1500.00",
    "imageUrl": "https://example.com/designs/ay-nk-001.jpg",
    "status": "DISCONTINUED",
    "deletedAt": null,
    "notes": "Fast moving design",
    "createdById": "uuid",
    "createdAt": "2026-05-15T08:30:00.000Z",
    "updatedAt": "2026-05-15T08:50:00.000Z",
    "category": {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "Necklace",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-05-15T08:30:00.000Z",
      "updatedAt": "2026-05-15T08:30:00.000Z"
    }
  }
}
```

Business rule:

- A design cannot be discontinued if it has active assignments in `ISSUED` or `IN_PROGRESS`.

### 11. Delete Design

```http
DELETE /api/tenants/:tenantId/designs/:id
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Design deleted successfully"
  }
}
```

Business rule:

- Delete is a soft delete.
- A design cannot be deleted if it has active assignments other than `COMPLETED` or `CLOSED`.

## Design Supplementary Need APIs

### 12. List Supplementary Needs For Design

```http
GET /api/tenants/:tenantId/designs/:id/supplementary-needs
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "designId": "uuid",
      "materialTypeId": "uuid",
      "quantityPerPiece": "2.0000",
      "notes": "Use for center fitting",
      "materialType": {
        "id": "uuid",
        "tenantId": "uuid",
        "name": "White Stone 3mm",
        "unit": "pieces",
        "description": "Round white stones",
        "stockQuantity": "5000.0000",
        "isActive": true,
        "deletedAt": null,
        "createdAt": "2026-05-15T08:30:00.000Z",
        "updatedAt": "2026-05-15T08:30:00.000Z"
      }
    }
  ]
}
```

### 13. Add Supplementary Need To Design

```http
POST /api/tenants/:tenantId/designs/:id/supplementary-needs
```

Request:

```json
{
  "materialTypeId": "uuid",
  "quantityPerPiece": 2,
  "notes": "Use for center fitting"
}
```

Validation:

- `materialTypeId`: required uuid
- `quantityPerPiece`: required number, greater than `0`
- `notes`: optional string

Response `201`:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "designId": "uuid",
    "materialTypeId": "uuid",
    "quantityPerPiece": "2.0000",
    "notes": "Use for center fitting",
    "materialType": {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "White Stone 3mm",
      "unit": "pieces",
      "description": "Round white stones",
      "stockQuantity": "5000.0000",
      "isActive": true,
      "deletedAt": null,
      "createdAt": "2026-05-15T08:30:00.000Z",
      "updatedAt": "2026-05-15T08:30:00.000Z"
    }
  }
}
```

Business rule:

- The same supplementary material type cannot be added twice to the same design.

### 14. Update Supplementary Need

```http
PATCH /api/tenants/:tenantId/designs/:id/supplementary-needs/:needId
```

Request:

```json
{
  "quantityPerPiece": 3,
  "notes": "Updated material need"
}
```

Validation:

- At least one field is required.
- `quantityPerPiece`: optional number, greater than `0`
- `notes`: optional string

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "designId": "uuid",
    "materialTypeId": "uuid",
    "quantityPerPiece": "3.0000",
    "notes": "Updated material need",
    "materialType": {
      "id": "uuid",
      "tenantId": "uuid",
      "name": "White Stone 3mm",
      "unit": "pieces",
      "description": "Round white stones",
      "stockQuantity": "5000.0000",
      "isActive": true,
      "deletedAt": null,
      "createdAt": "2026-05-15T08:30:00.000Z",
      "updatedAt": "2026-05-15T08:30:00.000Z"
    }
  }
}
```

### 15. Remove Supplementary Need

```http
DELETE /api/tenants/:tenantId/designs/:id/supplementary-needs/:needId
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "Design supplementary need removed successfully"
  }
}
```

## Frontend Notes

- Use `GET /categories` to fill the category dropdown before creating a design.
- Show `designCode`, `name`, `category.name`, `pieceRateRs`, `salePricePerDozen`, `diamondCount`, and `status` in the design list.
- Decimal values may come back as strings from Prisma, so treat money and quantities as string or number compatible values in the UI.
- For create and update forms, send numeric fields as numbers where possible.
- `designCode` is normalized to uppercase by the backend.
- Category delete is effectively a deactivate action and only works when there are no designs in the category.
- Design delete is a soft delete and deleted designs are excluded from list/detail APIs.
- Permission middleware is currently commented in the backend route file, but the frontend should still be ready to handle `401` and `403`.

## Useful UI Screens

### Categories

- Category list with search-free pagination
- Create category modal
- Edit category modal
- Active/inactive toggle
- Delete action with confirmation

### Designs

- Design list with filters: category, status, search
- Create design form
- Edit design form
- Design detail view
- Status change action
- Delete action with confirmation

### Supplementary Needs

- Material needs table inside design detail
- Add material need modal
- Edit quantity per piece
- Remove material need action

