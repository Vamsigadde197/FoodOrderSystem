import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  Bike,
  Clock3,
  MapPin,
  Phone,
  RefreshCw,
  UtensilsCrossed,
  Wallet,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime, formatInr } from "@/lib/utils"
import {
  ORDER_STATUSES,
  type Order,
  type OrderResponse,
  type OrderStatus,
} from "@/types/order"

const POLL_MS = 2000

function statusBadgeVariant(status: string) {
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

function paymentBadgeVariant(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === "paid") return "success" as const
  if (normalized === "failed" || normalized === "refunded") return "danger" as const
  return "warning" as const
}

export default function App() {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  const loadOrder = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await fetch("/api/order")
      if (!response.ok) {
        throw new Error(`Could not load the order (${response.status})`)
      }
      const data = (await response.json()) as OrderResponse
      setOrder(data.order)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the kitchen board")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOrder()
    const id = window.setInterval(() => {
      void loadOrder(true)
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [loadOrder])

  async function updateStatus(nextStatus: OrderStatus) {
    if (!order) return
    setStatusUpdating(nextStatus)
    try {
      const response = await fetch("/api/order/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: nextStatus }),
      })
      const data = (await response.json()) as OrderResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Could not update order status")
      }
      setOrder(data.order)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order status")
    } finally {
      setStatusUpdating(null)
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/80 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Live kitchen board
              </p>
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
                Food Order Desk
              </h1>
              <p className="text-sm text-muted-foreground">
                Newest webhook order, refreshed every 2 seconds.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadOrder()} className="self-start">
            <RefreshCw className="size-4" />
            Refresh now
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {error ? (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading && !order ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Loading the latest order…
            </CardContent>
          </Card>
        ) : null}

        {!loading && !order ? (
          <Card>
            <CardHeader className="items-center text-center">
              <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-accent text-primary">
                <Clock3 className="size-6" />
              </div>
              <CardTitle>Waiting for an order</CardTitle>
              <CardDescription className="max-w-xl">
                POST JSON to <code className="rounded bg-muted px-1.5 py-0.5">/webhook/orders</code>{" "}
                and it will show up here automatically. See the README for a curl and Postman
                example.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {order ? <OrderBoard order={order} statusUpdating={statusUpdating} onStatusChange={updateStatus} /> : null}
      </main>
    </div>
  )
}

function OrderBoard({
  order,
  statusUpdating,
  onStatusChange,
}: {
  order: Order
  statusUpdating: string | null
  onStatusChange: (status: OrderStatus) => void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current ticket
            </p>
            <CardTitle className="text-2xl">{order.orderId}</CardTitle>
            <CardDescription>
              Placed {formatDateTime(order.createdAt)}
              {order.receivedAt ? ` · received ${formatDateTime(order.receivedAt)}` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusBadgeVariant(order.orderStatus)}>{order.orderStatus}</Badge>
            <Badge variant={paymentBadgeVariant(order.paymentStatus)}>
              Payment {order.paymentStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoChip icon={<Wallet className="size-4" />} label="Customer" value={order.customer.name} />
            <InfoChip icon={<Phone className="size-4" />} label="Phone" value={order.customer.phone} />
            <InfoChip icon={<MapPin className="size-4" />} label="Address" value={order.customer.address} />
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <UtensilsCrossed className="size-4 text-primary" />
              <h3 className="font-heading text-base font-semibold">Ordered items</h3>
            </div>
            {order.items.length === 0 ? (
              <p className="rounded-xl bg-muted px-4 py-6 text-sm text-muted-foreground">
                This order has no items.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item, index) => (
                      <TableRow key={`${item.name}-${index}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatInr(item.price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatInr(item.quantity * item.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="ml-auto w-full max-w-sm space-y-2 rounded-xl bg-muted/70 p-4">
            <TotalRow label="Subtotal" value={formatInr(order.subtotal)} />
            <TotalRow label="Delivery fee" value={formatInr(order.deliveryFee)} />
            <div className="flex items-center justify-between border-t border-border pt-2 font-heading text-lg">
              <span>Total</span>
              <span>{formatInr(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
            <CardDescription>
              Move this ticket through the kitchen. The next webhook replaces the current order.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {ORDER_STATUSES.map((status) => {
              const active = order.orderStatus === status
              return (
                <Button
                  key={status}
                  variant={active ? "default" : "outline"}
                  disabled={active || statusUpdating !== null}
                  onClick={() => onStatusChange(status)}
                  className="justify-start"
                >
                  {statusUpdating === status ? "Updating…" : status}
                </Button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="size-4 text-secondary" />
              Delivery snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Deliver to</span>
              <br />
              <span className="font-medium">{order.customer.address}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Call</span>
              <br />
              <span className="font-medium">{order.customer.phone}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-sm font-medium leading-snug">{value}</p>
    </div>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
