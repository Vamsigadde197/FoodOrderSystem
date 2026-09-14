import cors from "cors"
import express from "express"

const PORT = Number(process.env.PORT) || 43212
const STATUSES = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
]

let latestOrder = null

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

function normalizeOrder(body) {
  const errors = []

  if (!isPlainObject(body)) {
    return { errors: ["Payload must be a JSON object."] }
  }

  let items = []
  if (body.items === undefined || body.items === null) {
    items = []
  } else if (!Array.isArray(body.items)) {
    errors.push("`items` must be an array.")
  } else {
    items = body.items.map((item, index) => {
      if (!isPlainObject(item)) {
        errors.push(`items[${index}] must be an object.`)
        return null
      }
      const quantity = asNumber(item.quantity)
      const price = asNumber(item.price)
      if (item.quantity !== undefined && item.quantity !== null && quantity === null) {
        errors.push(`items[${index}].quantity must be a number.`)
      }
      if (item.price !== undefined && item.price !== null && price === null) {
        errors.push(`items[${index}].price must be a number.`)
      }
      return {
        name: asString(item.name, "Unnamed item") || "Unnamed item",
        quantity: quantity ?? 1,
        price: price ?? 0,
      }
    }).filter(Boolean)
  }

  let customer = { name: "Guest", phone: "—", address: "—" }
  if (body.customer !== undefined && body.customer !== null) {
    if (!isPlainObject(body.customer)) {
      errors.push("`customer` must be an object.")
    } else {
      customer = {
        name: asString(body.customer.name, "Guest") || "Guest",
        phone: asString(body.customer.phone, "—") || "—",
        address: asString(body.customer.address, "—") || "—",
      }
    }
  }

  if (errors.length > 0) {
    return { errors }
  }

  const computedSubtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  const subtotal = asNumber(body.subtotal) ?? computedSubtotal
  const deliveryFee = asNumber(body.deliveryFee) ?? 0
  const total = asNumber(body.total) ?? subtotal + deliveryFee
  let orderStatus = asString(body.orderStatus, "Pending") || "Pending"
  if (!STATUSES.includes(orderStatus)) {
    orderStatus = "Pending"
  }

  return {
    order: {
      orderId: asString(body.orderId) || `ORD-${Date.now()}`,
      customer,
      items,
      subtotal,
      deliveryFee,
      total,
      paymentStatus: asString(body.paymentStatus, "Pending") || "Pending",
      orderStatus,
      createdAt: asString(body.createdAt) || new Date().toISOString(),
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

app.get("/api/order", (_req, res) => {
  res.json({ order: latestOrder })
})

app.post("/webhook/orders", (req, res) => {
  const result = normalizeOrder(req.body)
  if (result.errors) {
    return res.status(400).json({
      error: "Invalid order payload.",
      details: result.errors,
    })
  }
  latestOrder = result.order
  return res.status(201).json({ order: latestOrder })
})

app.patch("/api/order/status", (req, res) => {
  if (!latestOrder) {
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
  latestOrder = { ...latestOrder, orderStatus: nextStatus }
  return res.json({ order: latestOrder })
})

app.use((_req, res) => {
  res.status(404).json({ error: "Not found." })
})

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Food order API listening on http://127.0.0.1:${PORT}`)
})
