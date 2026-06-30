import { CalendarClock, ClipboardList, ReceiptText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { formatCurrency, formatLongDate } from '#/lib/formatters'
import { CustomerInfoCard } from '../components/customer-info-card'
import { InvoiceListDialog } from '../components/invoice-list-dialog'
import { LineItemTaskCard } from '../components/line-item-task-card'
import { PaymentAlertBanner } from '../components/payment-alert-banner'
import { PortalContactButton } from '../components/portal-contact-button'
import { PortalHeader } from '../components/portal-header'
import { ShippingAddressCard } from '../components/shipping-address-card'
import {
  useOrderTimeline,
  usePortalGetInvoiceUploadUrl,
  useSubmitPaymentProof,
} from '../hooks'
import type { PortalOrder } from '../model'
function EstimatedCompletion({
  deadline,
  locale,
}: {
  deadline: Date
  locale: string
}) {
  const t = useTranslations('portal')
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) {
    return null
  }
  const formattedDate = formatLongDate(String(deadline), locale)
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
  const maxDeadline =
    order.lineItems.length > 0
      ? new Date(
          Math.max(...order.lineItems.map((item) => item.deadline.getTime())),
        )
      : null
  const visibleInvoices = order.invoices.filter(
    (invoice) => invoice.status !== 'void',
  )
  const unpaidInvoices = visibleInvoices.filter(
    (invoice) => invoice.status !== 'paid',
  )
  const hasUnpaidInvoices = unpaidInvoices.length > 0
  const totalUnpaid = unpaidInvoices.reduce(
    (sum, invoice) => sum + invoice.total,
    0,
  )
  const safeTimelineEvents = timelineEvents ?? []
  let statusHelp: string
  switch (order.status) {
    case 'approved':
      statusHelp = t('progressStatusApprovedHelp')
      break
    case 'production':
    case 'in_progress':
      statusHelp = t('progressStatusProductionHelp')
      break
    case 'in_delivery':
      statusHelp = t('progressStatusDeliveryHelp')
      break
    case 'completed':
      statusHelp = t('progressStatusCompletedHelp')
      break
    default:
      statusHelp = t('progressStatusFallbackHelp')
  }
  let nextStep: string
  if (hasUnpaidInvoices) {
    nextStep = t('nextStepPayment')
  } else if (order.status === 'completed') {
    nextStep = t('nextStepCompleted')
  } else if (order.status === 'in_delivery') {
    nextStep = t('nextStepDelivery')
  } else {
    nextStep = t('nextStepProduction')
  }
  let paymentSummary: string
  if (visibleInvoices.length === 0) {
    paymentSummary = t('paymentSummaryNoInvoice')
  } else if (hasUnpaidInvoices) {
    paymentSummary = t('paymentSummaryUnpaid', {
      count: unpaidInvoices.length,
      amount: formatCurrency(totalUnpaid, locale),
    })
  } else {
    paymentSummary = t('paymentSummaryAllPaid')
  }
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
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        {/* Compact order header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {order.orderNumber && (
                <span className="font-mono text-sm text-muted-foreground">
                  {order.orderNumber}
                </span>
              )}
              {order.status && <StatusBadge status={order.status} />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{statusHelp}</p>
          </div>
          {order.orgPhone && (
            <PortalContactButton
              order={order}
              label="chatOnWhatsApp"
              className="shrink-0"
            />
          )}
        </div>
        <PaymentAlertBanner invoices={order.invoices} />
        {/* At a glance section */}
        <section
          aria-labelledby="progress-overview-title"
          className="rounded-xl border border-border bg-card p-4 md:p-5"
        >
          <div className="flex items-center justify-between">
            <h2
              id="progress-overview-title"
              className="text-sm font-semibold text-card-foreground"
            >
              {t('progressOverview')}
            </h2>
          </div>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="size-3.5 shrink-0" />
                <dt>{t('estimatedCompletionLabel')}</dt>
              </div>
              <dd className="mt-1 text-sm text-card-foreground">
                {maxDeadline ? (
                  <EstimatedCompletion deadline={maxDeadline} locale={locale} />
                ) : (
                  t('estimatedCompletionUnavailable')
                )}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ReceiptText className="size-3.5 shrink-0" />
                <dt>{t('paymentSummary')}</dt>
              </div>
              <dd className="mt-1 text-sm text-card-foreground">
                {paymentSummary}
              </dd>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardList className="size-3.5 shrink-0" />
                <dt>{t('nextStep')}</dt>
              </div>
              <dd className="mt-1 text-sm text-card-foreground">{nextStep}</dd>
            </div>
          </dl>
        </section>
        <div className="grid gap-3 md:grid-cols-2">
          <CustomerInfoCard
            name={order.customerName}
            phone={order.customerPhone}
            photoAssetId={order.customerPhotoAssetId}
          />
          <ShippingAddressCard address={order.shippingAddress} />
        </div>
        {order.invoices.length > 0 && (
          <InvoiceListDialog
            invoices={order.invoices}
            onUpload={handleUpload}
          />
        )}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-card-foreground">
              {t('lineItems')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('lineItemsHelp')}
            </p>
          </div>
          {order.lineItems.map((item) => (
            <LineItemTaskCard
              key={item.id}
              item={item}
              events={safeTimelineEvents}
            />
          ))}
          <div className="flex justify-end border-t border-border pt-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('orderTotal')}</p>
              <p className="text-lg font-semibold text-card-foreground">
                {formatCurrency(order.total, locale)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
