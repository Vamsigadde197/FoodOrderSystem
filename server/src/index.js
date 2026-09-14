import cors from "cors"
import express from "express"

import {
  COD_DELIVERY_FEE,
  isPlaceholder,
  menuPayload,
  money,
  parsePaymentMethod,
  resolveItems,
} from "./menu.js"

const PORT = Number(process.env.PORT) || 43212
const STATUSES = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
]

const ordersById = new Map()

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function asString(value, fallback = "") {
  if (value === undefined || value === null) return fallback
  if (typeof value === "string") return value.trim()
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return fallback
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

function listOrders() {
  return Array.from(ordersById.values()).sort((a, b) => {
    const aTime = new Date(a.receivedAt || a.createdAt).getTime()
    const bTime = new Date(b.receivedAt || b.createdAt).getTime()
    return bTime - aTime
  })
}

function newestOrder() {
  return listOrders()[0] ?? null
}

function normalizeOrder(body) {
  const errors = []

  if (!isPlainObject(body)) {
    return { errors: ["Payload must be a JSON object."] }
  }

  const paymentMethod = parsePaymentMethod(body)
  if (!paymentMethod) {
    errors.push("`payment_method` must be `COD` or `Online`.")
  }

  const items = resolveItems(body, errors)

  const nested = isPlainObject(body.customer) ? body.customer : {}
  const customer = {
    name:
      asString(body.customer_name) ||
      asString(nested.name) ||
      "Guest",
    phone:
      asString(body.phone_number) ||
      asString(nested.phone) ||
      "—",
    address:
      asString(body.delivery_address) ||
      asString(nested.address) ||
      "—",
  }
  if (isPlaceholder(body.customer_name) && !asString(nested.name)) {
    customer.name = "Guest"
  }
  if (isPlaceholder(body.phone_number) && !asString(nested.phone)) {
    customer.phone = "—"
  }
  if (isPlaceholder(body.delivery_address) && !asString(nested.address)) {
    customer.address = "—"
  }

  const specialNotes =
    asString(body.special_notes) ||
    asString(body.specialNotes) ||
    asString(body.notes) ||
    ""
  const notes = isPlaceholder(specialNotes) ? "" : specialNotes

  if (errors.length > 0) {
    return { errors }
  }

  const subtotal = money(items.reduce((sum, item) => sum + item.lineTotal, 0))
  const deliveryFee = paymentMethod === "COD" ? COD_DELIVERY_FEE : 0
  const total = money(subtotal + deliveryFee)

  let paymentStatus = asString(body.paymentStatus || body.payment_status)
  if (!paymentStatus || isPlaceholder(paymentStatus)) {
    paymentStatus = paymentMethod === "Online" ? "Paid" : "COD"
  }

  let orderStatus = asString(body.orderStatus || body.order_status, "Pending") || "Pending"
  if (!STATUSES.includes(orderStatus)) {
    orderStatus = "Pending"
  }

  return {
    order: {
      orderId:
        asString(body.orderId || body.order_id) || `ORD-${Date.now()}`,
      customer,
      items,
      subtotal,
      deliveryFee,
      total,
      paymentMethod,
      paymentStatus,
      orderStatus,
      specialNotes: notes,
      createdAt: asString(body.createdAt || body.created_at) || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    },
  }
}

const app = express()
app.use(cors())
app.use(express.json({ limit: "100kb" }))

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError) {
    return res.status(400).json({
      error: "Malformed JSON payload.",
      details: [error.message],
    })
  }
  return next(error)
})

app.get("/api/health", (_req, res) => {
  res.json({ ok: true })
})

app.get("/api/menu", (_req, res) => {
  res.json(menuPayload())
})

app.get("/api/orders", (_req, res) => {
  res.json({ orders: listOrders() })
})

app.get("/api/orders/:orderId", (req, res) => {
  const order = ordersById.get(req.params.orderId)
  if (!order) {
    return res.status(404).json({ error: "Order not found." })
  }
  return res.json({ order })
})

app.patch("/api/orders/:orderId/status", (req, res) => {
  const existing = ordersById.get(req.params.orderId)
  if (!existing) {
    return res.status(404).json({ error: "Order not found." })
  }
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: "Payload must be a JSON object." })
  }
  const nextStatus = asString(req.body.orderStatus)
  if (!STATUSES.includes(nextStatus)) {
    return res.status(400).json({
      error: "Invalid order status.",
      details: [`Use one of: ${STATUSES.join(", ")}`],
    })
  }
  const order = { ...existing, orderStatus: nextStatus }
  ordersById.set(order.orderId, order)
  return res.json({ order })
})

app.get("/api/order", (_req, res) => {
  res.json({ order: newestOrder() })
})

app.post("/webhook/orders", (req, res) => {
  const result = normalizeOrder(req.body)
  if (result.errors) {
    return res.status(400).json({
      error: "Invalid order payload.",
      details: result.errors,
    })
  }
  ordersById.set(result.order.orderId, result.order)
  return res.status(201).json({ order: result.order })
})

app.patch("/api/order/status", (req, res) => {
  const existing = newestOrder()
  if (!existing) {
    return res.status(404).json({ error: "No order has been received yet." })
  }
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: "Payload must be a JSON object." })
  }
  const nextStatus = asString(req.body.orderStatus)
  if (!STATUSES.includes(nextStatus)) {
    return res.status(400).json({
      error: "Invalid order status.",
      details: [`Use one of: ${STATUSES.join(", ")}`],
    })
  }
  const order = { ...existing, orderStatus: nextStatus }
  ordersById.set(order.orderId, order)
  return res.json({ order })
})

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Food order API listening on http://127.0.0.1:${PORT}`)
})
