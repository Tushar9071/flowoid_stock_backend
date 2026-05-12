# Swagger Testing Guide: Orders and Dispatch

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

Required permissions:

```text
orders.read
orders.create
orders.update
orders.dispatch
orders.cancel
```

Keep these IDs while testing:

```text
TENANT_ID=
DEALER_ID=
DESIGN_ID=
ORDER_ID=
ORDER_ITEM_ID=
```

## Prerequisites

1. Login or register a user.
2. Create or select a tenant.
3. Create a dealer party with `type = DEALER`.
4. Create a design with `status = ACTIVE`.
5. Add packaged stock for the design through inventory setup:

```http
POST /api/tenants/{tenantId}/inventory/stock/{designId}/adjustment
```

```json
{
  "type": "PACKAGED",
  "adjustment": 20,
  "notes": "Opening packaged stock for order testing"
}
```

## Test Flow

### 1. Create Draft Order

```http
POST /api/tenants/{tenantId}/orders
```

```json
{
  "dealerId": "DEALER_ID",
  "isCreditOrder": true,
  "items": [
    {
      "designId": "DESIGN_ID",
      "quantityDozens": 5
    }
  ],
  "discountAmount": 0,
  "notes": "Swagger order test"
}
```

Save:

```text
ORDER_ID = data.id
ORDER_ITEM_ID = data.items[0].id
```

### 2. Confirm Order

```http
PATCH /api/tenants/{tenantId}/orders/{orderId}/confirm
```

This validates packaged stock but does not deduct stock.

### 3. Pack Order

```http
PATCH /api/tenants/{tenantId}/orders/{orderId}/pack
```

### 4. Dispatch Order

Dispatch all remaining dozens:

```http
PATCH /api/tenants/{tenantId}/orders/{orderId}/dispatch
```

```json
{
  "transportMode": "DTDC",
  "trackingRef": "D123456789"
}
```

Partial dispatch:

```json
{
  "transportMode": "DTDC",
  "trackingRef": "D123456789",
  "items": [
    {
      "itemId": "ORDER_ITEM_ID",
      "dozens": 2
    }
  ]
}
```

Dispatch deducts packaged stock and creates a `SALE` party ledger entry.

### 5. Dispatch Summary

```http
GET /api/tenants/{tenantId}/orders/{orderId}/dispatch-summary
```

Use this response for a packing slip or delivery challan.

### 6. Overdue Orders

```http
GET /api/tenants/{tenantId}/orders/overdue
```

Returns dispatched credit orders where `dueDate` is in the past.

## Important Rules

- Orders start in `DRAFT`.
- Draft orders do not validate stock.
- Only draft orders can be edited.
- Confirmation validates packaged stock and reserves it conceptually.
- Dispatch deducts packaged stock.
- Cancellation is allowed until full dispatch.
- Order totals are always calculated by the server.
