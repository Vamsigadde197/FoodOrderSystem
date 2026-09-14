import { useEffect, useState } from "react"

import { AppShell } from "@/components/AppShell"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatUsd } from "@/lib/utils"

type MenuPizza = {
  id: string
  name: string
  description: string
  calories: Record<string, number>
  prices: Record<string, number>
}

type MenuPayload = {
  sizes: Record<string, number>
  delivery: { COD: number; Online: number }
  pizzas: MenuPizza[]
}

export function MenuPage() {
  const [menu, setMenu] = useState<MenuPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch("/api/menu")
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load menu (${response.status})`)
        setMenu((await response.json()) as MenuPayload)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load the menu")
      })
  }, [])

  return (
    <AppShell
      title="Menu"
      subtitle="Same price by size for every pizza. COD adds $2; online payment has no delivery fee."
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {menu ? (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {Object.entries(menu.sizes).map(([size, price]) => (
              <Badge key={size} variant="secondary">
                {size} {formatUsd(price)}
              </Badge>
            ))}
            <Badge variant="warning">COD delivery {formatUsd(menu.delivery.COD)}</Badge>
            <Badge variant="success">Online delivery {formatUsd(menu.delivery.Online)}</Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {menu.pizzas.map((pizza) => (
              <Card key={pizza.id}>
                <CardHeader>
                  <CardTitle>{pizza.name}</CardTitle>
                  <CardDescription>{pizza.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 text-center text-sm">
                  {(["Small", "Medium", "Large"] as const).map((size) => (
                    <div key={size} className="rounded-xl bg-muted/70 px-2 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {size}
                      </p>
                      <p className="font-heading font-semibold">{formatUsd(pizza.prices[size])}</p>
                      <p className="text-xs text-muted-foreground">{pizza.calories[size]} cal</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : !error ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">Loading menu…</CardContent>
        </Card>
      ) : null}
    </AppShell>
  )
}
