import cors from "cors"
import express from "express"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  COD_DELIVERY_FEE,
  isPlaceholder,
  menuPayload,
  money,
  parsePaymentMethod,
  resolveItems,
} from "./menu.js"

const PORT = Number(process.env.PORT) || 43212
const clientDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../client/dist",
)
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

function firstLive(...values) {
  for (const value of values) {
    if (!isPlaceholder(value)) return value
  }
  return undefined
}

function flattenVoicePayload(body) {
  if (!isPlainObject(body)) return body
  const dimensions = isPlainObject(body.analysis?.dimensions)
    ? body.analysis.dimensions
    : {}
  const callee = isPlainObject(body.callee) ? body.callee : {}
  return {
    ...dimensions,
    ...body,
    customer_name: firstLive(body.customer_name, dimensions.customer_name),
    phone_number: firstLive(
      body.phone_number,
      callee.phone,
      dimensions.phone_number,
    ),
    delivery_address: firstLive(
      body.delivery_address,
      dimensions.delivery_address,
    ),
    order_items: firstLive(body.order_items, dimensions.order_items),
    payment_method: firstLive(body.payment_method, dimensions.payment_method),
  }
}

function parseJsonBody(raw) {
  const text = String(raw || "").trim()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return JSON.parse(text.replace(/,(\s*[}\]])/g, "$1"))
  }
}

function normalizeOrder(rawBody) {
  const errors = []
  const body = flattenVoicePayload(rawBody)

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
app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next()
  const type = req.headers["content-type"] || ""
  if (!type.includes("json")) return next()

  const chunks = []
  let size = 0
  req.on("data", (chunk) => {
    size += chunk.length
    if (size > 100 * 1024) {
      req.destroy()
      return next(Object.assign(new Error("Payload too large."), { status: 413 }))
    }
    chunks.push(chunk)
  })
  req.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8")
    try {
      req.body = parseJsonBody(raw)
      return next()
    } catch (error) {
      error.status = 400
      return next(error)
    }
  })
})

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

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next()
    if (req.path.startsWith("/api") || req.path.startsWith("/webhook")) return next()
    return res.sendFile(path.join(clientDist, "index.html"))
  })
} else {
  app.get("/", (_req, res) => {
    res.json({
      ok: true,
      health: "/api/health",
      orders: "/api/orders",
      menu: "/api/menu",
      webhook: "POST /webhook/orders",
    })
  })
}

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Food order API listening on http://127.0.0.1:${PORT}`)
})
