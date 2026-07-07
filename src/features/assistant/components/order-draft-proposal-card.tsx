import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  type AssistantChatMessageMetadata,
  type AssistantChatScope,
  useCancelOrderDraftProposal,
  useConsumeOrderDraftProposal,
  useGetProposal,
} from '#/features/assistant/hooks'

type OrderDraftProposalCardProps = {
  metadata: Extract<
    AssistantChatMessageMetadata,
    { kind: 'order_draft_proposal' }
  >
  scope: AssistantChatScope
}

export function OrderDraftProposalCard({
  metadata,
  scope,
}: OrderDraftProposalCardProps) {
  const t = useTranslations('assistant')
  const navigate = useNavigate()
  const consume = useConsumeOrderDraftProposal(scope)
  const cancel = useCancelOrderDraftProposal(scope)
  const proposal = useGetProposal(metadata.actionId)
  const [countdown, setCountdown] = useState<number | null>(null)

  const data = proposal.data?.ok ? proposal.data : null
  const isExpired = data
    ? new Date(data.expiresAt) < new Date()
    : metadata.expiresAt
      ? new Date(metadata.expiresAt) < new Date()
      : false
  const isConsumed = data?.status === 'confirmed'
  const isCancelled = data?.status === 'cancelled'
  const isPending = data?.status === 'pending' && !isExpired

  useEffect(() => {
    if (!data?.expiresAt) return
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 60_000),
      )
      setCountdown(remaining)
    }, 10_000)
    // run immediately
    const remaining = Math.max(
      0,
      Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 60_000),
    )
    setCountdown(remaining)
    return () => clearInterval(interval)
  }, [data?.expiresAt])

  const handleProceed = async () => {
    if (!data || !isPending) return
    const result = await consume.mutateAsync(metadata.actionId)
    if (result.ok) {
      navigate({
        to: '/orders/$id/edit',
        params: { id: result.orderId },
      })
    }
  }

  const handleCancel = async () => {
    if (!data || !isPending) return
    await cancel.mutateAsync(metadata.actionId)
  }

  if (isConsumed) {
    return null
  }

  if (isCancelled) {
    return (
      <div className="text-xs italic text-muted-foreground px-1 py-0.5">
        {t('proposal.cancelled')}
      </div>
    )
  }

  if (!data || !data.payload) {
    return null
  }

  const { payload } = data

  return (
    <div className="rounded-lg border bg-card p-3 text-sm space-y-2 max-w-full">
      <div className="flex items-center justify-between">
        <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
          {t('proposal.title')}
        </span>
        {countdown !== null && countdown > 0 && (
          <span className="text-[10px] text-muted-foreground">
            {t('proposal.expiresIn', { minutes: countdown })}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {payload.lineItems.map((li, i) => (
          <div
            key={`${li.productId}-${i}`}
            className="flex justify-between text-xs"
          >
            <span>
              {li.productName} × {li.quantity}
            </span>
            <span className="font-mono">
              {new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(li.total)}
            </span>
          </div>
        ))}
      </div>

      {payload.customerName && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t('proposal.customer')}</span>
          <span>{payload.customerName}</span>
        </div>
      )}

      <div className="border-t pt-1.5 flex justify-between text-xs font-semibold">
        <span>{t('proposal.total')}</span>
        <span className="font-mono">
          {new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(payload.total)}
        </span>
      </div>

      {!isPending && isExpired ? (
        <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
          {t('proposal.expired')}
        </div>
      ) : (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={handleProceed}
            disabled={consume.isPending || cancel.isPending}
            isLoading={consume.isPending}
          >
            {t('proposal.proceed')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={consume.isPending || cancel.isPending}
            isLoading={cancel.isPending}
          >
            {t('proposal.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}
