import { Bike, MapPin, Phone, UtensilsCrossed, Wallet } from "lucide-react"
import type { ReactNode } from "react"

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
import { paymentBadgeVariant, statusBadgeVariant } from "@/lib/status"
import { formatDateTime, formatUsd } from "@/lib/utils"
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/types/order"

export function OrderBoard({
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
              Order ticket
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
              {order.paymentMethod ? `${order.paymentMethod} · ` : ""}
              {order.paymentStatus}
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
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Line total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item, index) => (
                      <TableRow key={`${item.name}-${item.size}-${index}`}>
                        <TableCell className="font-medium">
                          {item.name}
                          {item.calories ? (
                            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                              {item.calories} cal
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{item.size || "—"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatUsd(item.price)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatUsd(item.lineTotal ?? item.quantity * item.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="ml-auto w-full max-w-sm space-y-2 rounded-xl bg-muted/70 p-4">
            <TotalRow label="Subtotal" value={formatUsd(order.subtotal)} />
            <TotalRow
              label={
                order.paymentMethod === "COD"
                  ? "Delivery fee (COD)"
                  : order.paymentMethod === "Online"
                    ? "Delivery fee (online)"
                    : "Delivery fee"
              }
              value={formatUsd(order.deliveryFee)}
            />
            <div className="flex items-center justify-between border-t border-border pt-2 font-heading text-lg">
              <span>Total</span>
              <span>{formatUsd(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Update status</CardTitle>
            <CardDescription>
              Move this ticket through the kitchen. Other orders stay on the Orders list.
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
