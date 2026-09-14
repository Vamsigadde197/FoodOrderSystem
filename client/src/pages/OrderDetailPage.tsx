import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { AppShell } from "@/components/AppShell"
import { OrderBoard } from "@/components/OrderBoard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Order, OrderResponse, OrderStatus } from "@/types/order"

const POLL_MS = 2000

export function OrderDetailPage() {
  const { orderId } = useParams()
  const decodedId = orderId ? decodeURIComponent(orderId) : ""
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  const loadOrder = useCallback(
    async (silent = false) => {
      if (!decodedId) return
      try {
        if (!silent) setLoading(true)
        const response = await fetch(`/api/orders/${encodeURIComponent(decodedId)}`)
        if (response.status === 404) {
          setOrder(null)
          setError(null)
          return
        }
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
    },
    [decodedId],
  )

  useEffect(() => {
    void loadOrder()
    const id = window.setInterval(() => {
      void loadOrder(true)
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [loadOrder])

  async function updateStatus(nextStatus: OrderStatus) {
    if (!decodedId) return
    setStatusUpdating(nextStatus)
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(decodedId)}/status`, {
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
    <AppShell
      title={order?.orderId || "Order"}
      subtitle="Full ticket details. Use Orders to go back to the list."
      onRefresh={() => void loadOrder()}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading && !order ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Loading order…
          </CardContent>
        </Card>
      ) : null}

      {!loading && !order ? (
        <Card>
          <CardHeader>
            <CardTitle>Order not found</CardTitle>
            <CardDescription>
              This ticket is not on the board.{" "}
              <Link to="/" className="font-medium text-primary underline-offset-4 hover:underline">
                Back to Orders
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {order ? (
        <OrderBoard order={order} statusUpdating={statusUpdating} onStatusChange={updateStatus} />
      ) : null}
    </AppShell>
  )
}
