# Food Order Desk

A live kitchen board for incoming food orders. An Express webhook stores every order in memory. Open **Orders** to see the full list, then click a ticket to view the kitchen board. Amounts are shown in USD. The list and detail views poll every 2 seconds so new webhook orders appear without a refresh.

## Run locally

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

- Dashboard: http://127.0.0.1:43211
- API: http://127.0.0.1:43212

## Deploy on Render

This is a Node web service from the **repo root** (do not set Root Directory to `server`).

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`

Render sets `PORT` automatically. After deploy:

- Dashboard: `https://<your-service>.onrender.com`
- Webhook: `https://<your-service>.onrender.com/webhook/orders`

## Webhook

`POST /webhook/orders` accepts the voice-agent payload (`customer_name`, `order_items`, `payment_method`, …). Pizza names and sizes are looked up on the menu. Incoming `delivery_fee` and prices are ignored; the API calculates unit price, line total, subtotal, delivery fee, and total.

- Small $16.99 · Medium $19.99 · Large $22.99 (all pizzas)
- `payment_method`: `COD` adds $2; `Online` adds $0
- `order_items` can be a sentence like `1 Large MeatZZa, 2 Medium Pacific Veggie`
- Unknown pizza names or missing sizes return `400`

### Sample payload

```json
{
  "customer_name": "Aarav Sharma",
  "phone_number": "+91 9876543210",
  "delivery_address": "12 MG Road, Bengaluru, Karnataka",
  "order_items": "1 Large MeatZZa, 2 Medium Pacific Veggie",
  "payment_method": "COD",
  "delivery_fee": "",
  "special_notes": "Ring the bell twice"
}
```

Calculated: Large MeatZZa $22.99 + 2× Medium Pacific Veggie $39.98 + COD $2 = **$64.97**.

A copy lives at `server/sample-order.json`. Menu: GET `/api/menu`.

### curl

```bash
curl -sS -X POST http://127.0.0.1:43212/webhook/orders \
  -H "Content-Type: application/json" \
  -d @server/sample-order.json
```

Or inline:

```bash
curl -sS -X POST http://127.0.0.1:43212/webhook/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-2001",
    "customer": {
      "name": "Aarav Sharma",
      "phone": "+91 9876543210",
      "address": "12 MG Road, Bengaluru, Karnataka"
    },
    "items": [
      { "name": "MeatZZa", "size": "Large", "quantity": 1 },
      { "name": "Pacific Veggie", "size": "Medium", "quantity": 2 }
    ],
    "paymentMethod": "COD"
  }'
```

### Postman

1. Method: `POST`
2. URL: `http://127.0.0.1:43212/webhook/orders`
3. Headers: `Content-Type: application/json`
4. Body: raw JSON, paste the sample payload
5. Send, then open **Orders** on the dashboard — it polls `/api/orders` every 2 seconds. Click a row for the full ticket.

### Other endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/orders` | All orders, newest first |
| GET | `/api/orders/:orderId` | One order |
| PATCH | `/api/orders/:orderId/status` | `{ "orderStatus": "Preparing" }` |
| GET | `/api/order` | Newest order, or `{ "order": null }` |
| PATCH | `/api/order/status` | Update newest order status |
| GET | `/api/menu` | Pizza catalog, sizes, and fees |
| GET | `/api/health` | Liveness |

Allowed statuses: Pending, Confirmed, Preparing, Out for Delivery, Delivered, Cancelled.

## Notes

Orders are stored in memory only, so a server restart clears the board. Amounts are shown in USD.
