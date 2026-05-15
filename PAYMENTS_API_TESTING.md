# Payments API Testing

## Common Request Setup

- Base URL pattern: `/api/tenants/<tenant-uuid>`
- Payments base path: `/api/tenants/<tenant-uuid>/payments`
- Payment PDF documents path: `/api/tenants/<tenant-uuid>/documents/payments`
- Authentication header: `Authorization: Bearer <token>`
- Content-Type: `application/json`

## Dealer Payments

### POST `/api/tenants/<tenant-uuid>/payments/dealer`

Create a dealer receipt when allocations are provided, or a dealer advance when no allocations are provided.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>"
  },
  "body": {
    "partyId": "<dealer-party-uuid>",
    "amount": 18500.75,
    "paymentMethod": "UPI",
    "paymentDate": "2026-05-14T10:30:00.000Z",
    "referenceNumber": "UPI626135904821",
    "bankName": "HDFC Bank",
    "accountNumber": "XXXX2381",
    "notes": "Receipt against May dispatch invoices",
    "allocations": [
      {
        "orderId": "<order-uuid-1>",
        "amount": 12000.5
      },
      {
        "orderId": "<order-uuid-2>",
        "amount": 6500.25
      }
    ]
  }
}
```

## Supplier Payments

### POST `/api/tenants/<tenant-uuid>/payments/supplier`

Create a payment made to a supplier.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>"
  },
  "body": {
    "partyId": "<supplier-party-uuid>",
    "amount": 24750,
    "paymentMethod": "BANK_TRANSFER",
    "paymentDate": "2026-05-14T12:15:00.000Z",
    "referenceNumber": "NEFT202605140091",
    "bankName": "ICICI Bank",
    "accountNumber": "XXXX7842",
    "notes": "Payment for raw material purchase bill RM-2026-041"
  }
}
```

## Payment Status

### GET `/api/tenants/<tenant-uuid>/payments/<payment-uuid>`

Get details for a single payment.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>",
    "paymentId": "<payment-uuid>"
  },
  "query": {}
}
```

### PATCH `/api/tenants/<tenant-uuid>/payments/<payment-uuid>/status`

Update payment status and create a reversal ledger entry when marking a payment as bounced or cancelled.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>",
    "paymentId": "<payment-uuid>"
  },
  "body": {
    "paymentStatus": "BOUNCED",
    "notes": "Cheque returned by bank due to insufficient funds"
  }
}
```

## Outstanding & Reports

### GET `/api/tenants/<tenant-uuid>/payments`

List payments with optional filters and pagination.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>"
  },
  "query": {
    "partyId": "<party-uuid>",
    "paymentNature": "DEALER_RECEIPT",
    "paymentMethod": "UPI",
    "paymentStatus": "CLEARED",
    "dateFrom": "2026-05-01T00:00:00.000Z",
    "dateTo": "2026-05-14T23:59:59.999Z",
    "page": 1,
    "limit": 20
  }
}
```

### GET `/api/tenants/<tenant-uuid>/payments/party/<party-uuid>/outstanding`

Get outstanding balance totals for one party from ledger entries.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>",
    "partyId": "<party-uuid>"
  },
  "query": {}
}
```

### GET `/api/tenants/<tenant-uuid>/payments/aging-report`

Get dealer-wise aging buckets as of a selected date.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>"
  },
  "query": {
    "asOfDate": "2026-05-14T23:59:59.999Z"
  }
}
```

### GET `/api/tenants/<tenant-uuid>/payments/cashflow`

Get daily cash flow summary for payments received and paid out.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>"
  },
  "query": {
    "date": "2026-05-14T00:00:00.000Z"
  }
}
```

## Documents (PDF endpoints)

### GET `/api/tenants/<tenant-uuid>/documents/payments/<payment-uuid>/receipt`

Generate a payment receipt PDF for a payment.

```json
{
  "params": {
    "tenantId": "<tenant-uuid>",
    "paymentId": "<payment-uuid>"
  },
  "query": {}
}
```
