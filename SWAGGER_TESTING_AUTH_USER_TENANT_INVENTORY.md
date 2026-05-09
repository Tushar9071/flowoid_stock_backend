# Swagger Testing Guide: Auth, Users, Tenants, Inventory

Base URL:

```text
http://localhost:3000
```

Swagger URL:

```text
http://localhost:3000/api/docs
```

Start server:

```bash
pnpm dev
```

Important notes:

- Click **Try it out** before sending each request in Swagger.
- Auth uses HTTP-only cookies. After successful login/register in Swagger, protected APIs should work automatically in the same browser tab.
- If you get `403 FORBIDDEN`, your role is missing required permissions.
- Inventory routes need:

```text
inventory.read
inventory.create
inventory.update
```

User routes need:

```text
users.create
users.read
users.update
users.delete
```

Keep these IDs after testing:

```text
USER_ID=
TENANT_ID=
DESIGN_ID=
PACKAGING_BATCH_ID=
```

---

## 1. Auth Module

### 1.1 Register User

Method:

```http
POST /api/auth/register
```

Request JSON:

```json
{
  "name": "Test Owner",
  "email": "owner@example.com",
  "phone": "9876543210",
  "password": "Password123"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Test Owner",
      "email": "owner@example.com",
      "phone": "9876543210",
      "role": "..."
    }
  }
}
```

Save:

```text
USER_ID = data.user.id
```

Note: If phone/email already exists, use login instead.

---

### 1.2 Login

Method:

```http
POST /api/auth/login
```

Request JSON using phone:

```json
{
  "phone": "9876543210",
  "password": "Password123"
}
```

Or using email:

```json
{
  "email": "owner@example.com",
  "password": "Password123"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Test Owner",
      "email": "owner@example.com",
      "phone": "9876543210",
      "role": "..."
    }
  }
}
```

Important: Tokens are stored in cookies by the browser. The response does not show `accessToken`.

---

### 1.3 Get Current User

Method:

```http
GET /api/auth/me
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Test Owner",
    "email": "owner@example.com",
    "phone": "9876543210",
    "role": "..."
  }
}
```

---

### 1.4 Get My Permissions

Method:

```http
GET /api/auth/my-permissions
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": [
    "users.read",
    "inventory.read"
  ]
}
```

Check that inventory/user permissions exist before testing those modules.

---

### 1.5 Change Password

Method:

```http
POST /api/auth/change-password
```

Request JSON:

```json
{
  "currentPassword": "Password123",
  "newPassword": "Password456"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully. Please log in again."
  }
}
```

Note: This clears auth cookies. Login again with the new password.

---

### 1.6 Refresh Session

Method:

```http
POST /api/auth/refresh
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Test Owner",
      "email": "owner@example.com",
      "phone": "9876543210",
      "role": "..."
    }
  }
}
```

Note: Requires valid `refreshToken` cookie.

---

### 1.7 Logout

Method:

```http
POST /api/auth/logout
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## 2. Tenant Module

Login first before testing tenants.

### 2.1 Create Tenant

Method:

```http
POST /api/tenants
```

Request JSON:

```json
{
  "name": "Ayanshi Test Business",
  "slug": "ayanshi-test-business",
  "email": "business@example.com",
  "phone": "9876543211",
  "address": "Surat, Gujarat",
  "logoUrl": "https://example.com/logo.png",
  "businessCategory": "Imitation Jewellery"
}
```

Minimum request JSON:

```json
{
  "name": "Ayanshi Test Business"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Ayanshi Test Business",
    "slug": "ayanshi-test-business"
  }
}
```

Save:

```text
TENANT_ID = data.id
```

---

### 2.2 Get My Tenants

Method:

```http
GET /api/tenants/mine
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Ayanshi Test Business",
      "slug": "ayanshi-test-business"
    }
  ]
}
```

Save:

```text
TENANT_ID = data[0].id
```

---

## 3. User Module

Login first. Your role must have user permissions.

### 3.1 Create User

Method:

```http
POST /api/users
```

Request JSON:

```json
{
  "name": "Staff User",
  "email": "staff@example.com",
  "phone": "9876543220",
  "password": "Password123",
  "isActive": true
}
```

With role:

```json
{
  "name": "Staff User",
  "email": "staff@example.com",
  "phone": "9876543220",
  "password": "Password123",
  "roleId": "ROLE_UUID_HERE",
  "isActive": true
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Staff User",
    "email": "staff@example.com",
    "phone": "9876543220",
    "isActive": true
  }
}
```

Save:

```text
USER_ID = data.id
```

---

### 3.2 List Users

Method:

```http
GET /api/users
```

Query params:

```text
search=staff
isActive=true
roleId=ROLE_UUID_HERE
```

All query params are optional.

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Staff User",
      "email": "staff@example.com",
      "phone": "9876543220"
    }
  ]
}
```

---

### 3.3 Get User By ID

Method:

```http
GET /api/users/{id}
```

Example:

```http
GET /api/users/USER_ID
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "name": "Staff User"
  }
}
```

---

### 3.4 Update User

Method:

```http
PUT /api/users/{id}
```

Request JSON:

```json
{
  "name": "Staff User Updated",
  "email": "staff.updated@example.com",
  "phone": "9876543221",
  "isActive": true
}
```

Optional password update:

```json
{
  "password": "NewPassword123"
}
```

Optional role update:

```json
{
  "roleId": "ROLE_UUID_HERE"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "name": "Staff User Updated",
    "email": "staff.updated@example.com",
    "phone": "9876543221"
  }
}
```

---

### 3.5 Deactivate User

Method:

```http
DELETE /api/users/{id}
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "id": "USER_ID",
    "isActive": false
  }
}
```

