# Piece-based inventory migration (frontend guide)

This document describes API breaking changes after migrating finished-goods stock, packaging, orders, and dispatch from **dozens** to **pieces**.

## Summary

- Packaging no longer requires multiples of 12. You can pack any positive piece count (e.g. 400 of 500).
- Orders and dispatch use **pieces** and **price per piece** (aligned with design `salePriceRs`).
- Existing database values were converted: quantities ×12, per-dozen prices ÷12.

## Inventory stock

### Response fields (renamed)

| Before | After |
|--------|-------|
| `packagedDozens` | `packagedPieces` |

`unpackagedPieces` is unchanged.

### POST `/api/tenants/:tenantId/inventory/packaging`

**Request body**

| Before | After |
|--------|-------|
| `dozensPackaged` | `piecesPackaged` |

```json
{
  "designId": "uuid",
  "piecesPackaged": 400,
  "notes": "optional"
}
```

No `× 12` conversion on the client. The backend moves `piecesPackaged` from unpackaged to packaged stock.

### Packaging batch object

| Before | After |
|--------|-------|
| `dozensPackaged` | *(removed)* |
| `piecesUsed` | `piecesPackaged` |

## Orders

### Order item fields

| Before | After |
|--------|-------|
| `quantityDozens` | `quantityPieces` |
| `dispatchedDozens` | `dispatchedPieces` |
| `remainingDozens` | `remainingPieces` |
| `pricePerDozen` | `pricePerPiece` |

### Order computed fields

| Before | After |
|--------|-------|
| `totalDozens` | `totalPieces` |
| `dispatchedDozens` | `dispatchedPieces` |
| `remainingDozens` | `remainingPieces` |

### Create / add / update order item

```json
{
  "designId": "uuid",
  "quantityPieces": 120,
  "pricePerPiece": 100
}
```

If `pricePerPiece` is omitted, the backend defaults to the design’s `salePriceRs` (per piece), **not** `salePriceRs × 12`.

### POST `.../orders/:orderId/dispatch`

Partial dispatch items:

| Before | After |
|--------|-------|
| `dozens` | `pieces` |

```json
{
  "transportMode": "DTDC",
  "items": [
    { "itemId": "uuid", "pieces": 48 }
  ]
}
```

### Dispatch summary

| Before | After |
|--------|-------|
| `dispatchedDozens` | `dispatchedPieces` |
| `totalDozensDispatched` | `totalPiecesDispatched` |
| `dozensDispatched` (nested) | `piecesDispatched` |

## Stock confirmation errors

Shortage payloads now use piece naming:

- `requiredPieces`, `availablePieces`, `shortagePieces`

## PDFs / documents

Invoice and challan columns use pieces:

- Invoice: `quantityPieces`, `pricePerPiece`
- Challan line items: `pieces`; total: `totalPieces`

## UI recommendations

1. **Packaging screen:** Input “pieces to pack” instead of dozens; show `unpackagedPieces` and `packagedPieces`.
2. **Order forms:** Quantity and price per piece; line total = `quantityPieces × pricePerPiece`.
3. **Dispatch:** Allow partial dispatch in any piece count up to `remainingPieces`.
4. **Labels:** Replace “dozen(s)” with “piece(s)” in inventory and order flows.
5. **Design pricing:** Use `salePriceRs` directly as the default unit price on orders.

## Migration checklist for frontend

- [ ] Update TypeScript types / API client for renamed fields
- [ ] Remove all `× 12` / `÷ 12` conversions in packaging and order UIs
- [ ] Update validation messages that mention dozens
- [ ] Re-test order confirm (stock check), pack order (status), and dispatch
- [ ] Verify invoice/challan preview if rendered client-side

## Out of scope

`RawMaterialUnit.DOZEN` for raw material types is unchanged and unrelated to finished-goods packaging.
