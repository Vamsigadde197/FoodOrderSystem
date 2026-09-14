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
    body.paymentType,
    body.payment,
    body.paymentStatus,
  ]
    .filter((value) => value !== undefined && value !== null)
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
