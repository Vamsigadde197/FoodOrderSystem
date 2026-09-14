export const ORDER_STATUSES = [
  "Pending",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type OrderItem = {
  name: string
  size?: string
  calories?: number
  quantity: number
  price: number
  lineTotal?: number
}

export type Customer = {
  name: string
  phone: string
  address: string
}

export type Order = {
  orderId: string
  customer: Customer
  items: OrderItem[]
  subtotal: number
  deliveryFee: number
  total: number
  paymentStatus: string
  paymentMethod?: string
  specialNotes?: string
  orderStatus: OrderStatus | string
  createdAt: string
  receivedAt?: string
}

export type OrderResponse = {
  order: Order | null
}

export type OrdersResponse = {
  orders: Order[]
}

export type ApiError = {
  error: string
  details?: string[]
}
