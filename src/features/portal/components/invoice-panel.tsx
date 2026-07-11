import { useRouter } from '@tanstack/react-router'
import {
  Clock,
  CreditCard,
  Download,
  FileText,
  Loader2,
  ReceiptText,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  createSnapTokenFn,
  reconcilePortalPaymentFn,
} from '#/features/invoices/server'
import { formatCurrency } from '#/lib/formatters'
import type { PortalInvoice } from '../model'
import { getPortalOrderFn } from '../server'
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
  const st = useTranslations('status')
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
  if (invoice.status === 'unpaid') {
    return <Badge variant="warning">{st('unpaid')}</Badge>
  }
  return <StatusBadge status={invoice.status} />
}

function getInvoiceBadgeType(
  invoice: PortalInvoice,
  index: number,
  totalCount: number,
): 'dp' | 'settlement' | null {
  if (totalCount > 1) {
    if (index === totalCount - 1) {
      return 'settlement'
    }
    return 'dp'
  }
  if (invoice.percentage !== null && invoice.percentage < 100) {
    return 'dp'
  }
  return null
}

function InvoiceRow({
  invoice,
  token,
  badgeType,
}: {
  invoice: PortalInvoice
  token: string
  badgeType: 'dp' | 'settlement' | null
}) {
  const t = useTranslations('portal')
  const c = useTranslations('common')
  const locale = useLocale()
  const isUnpaid = invoice.status === 'unpaid'

  return (
    <li className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 w-full">
          <div className="flex items-center gap-2 w-full justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {invoice.invoiceNumber}
              </p>
            </div>
            <InvoiceStatusPill invoice={invoice} />
          </div>
          <div className="flex flex-row items-center">
            <div className="flex flex-row gap-2 items-center w-full">
              <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
                {formatCurrency(invoice.total, locale)}
              </p>
              {badgeType === 'dp' && (
                <Badge variant="outline">{t('invoiceDownPayment')}</Badge>
              )}
              {badgeType === 'settlement' && (
                <Badge variant="outline">{t('invoiceFinalPayment')}</Badge>
              )}
            </div>
          </div>
          {invoice.shippingFee && invoice.shippingFee > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              + {formatCurrency(invoice.shippingFee, locale)}{' '}
              {t('invoiceShipmentFee').toLowerCase()}
            </p>
          ) : null}
        </div>
      </div>

      {isUnpaid && (
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1">
            {invoice.paymentProvider === 'midtrans' ? (
              <PayNowButton invoiceId={invoice.id} token={token} />
            ) : (
              <SubmitPaymentProofDialog
                invoiceId={invoice.id}
                token={token}
                hasExistingProof={invoice.hasPaymentProof}
              />
            )}
          </div>
          <Button variant="outline" className="shrink-0 gap-1.5" asChild>
            <a
              href={`/api/documents/invoices/portal/${invoice.id}/${token}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="size-4" />
              {c('download')}
            </a>
          </Button>
        </div>
      )}
    </li>
  )
}

export function InvoicePanel({ invoices, token, showAboveFold }: Props) {
  const t = useTranslations('portal')
  const locale = useLocale()
  const visibleInvoices = invoices
    .filter((inv) => inv.status !== 'void')
    .sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber))
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
        {displayed.map((inv) => {
          const originalIndex = visibleInvoices.findIndex(
            (v) => v.id === inv.id,
          )
          const badgeType = getInvoiceBadgeType(
            inv,
            originalIndex,
            visibleInvoices.length,
          )
          return (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              token={token}
              badgeType={badgeType}
            />
          )
        })}
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

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 10

async function waitForInvoiceConfirmation(
  token: string,
  invoiceId: string,
): Promise<boolean> {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    const { promise, resolve } = Promise.withResolvers<void>()
    setTimeout(resolve, POLL_INTERVAL_MS)
    await promise

    const result = await getPortalOrderFn({ data: { token } })
    if (!result.ok) continue
    const invoice = result.order.invoices.find((inv) => inv.id === invoiceId)
    if (
      invoice &&
      (invoice.status === 'paid' || invoice.status === 'partially_paid')
    ) {
      return true
    }
  }
  return false
}

/**
 * Pull-based fallback for when the Midtrans webhook never arrives. Calls our
 * server function that asks Midtrans Core API for the transaction's true
 * status. If Midtrans says it's settled, the server creates + confirms the
 * payment record and we re-fetch the portal order.
 */
async function reconcilePayment(
  token: string,
  invoiceId: string,
): Promise<'paid' | 'not_settled' | 'error'> {
  try {
    const res = await reconcilePortalPaymentFn({
      data: { invoiceId, token },
    })
    if (res.ok && res.status === 'paid') return 'paid'
    return 'not_settled'
  } catch {
    return 'error'
  }
}

function loadMidtransSnapScript(opts: {
  clientKey: string
  isProduction: boolean
}) {
  const src = opts.isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js'
  const existing = document.querySelector('script[data-midtrans-snap="true"]')
  if (existing) {
    const isStale =
      existing.getAttribute('src') !== src ||
      existing.getAttribute('data-client-key') !== opts.clientKey
    if (isStale) existing.remove()
    else return
  }
  const script = document.createElement('script')
  script.src = src
  script.setAttribute('data-client-key', opts.clientKey)
  script.setAttribute('data-midtrans-snap', 'true')
  script.async = true
  document.head.appendChild(script)
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
    // Guard: snap.pay() returns immediately and onClose fires after
    // onSuccess/onError/onPending, so we must:
    //  (1) NOT reset isLoading in `finally` — only reset on terminal
    //      callbacks, otherwise the button flickers while Snap is open.
    //  (2) Track whether a terminal callback already fired, so onClose
    //      doesn't double-toast.
    let terminalHandled = false
    setIsLoading(true)
    try {
      const res = await createSnapTokenFn({
        data: { invoiceId, token },
      })

      if (!res.ok) {
        toast.error(res.error)
        setIsLoading(false)
        return
      }

      loadMidtransSnapScript({
        clientKey: res.clientKey,
        isProduction: res.isProduction,
      })

      if (!window.snap) {
        toast.error(t('midtransSdkNotLoaded'))
        setIsLoading(false)
        return
      }

      window.snap.pay(res.snapToken, {
        onSuccess: async () => {
          terminalHandled = true
          const verifyingToast = toast.loading(t('paymentVerifying'))
          let confirmed = await waitForInvoiceConfirmation(token, invoiceId)
          toast.dismiss(verifyingToast)
          if (!confirmed) {
            // Webhook didn't arrive in time — pull from Midtrans Core API
            const reconcileResult = await reconcilePayment(token, invoiceId)
            if (reconcileResult === 'paid') {
              confirmed = true
            }
          }
          await router.invalidate()
          if (confirmed) {
            toast.success(t('paymentSuccess'))
          } else {
            toast.warning(t('paymentConfirmTimeout'))
          }
          setIsLoading(false)
        },
        onPending: async () => {
          terminalHandled = true
          toast.info(t('processingPayment'))
          await router.invalidate()
          setIsLoading(false)
        },
        onError: () => {
          terminalHandled = true
          toast.error(t('paymentFailed'))
          setIsLoading(false)
        },
        onClose: () => {
          // Midtrans fires onClose AFTER onSuccess/onError/onPending.
          // If a terminal callback already handled the result, suppress.
          if (terminalHandled) return
          toast.warning(t('paymentCancelled'))
          setIsLoading(false)
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handlePay} disabled={isLoading} className="w-full gap-2">
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <CreditCard className="size-4" />
      )}
      {t('payNow')}
    </Button>
  )
}
