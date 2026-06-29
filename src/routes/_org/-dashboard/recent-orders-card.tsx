import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { StatusBadge } from '#/components/status-badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import type { DashboardData } from '#/features/dashboard/hooks'
import { formatCurrency, formatLongDate } from '#/lib/formatters'
import { EmptyCardState } from './empty-card-state'

export function RecentOrdersCard({
  isLoading,
  orders,
  locale,
  title,
  description,
  viewAllLabel,
  emptyLabel,
  orderFallbackLabel,
  guestCustomerLabel,
}: {
  isLoading: boolean
  orders: DashboardData['recentOrders'] | undefined
  locale: string
  title: string
  description: string
  viewAllLabel: string
  emptyLabel: string
  orderFallbackLabel: string
  guestCustomerLabel: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/orders">
            {viewAllLabel}
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading || !orders ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-16 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyCardState label={emptyLabel} />
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                to="/orders/$id"
                params={{ id: order.id }}
                className="block rounded-xl border p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">
                        {order.orderNumber ?? orderFallbackLabel}
                      </p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {order.customerName ?? guestCustomerLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatLongDate(order.createdAt.toISOString(), locale)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatCurrency(order.total, locale)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
