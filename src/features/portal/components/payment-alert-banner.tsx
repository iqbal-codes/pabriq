import { AlertCircle, Clock } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { formatCurrency } from '#/lib/formatters'
import type { PortalInvoice } from '../model'

function daysFromDue(dueDate: string): number {
  const due = new Date(dueDate)
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function PaymentAlertBanner({
  invoices,
}: {
  invoices: PortalInvoice[]
}) {
  const t = useTranslations('portal')
  const locale = useLocale()

  if (invoices.length === 0) return null

  const unpaid = invoices.filter(
    (inv) => inv.status !== 'paid' && inv.status !== 'void',
  )
  if (unpaid.length === 0) return null

  const totalUnpaid = unpaid.reduce((sum, inv) => sum + inv.total, 0)
  const hasOverdue = unpaid.some((inv) => daysFromDue(inv.dueDate) < 0)
  const hasDueSoon = unpaid.some(
    (inv) => daysFromDue(inv.dueDate) >= 0 && daysFromDue(inv.dueDate) <= 7,
  )

  const variant = hasOverdue ? 'destructive' : 'default'
  const Icon = hasOverdue ? AlertCircle : Clock

  let description: string
  if (hasOverdue) {
    const overdueCount = unpaid.filter(
      (inv) => daysFromDue(inv.dueDate) < 0,
    ).length
    description = `${t('paymentUnpaid', { count: unpaid.length, amount: formatCurrency(totalUnpaid, locale) })} • ${overdueCount} ${t('paymentOverdue').toLowerCase()}`
  } else if (hasDueSoon) {
    const soonDays = Math.min(
      ...unpaid.flatMap((inv) => {
        const d = daysFromDue(inv.dueDate)
        return d >= 0 ? [d] : []
      }),
    )
    description = `${t('paymentUnpaid', { count: unpaid.length, amount: formatCurrency(totalUnpaid, locale) })} • ${t('paymentDueSoon', { days: soonDays })}`
  } else {
    description = t('paymentUnpaid', {
      count: unpaid.length,
      amount: formatCurrency(totalUnpaid, locale),
    })
  }

  return (
    <Alert variant={variant}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{t('paymentAlert')}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
}
