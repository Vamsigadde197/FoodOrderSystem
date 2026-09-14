export function statusBadgeVariant(status: string) {
  switch (status) {
    case "Pending":
      return "warning" as const
    case "Confirmed":
      return "info" as const
    case "Preparing":
      return "secondary" as const
    case "Out for Delivery":
      return "default" as const
    case "Delivered":
      return "success" as const
    case "Cancelled":
      return "danger" as const
    default:
      return "muted" as const
  }
}

export function paymentBadgeVariant(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "paid") return "success" as const
  if (normalized === "failed" || normalized === "refunded") return "danger" as const
  return "warning" as const
}
