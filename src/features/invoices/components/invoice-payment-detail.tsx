import { AlertCircle, CheckCircle2, CreditCard, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { useInvoice, useReconcilePayment } from '#/features/invoices/hooks'
import type { InvoiceRow } from '#/features/invoices/model'
import type { ReconcilePaymentResponse } from '#/features/invoices/server'
import type { Role } from '#/features/permissions/model'
import { canManageInvoices } from '#/features/permissions/model'
import { formatCurrency } from '#/lib/formatters'

type Props = {
  invoice: InvoiceRow
  orgRole: Role
  onManualConfirm?: () => void
  isConfirmingManual?: boolean
}

export function InvoicePaymentDetail({
  invoice,
  orgRole,
  onManualConfirm,
  isConfirmingManual = false,
}: Props) {
  const t = useTranslations('invoices')
  const locale = useLocale()
  const canReconcile = canManageInvoices(orgRole)

  const { data: invoiceDetail } = useInvoice(invoice.id)
  const reconcileMutation = useReconcilePayment()
  const [reconcileResult, setReconcileResult] =
    useState<ReconcilePaymentResponse | null>(null)

  const handleReconcile = async () => {
    try {
      const res = await reconcileMutation.mutateAsync(invoice.id)
      setReconcileResult(res)
    } catch (err: unknown) {
      setReconcileResult({
        ok: false,
        error: err instanceof Error ? err.message : t('reconcileFailed'),
      })
    }
  }

  const payments: NonNullable<typeof invoiceDetail>['payments'] =
    invoiceDetail?.payments ?? []
  const attempts: NonNullable<typeof invoiceDetail>['midtransAttempts'] =
    invoiceDetail?.midtransAttempts ?? []
  const latestAttempt = attempts.length > 0 ? attempts[0] : null
  const gatewayOrderId =
    invoice.midtransOrderId || latestAttempt?.orderId || null
  const gatewayTransactionId = latestAttempt?.transactionId || null
  const isMidtrans = invoice.paymentProvider === 'midtrans'
  const isManual = invoice.paymentProvider === 'bank_transfer'

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/40 p-3 text-xs">
      {/* Overview & Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <CreditCard
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="font-medium text-foreground">
            {t('paymentSource')}:
          </span>
          <span className="font-semibold text-foreground">
            {isMidtrans
              ? t('midtransOnlineGateway')
              : isManual
                ? t('bankTransferManual')
                : invoice.paymentProvider}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('invoiceTotal')}:</span>
          <span className="font-bold tabular-nums text-foreground">
            {formatCurrency(invoice.total, locale)}
          </span>
        </div>
      </div>

      {/* Gateway Order & Transaction IDs */}
      {(gatewayOrderId || gatewayTransactionId) && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {gatewayOrderId && (
            <div>
              <span className="text-muted-foreground">
                {t('gatewayOrderId')}:{' '}
              </span>
              <span className="font-mono font-medium text-foreground">
                {gatewayOrderId}
              </span>
            </div>
          )}
          {gatewayTransactionId && (
            <div>
              <span className="text-muted-foreground">
                {t('gatewayTransactionId')}:{' '}
              </span>
              <span className="font-mono font-medium text-foreground">
                {gatewayTransactionId}
              </span>
            </div>
          )}
        </div>
      )}

      {attempts.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-medium text-muted-foreground">
            {t('transactionHistory', { count: attempts.length })}
          </p>
          <div className="space-y-1">
            {attempts.map((att) => (
              <div
                key={att.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/80 bg-background p-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-foreground">
                      {att.orderId}
                    </span>
                    {att.paymentType && (
                      <Badge variant="outline" className="text-[10px]">
                        {att.paymentType}
                      </Badge>
                    )}
                    {att.refundedAmount > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        Refunded: {formatCurrency(att.refundedAmount, locale)}
                      </Badge>
                    )}
                  </div>
                  {att.transactionId && (
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {t('transactionId', { id: att.transactionId })}
                    </p>
                  )}
                  {att.errorMessage && (
                    <p className="text-[11px] text-destructive">
                      {t('transactionError')}: {att.errorMessage}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      att.transactionStatus === 'settlement' ||
                      att.transactionStatus === 'capture'
                        ? 'default'
                        : att.transactionStatus === 'pending'
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="capitalize text-[10px]"
                  >
                    {att.transactionStatus === 'failed'
                      ? t('failed')
                      : att.transactionStatus}
                  </Badge>
                  {att.grossAmount !== null && (
                    <p className="mt-0.5 tabular-nums text-muted-foreground">
                      {formatCurrency(att.grossAmount, locale)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Rows */}
      {payments.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-medium text-muted-foreground">
            {t('paymentRecords', { count: payments.length })}
          </p>
          <div className="space-y-1">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded border border-border/80 bg-background p-2"
              >
                <div>
                  <span className="font-medium capitalize text-foreground">
                    {p.method}
                  </span>
                  {p.reference && (
                    <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                      {t('referencePrefix', { reference: p.reference })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums text-foreground">
                    {formatCurrency(p.amount, locale)}
                  </span>
                  <Badge
                    variant={
                      p.status === 'confirmed'
                        ? 'default'
                        : p.status === 'pending'
                          ? 'secondary'
                          : p.status === 'refunded' ||
                              p.status === 'partially_refunded'
                            ? 'outline'
                            : 'destructive'
                    }
                    className="capitalize text-[10px]"
                  >
                    {p.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reconciliation Feedback Alert */}
      {reconcileResult && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-lg p-2.5 ${
            reconcileResult.ok && reconcileResult.status === 'paid'
              ? 'border border-success/30 bg-success/10 text-success'
              : reconcileResult.ok && reconcileResult.status === 'mismatch'
                ? 'border border-warning/30 bg-warning/10 text-warning-foreground'
                : 'border border-border bg-muted/60 text-muted-foreground'
          }`}
        >
          {reconcileResult.ok && reconcileResult.status === 'paid' ? (
            <CheckCircle2
              className="size-4 shrink-0 text-success mt-0.5"
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              className="size-4 shrink-0 text-warning mt-0.5"
              aria-hidden="true"
            />
          )}
          <div className="space-y-0.5 text-xs">
            {reconcileResult.ok ? (
              reconcileResult.status === 'paid' ? (
                <p className="font-medium">{t('reconcilePaid')}</p>
              ) : reconcileResult.status === 'mismatch' ? (
                <p className="font-medium">{t('reconcileMismatch')}</p>
              ) : reconcileResult.status === 'not_settled_yet' ? (
                <p className="font-medium">{t('reconcileNotSettled')}</p>
              ) : reconcileResult.status === 'no_midtrans_order_id' ? (
                <p className="font-medium">{t('reconcileNoOrderId')}</p>
              ) : (
                <p className="font-medium">
                  {t('manualReviewRequired')}: {reconcileResult.status}
                </p>
              )
            ) : (
              <p className="font-medium text-destructive">
                {reconcileResult.error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {isManual &&
          onManualConfirm &&
          (invoice.status === 'unpaid' ||
            invoice.status === 'partially_paid') && (
            <Button
              type="button"
              variant="default"
              size="sm"
              isLoading={isConfirmingManual}
              disabled={isConfirmingManual}
              onClick={onManualConfirm}
            >
              {t('confirmSimple')}
            </Button>
          )}

        {isMidtrans && canReconcile && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={reconcileMutation.isPending}
            disabled={reconcileMutation.isPending}
            onClick={handleReconcile}
          >
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden="true" />
            {t('reconcileWithMidtrans')}
          </Button>
        )}
      </div>
    </div>
  )
}
