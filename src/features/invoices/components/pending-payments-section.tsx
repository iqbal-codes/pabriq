import { Clock, ExternalLink } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import type { Payment } from '#/features/invoices/model'
import { formatCurrency, formatShortDate } from '#/lib/formatters'

type PendingPaymentsSectionProps = {
  payments: Payment[]
  onConfirmPayment: (paymentId: string) => void
  onRejectPayment: (paymentId: string) => void
  isConfirming: boolean
  isRejecting: boolean
}

export function PendingPaymentsSection({
  payments,
  onConfirmPayment,
  onRejectPayment,
  isConfirming,
  isRejecting,
}: PendingPaymentsSectionProps) {
  const t = useTranslations('invoices')
  const locale = useLocale()

  const pendingPayments = payments.filter((p) => p.status === 'pending')
  if (pendingPayments.length === 0) return null

  return (
    <div className="rounded-xl border border-destructive/50 bg-card p-6">
      <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-destructive">
        <Clock className="size-4" />
        {t('pendingConfirmation')}
      </p>
      <div className="space-y-4">
        {pendingPayments.map((pm) => (
          <div
            key={pm.id}
            className="flex items-center justify-between rounded-lg border bg-card p-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">
                  {formatCurrency(pm.amount, locale)}
                </p>
                <Badge variant="secondary">
                  {pm.method ?? t('transferFallback')}
                </Badge>
              </div>
              {pm.receivedAt && (
                <p className="text-sm text-muted-foreground">
                  {formatShortDate(pm.receivedAt.toISOString(), locale)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {pm.proofAssetId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a
                        href={`/api/assets/${pm.proofAssetId}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('downloadProof')}</TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => onConfirmPayment(pm.id)}
                disabled={isConfirming}
              >
                {t('confirmSimple')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRejectPayment(pm.id)}
                disabled={isRejecting}
              >
                {t('rejectSimple')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
