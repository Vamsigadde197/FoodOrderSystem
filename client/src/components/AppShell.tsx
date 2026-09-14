import { ClipboardList, RefreshCw, UtensilsCrossed } from "lucide-react"
import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"

import { Button } from "@/components/ui/button"

type AppShellProps = {
  title: string
  subtitle: string
  onRefresh?: () => void
  children: ReactNode
}

export function AppShell({ title, subtitle, onRefresh, children }: AppShellProps) {
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
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{title}</h1>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card hover:bg-accent"
                }`
              }
            >
              <ClipboardList className="size-4" />
              Orders
            </NavLink>
            {onRefresh ? (
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="size-4" />
                Refresh now
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  )
}
