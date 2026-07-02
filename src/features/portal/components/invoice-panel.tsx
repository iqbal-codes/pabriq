import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useLocale, useTranslations } from 'use-intl'
import {
  Clock,
  CreditCard,
  Download,
  FileText,
  Loader2,
  ReceiptText,
} from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { formatCurrency, formatLongDate } from '#/lib/formatters'
import { createSnapTokenFn } from '#/features/invoices/server'
import type { PortalInvoice } from '../model'
import { SubmitPaymentProofDialog } from './submit-payment-proof-dialog'

type Props = {
  invoices: PortalInvoice[]
  token: string
  showAboveFold?: boolean
}

function daysFromDue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function InvoiceStatusPill({ invoice }: { invoice: PortalInvoice }) {
  const t = useTranslations('portal')
  const isUnpaid = invoice.status === 'unpaid'
  const isOverdue = isUnpaid && daysFromDue(invoice.dueDate) < 0
  const isPendingProof = isUnpaid && invoice.hasPaymentProof

  if (isOverdue)
    return (
      <Badge variant="destructive">
        {t('rejectedNote', { note: t('paymentOverdue') })}
      </Badge>
    )
  if (isPendingProof) {
    return (
      <Badge variant="secondary">
        <Clock className="mr-1 size-3" />
        {t('invoiceProofPending')}
      </Badge>
    )
  }
  if (invoice.status === 'paid') return <StatusBadge status="paid" />
  return <StatusBadge status={invoice.status} />
}

function InvoiceRow({
  invoice,
  token,
}: {
  invoice: PortalInvoice
  token: string
}) {
  const t = useTranslations('portal')
  const locale = useLocale()
  const isUnpaid = invoice.status === 'unpaid'
  const dueInDays = isUnpaid ? daysFromDue(invoice.dueDate) : null
  const isOverdue = dueInDays !== null && dueInDays < 0
  const dueLabel = !isUnpaid
    ? null
    : isOverdue
      ? t('invoiceOverdueOn', { date: formatLongDate(invoice.dueDate, locale) })
      : t('invoiceDueLabel', { date: formatLongDate(invoice.dueDate, locale) })

  return (
    <li className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {invoice.invoiceNumber}
            </p>
            <InvoiceStatusPill invoice={invoice} />
          </div>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
            {formatCurrency(invoice.total, locale)}
          </p>
          {invoice.shippingFee && invoice.shippingFee > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              + {formatCurrency(invoice.shippingFee, locale)}{' '}
              {t('invoiceShipmentFee').toLowerCase()}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <a
              href={`/api/documents/invoices/portal/${invoice.id}/${token}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="mr-1.5 size-3.5" />
              {t('downloadInvoice')}
            </a>
          </Button>
          {dueLabel ? (
            <span
              className={cn(
                'text-xs tabular-nums',
                isOverdue
                  ? 'font-medium text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {dueLabel}
            </span>
          ) : null}
        </div>
      </div>

      {isUnpaid && invoice.paymentMethodType === 'payment_gateway' ? (
        <PayNowButton invoiceId={invoice.id} token={token} />
      ) : isUnpaid ? (
        <SubmitPaymentProofDialog
          invoiceId={invoice.id}
          token={token}
          hasExistingProof={invoice.hasPaymentProof}
        />
      ) : null}
    </li>
  )
}

export function InvoicePanel({ invoices, token, showAboveFold }: Props) {
  const t = useTranslations('portal')
  const locale = useLocale()
  const visibleInvoices = invoices.filter((inv) => inv.status !== 'void')
  const [expanded, setExpanded] = useState(Boolean(showAboveFold))

  if (visibleInvoices.length === 0) return null

  const unpaidInvoices = visibleInvoices.filter((inv) => inv.status !== 'paid')
  const unpaidSum = unpaidInvoices.reduce((acc, inv) => acc + inv.total, 0)
  const totalSum = visibleInvoices.reduce((acc, inv) => acc + inv.total, 0)

  const initialCount = showAboveFold
    ? visibleInvoices.length
    : Math.min(2, visibleInvoices.length)
  const remainingCount = visibleInvoices.length - initialCount
  const displayed = expanded
    ? visibleInvoices
    : visibleInvoices.slice(0, initialCount)

  return (
    <section
      aria-labelledby="invoice-panel-title"
      className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <ReceiptText className="size-4 text-muted-foreground" />
          <h2
            id="invoice-panel-title"
            className="text-sm font-semibold text-foreground"
          >
            {t('invoicesSectionTitle')}
          </h2>
        </div>
        <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
          {unpaidInvoices.length > 0 ? (
            <Badge variant="warning">
              {t('invoiceSummaryUnpaid', {
                count: unpaidInvoices.length,
                amount: formatCurrency(unpaidSum, locale),
              })}
            </Badge>
          ) : (
            <span>
              {t('invoiceSummary', {
                count: visibleInvoices.length,
                amount: formatCurrency(totalSum, locale),
              })}
            </span>
          )}
        </div>
      </header>
      <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground sm:px-5">
        {t('invoicesSectionDescription')}
      </p>
      <ul className="divide-y divide-border">
        {displayed.map((inv) => (
          <InvoiceRow key={inv.id} invoice={inv} token={token} />
        ))}
      </ul>
      {remainingCount > 0 ? (
        <div className="border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full rounded-none text-xs"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded
              ? t('invoiceShowLess')
              : t('invoiceShowAll', { count: remainingCount })}
            <FileText className="ml-1.5 size-3.5" />
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function PayNowButton({
  invoiceId,
  token,
}: {
  invoiceId: string
  token: string
}) {
  const t = useTranslations('portal')
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handlePay = async () => {
    setIsLoading(true)
    try {
      const res = await createSnapTokenFn({
        data: { invoiceId, token },
      })

      if (!res.ok) {
        toast.error(res.error)
        return
      }

      if (!window.snap) {
        toast.error('Payment gateway SDK not loaded yet. Please try again.')
        return
      }

      window.snap.pay(res.snapToken, {
        onSuccess: async () => {
          toast.success(t('paymentSuccess'))
          await router.invalidate()
        },
        onPending: async () => {
          toast.info(t('processingPayment'))
          await router.invalidate()
        },
        onError: () => {
          toast.error(t('paymentFailed'))
        },
        onClose: () => {
          toast.warning(t('paymentCancelled'))
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePay}
      disabled={isLoading}
      className="w-full gap-2 sm:w-auto"
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CreditCard className="size-4" />
      )}
      {t('payNow')}
    </Button>
  )
}
