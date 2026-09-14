# Food Order Desk

A live kitchen board for incoming food orders. An Express webhook stores the newest order in memory, and a React dashboard polls it so tickets appear without a manual refresh.

## Run locally

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

- Dashboard: http://127.0.0.1:43211
- API: http://127.0.0.1:43212

The Vite dev server proxies `/api` and `/webhook` to the API, so the UI and curl examples can use either port.

## Webhook

`POST /webhook/orders` accepts JSON, validates it, and replaces the latest in-memory order.

Required shape: a JSON object. Missing display fields get safe fallbacks (Guest, —, Unnamed item, computed totals). Malformed JSON or the wrong types (for example `items` not an array) return `400` with an `error` and `details` array. The server does not crash on bad payloads.

### Sample payload

```json
{
  "orderId": "ORD-1001",
  "customer": {
    "name": "Aarav Sharma",
    "phone": "+91 9876543210",
    "address": "12 MG Road, Bengaluru, Karnataka"
  },
  "items": [
    {
      "name": "Margherita Pizza",
      "quantity": 1,
      "price": 399
    },
    {
      "name": "Garlic Bread",
      "quantity": 2,
      "price": 129
    }
  ],
  "subtotal": 657,
  "deliveryFee": 40,
  "total": 697,
  "paymentStatus": "Paid",
  "orderStatus": "Pending",
  "createdAt": "2026-09-14T10:30:00Z"
}
```

A copy lives at `server/sample-order.json`.

### curl

```bash
curl -sS -X POST http://127.0.0.1:43212/webhook/orders \
  -H "Content-Type: application/json" \
  -d @server/sample-order.json
```

Or inline:

```bash
curl -sS -X POST http://127.0.0.1:43211/webhook/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-1001",
    "customer": {
      "name": "Aarav Sharma",
      "phone": "+91 9876543210",
      "address": "12 MG Road, Bengaluru, Karnataka"
    },
    "items": [
      { "name": "Margherita Pizza", "quantity": 1, "price": 399 },
      { "name": "Garlic Bread", "quantity": 2, "price": 129 }
    ],
    "subtotal": 657,
    "deliveryFee": 40,
    "total": 697,
    "paymentStatus": "Paid",
    "orderStatus": "Pending",
    "createdAt": "2026-09-14T10:30:00Z"
  }'
```

### Postman

1. Method: `POST`
2. URL: `http://127.0.0.1:43212/webhook/orders`
3. Headers: `Content-Type: application/json`
4. Body: raw JSON, paste the sample payload
5. Send, then leave the dashboard open — it polls `/api/order` every 2 seconds

### Other endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/order` | Latest order, or `{ "order": null }` |
| PATCH | `/api/order/status` | `{ "orderStatus": "Preparing" }` |
| GET | `/api/health` | Liveness |

Allowed statuses: Pending, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled.

## Notes

Orders are stored in memory only, so a server restart clears the board. Amounts are shown in INR.
