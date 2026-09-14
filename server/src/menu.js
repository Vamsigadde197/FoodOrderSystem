export const SIZE_PRICES = {
  Small: 16.99,
  Medium: 19.99,
  Large: 22.99,
}

export const COD_DELIVERY_FEE = 2

export const PIZZAS = [
  {
    id: "meatzza",
    name: "MeatZZa",
    description:
      "Loaded with pepperoni, ham, seasoned beef, and Italian sausage over cheese and tomato sauce.",
    calories: { Small: 380, Medium: 420, Large: 360 },
  },
  {
    id: "honolulu-hawaiian",
    name: "Honolulu Hawaiian",
    description:
      "Sliced ham, smoked bacon, pineapple, roasted red peppers, and provolone cheese.",
    calories: { Small: 360, Medium: 390, Large: 340 },
  },
  {
    id: "philly-cheese-steak",
    name: "Philly Cheese Steak",
    description:
      "Tender steak, onions, green peppers, mushrooms, and a blend of provolone and American cheese.",
    calories: { Small: 360, Medium: 390, Large: 340 },
  },
  {
    id: "wisconsin-6-cheese",
    name: "Wisconsin 6-Cheese",
    description:
      "A six-cheese blend of mozzarella, feta, provolone, cheddar, Parmesan, and Asiago over tomato sauce.",
    calories: { Small: 360, Medium: 410, Large: 350 },
  },
  {
    id: "pacific-veggie",
    name: "Pacific Veggie",
    description:
      "Roasted red peppers, spinach, onions, mushrooms, tomatoes, black olives, feta, and provolone.",
    calories: { Small: 360, Medium: 410, Large: 350 },
  },
  {
    id: "ultimate-pepperoni",
    name: "Ultimate Pepperoni",
    description: "A double helping of pepperoni with provolone and Parmesan-Asiago cheese.",
    calories: { Small: 340, Medium: 390, Large: 330 },
  },
  {
    id: "memphis-bbq-chicken",
    name: "Memphis BBQ Chicken",
    description: "Grilled chicken, sweet-and-smoky BBQ sauce, onions, cheddar, and mozzarella.",
    calories: { Small: 400, Medium: 480, Large: 380 },
  },
]

function key(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/pizza/g, "")
    .replace(/[^a-z0-9]/g, "")
}

const pizzaByKey = new Map()
for (const pizza of PIZZAS) {
  pizzaByKey.set(key(pizza.name), pizza)
  pizzaByKey.set(key(pizza.id), pizza)
}

export function findPizza(name) {
  if (!name) return null
  return pizzaByKey.get(key(name)) ?? null
}

export function parseSize(value) {
  const raw = String(value || "").trim().toLowerCase()
  if (raw === "s" || raw === "sm" || raw === "small") return "Small"
  if (raw === "m" || raw === "med" || raw === "medium") return "Medium"
  if (raw === "l" || raw === "lg" || raw === "large") return "Large"
  return null
}

export function money(amount) {
  return Math.round(amount * 100) / 100
}

export function parsePaymentMethod(body) {
  const blob = [
    body.paymentMethod,
    body.payment_method,
    body.paymentType,
    body.payment,
    body.paymentStatus,
    body.payment_status,
  ]
    .filter((value) => value !== undefined && value !== null && !isPlaceholder(value))
    .join(" ")
    .toLowerCase()

  if (/\bcod\b|cash on delivery|cash/.test(blob)) {
    return "COD"
  }
  if (/online|whatsapp|card|link|\bpaid\b/.test(blob)) {
    return "Online"
  }
  return null
}

export function isPlaceholder(value) {
  if (value === undefined || value === null) return true
  const text = String(value).trim()
  return text === "" || /^\{\{[^}]+\}\}$/.test(text)
}

function findPizzaInText(text) {
  const haystack = key(text)
  if (!haystack) return null
  const ranked = [...PIZZAS].sort((a, b) => key(b.name).length - key(a.name).length)
  for (const pizza of ranked) {
    if (haystack.includes(key(pizza.name))) return pizza
  }
  return null
}

function parseItemObject(item, index, errors) {
  if (!isPlainObject(item) && typeof item !== "string") {
    errors.push(`items[${index}] must be an object or a string.`)
    return null
  }
  if (typeof item === "string") {
    return parseItemPhrase(item, index, errors)
  }
  const rawName = String(item.name || item.pizza || item.item || "").trim()
  const pizza = findPizza(rawName) || findPizzaInText(rawName)
  if (!pizza) {
    errors.push(`items[${index}] pizza "${rawName || "(empty)"}" is not on the menu.`)
    return null
  }
  const size = parseSize(item.size)
  if (!size) {
    errors.push(`items[${index}].size must be Small, Medium, or Large.`)
    return null
  }
  const quantity = Number(item.quantity)
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1
  return pricedItem(pizza, size, qty)
}

function parseItemPhrase(phrase, index, errors) {
  let chunk = String(phrase).trim()
  if (!chunk) {
    errors.push(`items[${index}] is empty.`)
    return null
  }

  let qty = 1
  const startQty = chunk.match(/^(\d+)\s*[x×]?\s+/i)
  if (startQty) {
    qty = Number(startQty[1])
    chunk = chunk.slice(startQty[0].length).trim()
  }

  const sizeMatch = chunk.match(/\b(small|medium|large|sm|med|lg)\b/i)
  const size = parseSize(sizeMatch?.[1])
  const pizza = findPizzaInText(chunk)

  if (!pizza) {
    errors.push(`Could not match a menu pizza in "${phrase}".`)
    return null
  }
  if (!size) {
    errors.push(`Could not read a size (Small, Medium, or Large) in "${phrase}".`)
    return null
  }
  return pricedItem(pizza, size, qty)
}

function pricedItem(pizza, size, qty) {
  const unitPrice = priceForSize(size)
  return {
    name: pizza.name,
    size,
    calories: pizza.calories[size],
    quantity: qty,
    price: unitPrice,
    lineTotal: money(qty * unitPrice),
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

export function extractRawItems(body) {
  if (Array.isArray(body.items) && body.items.length > 0) return body.items
  if (Array.isArray(body.order_items) && body.order_items.length > 0) return body.order_items
  if (Array.isArray(body.orderItems) && body.orderItems.length > 0) return body.orderItems

  const raw = body.order_items ?? body.orderItems ?? body.items
  if (isPlaceholder(raw)) return []
  if (typeof raw !== "string") return []

  const trimmed = raw.trim()
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) return parsed
      if (isPlainObject(parsed)) return [parsed]
    } catch {
      // fall through to phrase parsing
    }
  }

  return trimmed
    .split(/\n|,|;|\band\b|\+/i)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function resolveItems(body, errors) {
  const rawItems = extractRawItems(body)
  if (rawItems.length === 0) {
    errors.push("`order_items` must list at least one pizza with a size.")
    return []
  }
  return rawItems.map((item, index) => parseItemObject(item, index, errors)).filter(Boolean)
}

export function priceForSize(size) {
  return SIZE_PRICES[size] ?? null
}

export function menuPayload() {
  return {
    currency: "USD",
    sizes: SIZE_PRICES,
    delivery: {
      COD: COD_DELIVERY_FEE,
      Online: 0,
    },
    pizzas: PIZZAS.map((pizza) => ({
      ...pizza,
      prices: { ...SIZE_PRICES },
    })),
  }
}
