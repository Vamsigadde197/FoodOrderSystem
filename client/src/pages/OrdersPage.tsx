import { Clock3 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { AppShell } from "@/components/AppShell"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { paymentBadgeVariant, statusBadgeVariant } from "@/lib/status"
import { formatDateTime, formatUsd } from "@/lib/utils"
import type { Order, OrdersResponse } from "@/types/order"

const POLL_MS = 2000

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const response = await fetch("/api/orders")
      if (!response.ok) {
        throw new Error(`Could not load orders (${response.status})`)
      }
      const data = (await response.json()) as OrdersResponse
      setOrders(data.orders ?? [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the kitchen board")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOrders()
    const id = window.setInterval(() => {
      void loadOrders(true)
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [loadOrders])

  return (
    <AppShell
      title="Orders"
      subtitle="All incoming tickets. Open one to see the full kitchen board."
      onRefresh={() => void loadOrders()}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading && orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Loading orders…
          </CardContent>
        </Card>
      ) : null}

      {!loading && orders.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-accent text-primary">
              <Clock3 className="size-6" />
            </div>
            <CardTitle>No orders yet</CardTitle>
            <CardDescription className="max-w-xl">
              POST JSON to <code className="rounded bg-muted px-1.5 py-0.5">/webhook/orders</code>{" "}
              and new tickets will appear here automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {orders.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li key={order.orderId}>
                <Link
                  to={`/orders/${encodeURIComponent(order.orderId)}`}
                  className="block px-4 py-4 transition-colors hover:bg-accent/60 sm:px-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-heading text-lg font-semibold">{order.orderId}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {order.customer.name} · {order.customer.phone}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <Badge variant={statusBadgeVariant(order.orderStatus)}>
                        {order.orderStatus}
                      </Badge>
                      <Badge variant={paymentBadgeVariant(order.paymentStatus)}>
                        {order.paymentStatus}
                      </Badge>
                      <span className="font-heading text-base font-semibold">
                        {formatUsd(order.total)}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AppShell>
  )
}
