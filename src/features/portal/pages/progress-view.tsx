import { CalendarClock, CheckCircle2 } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Card } from '#/components/ui/card'
import { CustomerInfoCard } from '../components/customer-info-card'
import { LineItemTaskCard } from '../components/line-item-task-card'
import { PaymentAlertBanner } from '../components/payment-alert-banner'
import { PaymentSection } from '../components/payment-section'
import { PortalHeader } from '../components/portal-header'
import { ShippingAddressCard } from '../components/shipping-address-card'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

const _dateTimeFormatters = new Map<string, Intl.DateTimeFormat>([
  ['en', new Intl.DateTimeFormat('en', { dateStyle: 'long' })],
])
function formatEstimatedDate(date: Date, locale: string): string {
  let fmt = _dateTimeFormatters.get(locale)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'long' })
    _dateTimeFormatters.set(locale, fmt)
  }
  return fmt.format(date)
}

import { useSyncExternalStore } from 'react'
import {
  useOrderTimeline,
  usePortalGetInvoiceUploadUrl,
  useSubmitPaymentProof,
} from '../hooks'
import type { PortalOrder } from '../model'

function EstimatedCompletion({
  createdAt,
  maxDays,
  locale,
}: {
  createdAt: Date | string
  maxDays: number
  locale: string
}) {
  const t = useTranslations('portal')
  const mounted = useSyncExternalStore(
    () => () => {},
    () => false,
    () => true,
  )

  if (!mounted) {
    return (
      <span className="text-sm text-muted-foreground">
        {t('estimatedCompletion', { date: '' })}
      </span>
    )
  }

  const estimatedDate = new Date(createdAt)
  estimatedDate.setDate(estimatedDate.getDate() + maxDays)
  const formattedDate = formatEstimatedDate(estimatedDate, locale)

  return (
    <span className="text-sm text-muted-foreground">
      {t('estimatedCompletion', { date: formattedDate })}
    </span>
  )
}

export function ProgressView({
  order,
  token,
}: {
  order: PortalOrder
  token: string
}) {
  const t = useTranslations('portal')
  const locale = useLocale()

  const shouldFetchTimeline =
    token &&
    [
      'production',
      'in_delivery',
      'completed',
      'approved',
      'in_progress',
    ].includes(order.status)

  const { data: timelineEvents } = useOrderTimeline(
    shouldFetchTimeline ? token : '',
  )

  const getUploadUrl = usePortalGetInvoiceUploadUrl()
  const submitProof = useSubmitPaymentProof()

  const isCompleted = order.status === 'completed'
  const maxDays = order.lineItems.reduce(
    (max, item) => Math.max(max, item.productionDays ?? 0),
    0,
  )

  async function handleUpload(invoiceId: string, file: File) {
    const uploadResult = await getUploadUrl.mutateAsync({
      token,
      invoiceId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })

    const response = await fetch(uploadResult.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    if (!response.ok) throw new Error('Upload failed')

    await submitProof.mutateAsync({
      token,
      invoiceId,
      assetId: uploadResult.assetId,
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      storageKey: uploadResult.storageKey,
    })
  }

  return (
    <div className="min-h-screen bg-muted">
      <PortalHeader
        orgLogoAssetId={order.orgLogoAssetId}
        title={order.orderNumber ?? t('orderSummary')}
      />
      <div className="mx-auto max-w-2xl p-4">
        <Card className="p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-card-foreground">
                {t('orderSummary')}
              </h1>
              {order.orderNumber && (
                <p className="text-sm text-muted-foreground">
                  {order.orderNumber}
                </p>
              )}
            </div>
            {order.status && <StatusBadge status={order.status} />}
          </div>

          {isCompleted && (
            <div className="rounded-lg bg-secondary p-4 text-center">
              <CheckCircle2 className="mx-auto mb-2 size-8 text-primary" />
              <p className="text-sm text-secondary-foreground">
                {t('completedThanks')}
              </p>
            </div>
          )}
          <PaymentAlertBanner invoices={order.invoices} />
          <CustomerInfoCard
            name={order.customerName}
            phone={order.customerPhone}
            photoAssetId={order.customerPhotoAssetId}
          />
          <ShippingAddressCard address={order.shippingAddress} />

          {maxDays > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  <EstimatedCompletion
                    createdAt={order.createdAt}
                    maxDays={maxDays}
                    locale={locale}
                  />
                </p>
              </div>
            </div>
          )}

          <h2 className="text-sm font-semibold text-card-foreground">
            {t('lineItems')}
          </h2>
          <div className="space-y-3">
            {order.lineItems.map((item) => (
              <LineItemTaskCard
                key={item.id}
                item={item}
                events={timelineEvents ?? []}
              />
            ))}
          </div>
          <div className="flex justify-end border-t border-border pt-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('orderTotal')}</p>
              <p className="text-lg font-semibold text-card-foreground">
                {currencyFormatter.format(order.total)}
              </p>
            </div>
          </div>
        </Card>
        {order.invoices.length > 0 && (
          <div className="mt-6">
            <PaymentSection invoices={order.invoices} onUpload={handleUpload} />
          </div>
        )}
      </div>
    </div>
  )
}