---

## 4. Inventory Module

Login first. Use a valid `TENANT_ID`.

Inventory needs a valid `DESIGN_ID`. You can get this from the Designs module:

```http
GET /api/tenants/{tenantId}/designs
```

If you do not have goods returns yet, use the adjustment endpoint below to add test unpackaged stock.

---

### 4.1 Add Test Unpackaged Stock By Adjustment

Use this only for testing/correction.

Method:

```http
POST /api/tenants/{tenantId}/inventory/stock/{designId}/adjustment
```

Example:

```http
POST /api/tenants/TENANT_ID/inventory/stock/DESIGN_ID/adjustment
```

Request JSON:

```json
{
  "type": "UNPACKAGED",
  "adjustment": 60,
  "notes": "Opening test unpackaged stock for Swagger testing"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "adjustment": {
      "id": "...",
      "type": "UNPACKAGED",
      "adjustment": 60,
      "notes": "Opening test unpackaged stock for Swagger testing"
    },
    "stock": {
      "designId": "DESIGN_ID",
      "unpackagedPieces": 60,
      "packagedDozens": 0
    }
  }
}
```

---

### 4.2 Get Stock Overview

Method:

```http
GET /api/tenants/{tenantId}/inventory/stock
```

Query params:

```text
page=1
limit=20
designId=DESIGN_ID
categoryId=CATEGORY_ID
isLow=true
```

All query params are optional.

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "designId": "DESIGN_ID",
        "unpackagedPieces": 60,
        "packagedDozens": 0,
        "lowStockAlertAt": 0,
        "isLow": false
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

---

### 4.3 Get Single Design Stock

Method:

```http
GET /api/tenants/{tenantId}/inventory/stock/{designId}
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "designId": "DESIGN_ID",
    "unpackagedPieces": 60,
    "packagedDozens": 0,
    "packagingBatches": []
  }
}
```

---

### 4.4 Create Packaging Batch

Method:

```http
POST /api/tenants/{tenantId}/inventory/packaging
```

Request JSON:

```json
{
  "designId": "DESIGN_ID",
  "dozensPackaged": 3,
  "notes": "Packed from Swagger test"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "batch": {
      "id": "...",
      "designId": "DESIGN_ID",
      "dozensPackaged": 3,
      "piecesUsed": 36,
      "notes": "Packed from Swagger test"
    },
    "stock": {
      "designId": "DESIGN_ID",
      "unpackagedPieces": 24,
      "packagedDozens": 3
    }
  }
}
```

Save:

```text
PACKAGING_BATCH_ID = data.batch.id
```

Rule:

```text
piecesUsed = dozensPackaged * 12
```

---

### 4.5 List Packaging Batches

Method:

```http
GET /api/tenants/{tenantId}/inventory/packaging
```

Query params:

```text
page=1
limit=20
designId=DESIGN_ID
dateFrom=2026-05-01T00:00:00.000Z
dateTo=2026-05-31T23:59:59.999Z
```

All query params are optional.

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "PACKAGING_BATCH_ID",
        "designId": "DESIGN_ID",
        "dozensPackaged": 3,
        "piecesUsed": 36
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20
    }
  }
}
```

---

### 4.6 Get Packaging Batch By ID

Method:

```http
GET /api/tenants/{tenantId}/inventory/packaging/{batchId}
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": {
    "id": "PACKAGING_BATCH_ID",
    "designId": "DESIGN_ID",
    "dozensPackaged": 3,
    "piecesUsed": 36
  }
}
```

---

### 4.7 Set Low Stock Alert

Method:

```http
PATCH /api/tenants/{tenantId}/inventory/stock/{designId}/alert
```

Request JSON:

```json
{
  "lowStockAlertAt": 5
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "designId": "DESIGN_ID",
    "packagedDozens": 3,
    "lowStockAlertAt": 5,
    "isLow": true
  }
}
```

---

### 4.8 Get Low Stock Alerts

Method:

```http
GET /api/tenants/{tenantId}/inventory/stock/alerts
```

Request JSON:

```text
No body
```

Expected:

```json
{
  "success": true,
  "data": [
    {
      "designId": "DESIGN_ID",
      "packagedDozens": 3,
      "lowStockAlertAt": 5,
      "deficitDozens": 2
    }
  ]
}
```

---

### 4.9 Reduce Packaged Stock By Adjustment

Method:

```http
POST /api/tenants/{tenantId}/inventory/stock/{designId}/adjustment
```

Request JSON:

```json
{
  "type": "PACKAGED",
  "adjustment": -1,
  "notes": "Manual correction after recount"
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "adjustment": {
      "type": "PACKAGED",
      "adjustment": -1
    },
    "stock": {
      "packagedDozens": 2
    }
  }
}
```

Invalid example:

```json
{
  "type": "PACKAGED",
  "adjustment": -999,
  "notes": "Bad test"
}
```

Expected error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Adjustment would make packaged stock negative. Available: 2 dozens",
    "details": null
  }
}
```

---

## 5. Recommended Easy Test Order

Use this order if you are testing from zero:

1. `POST /api/auth/login`
2. `GET /api/auth/me`
3. `GET /api/auth/my-permissions`
4. `POST /api/tenants` or `GET /api/tenants/mine`
5. Copy `TENANT_ID`
6. Get or create a design from Designs module
7. Copy `DESIGN_ID`
8. `POST /inventory/stock/{designId}/adjustment` with `UNPACKAGED +60`
9. `GET /inventory/stock`
10. `POST /inventory/packaging` with `dozensPackaged: 3`
11. `GET /inventory/packaging`
12. `PATCH /inventory/stock/{designId}/alert`
13. `GET /inventory/stock/alerts`

