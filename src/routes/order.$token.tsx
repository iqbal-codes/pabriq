import { createFileRoute, useParams } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { usePortalOrder } from '#/features/portal/hooks'
import type { PortalOrder } from '#/features/portal/model'

export const Route = createFileRoute('/order/$token')({
  component: PortalRoute,
})

function PortalRoute() {
  const { token } = useParams({ from: Route.id })
  const { data } = usePortalOrder(token)
  const t = useTranslations('portal')

  if (!data.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-lg font-semibold">{t('notFound')}</h1>
        </div>
      </div>
    )
  }

  const order = data.order

  if (order.status === 'pending') {
    return <PendingView order={order} />
  }

  if (order.status === 'draft') {
    return <DraftView order={order} />
  }

  return <OrderSummary order={order} />
}

function PendingView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-4 max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h1 className="text-xl font-semibold">{t('waitApproval')}</h1>
        {order.orderNumber && (
          <p className="mt-2 text-sm text-gray-500">
            Order: {order.orderNumber}
          </p>
        )}
      </div>
    </div>
  )
}

function DraftView({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="mb-6 text-xl font-semibold">{t('title')}</h1>

        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-4 text-sm font-medium">{t('lineItems')}</h2>
            <div className="space-y-3">
              {order.lineItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 border-b pb-3 last:border-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {item.name || item.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('quantity')}: {item.quantity} ×{' '}
                      {new Intl.NumberFormat('en-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(item.unitPrice)}
                    </p>
                    {item.notes && (
                      <p className="mt-1 text-xs text-gray-600">{item.notes}</p>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {new Intl.NumberFormat('en-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }).format(item.total)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end border-t pt-4">
              <div>
                <p className="text-sm text-gray-500">{t('orderTotal')}</p>
                <p className="text-lg font-semibold">
                  {new Intl.NumberFormat('en-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(order.total)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderSummary({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  const statusLabel: Record<string, string> = {
    approved: t('statusApproved'),
    production: t('statusProduction'),
    in_delivery: t('statusInDelivery'),
    completed: t('statusCompleted'),
    cancelled: t('statusCancelled'),
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">{t('orderSummary')}</h1>
            {order.orderNumber && (
              <p className="text-sm text-gray-500">{order.orderNumber}</p>
            )}
            {order.status && (
              <span className="mt-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                {statusLabel[order.status] ?? order.status}
              </span>
            )}
          </div>

          <div className="mb-6 space-y-3">
            {order.lineItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 border-b pb-3 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {item.name || item.productName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('quantity')}: {item.quantity} ×{' '}
                    {new Intl.NumberFormat('en-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }).format(item.unitPrice)}
                  </p>
                  {item.notes && (
                    <p className="mt-1 text-xs text-gray-600">{item.notes}</p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {new Intl.NumberFormat('en-ID', {
                    style: 'currency',
                    currency: 'IDR',
                  }).format(item.total)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-end border-t pt-4">
            <div>
              <p className="text-sm text-gray-500">{t('orderTotal')}</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('en-ID', {
                  style: 'currency',
                  currency: 'IDR',
                }).format(order.total)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
