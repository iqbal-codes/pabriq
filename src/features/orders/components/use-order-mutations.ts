import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { useMarkInvoicePaid } from '#/features/invoices/hooks'
import { useAdvanceOrderStatus } from '#/features/orders/hooks'
import type { GetOrderResult } from '#/features/orders/model'
import { approveOrderFn, rejectOrderFn } from '#/features/orders/server'
import { useCopyOrderPortalLink } from './use-copy-order-portal-link'

type UseOrderMutationsParams = {
  data: GetOrderResult | null | undefined
  rejectReason: string
  onRejectSuccess: () => void
}

export function useOrderMutations({
  data,
  rejectReason,
  onRejectSuccess,
}: UseOrderMutationsParams) {
  const queryClient = useQueryClient()
  const t = useTranslations('orders')
  const ct = useTranslations('common')
  const it = useTranslations('invoices')

  const approveOrder = useMutation({
    mutationFn: (input: { id: string }) => approveOrderFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'lists'] })
      queryClient.invalidateQueries({
        queryKey: ['orders', 'detail', variables.id],
      })
    },
  })

  const rejectOrder = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      rejectOrderFn({ data: input }),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'lists'] })
      queryClient.invalidateQueries({
        queryKey: ['orders', 'detail', variables.id],
      })
      onRejectSuccess()
    },
  })

  const { copyPortalLink, isGeneratingLink } = useCopyOrderPortalLink()

  const markInvoicePaid = useMarkInvoicePaid()
  const advanceOrderStatus = useAdvanceOrderStatus()

  const handleCopyPortalLink = async () => {
    if (!data) return
    await copyPortalLink({
      id: data.order.id,
      orderToken: data.order.orderToken,
    })
  }

  const handleApprove = async () => {
    if (!data) return
    const result = await approveOrder.mutateAsync({ id: data.order.id })
    if (!result.ok) {
      toast.error(result.error)
    } else {
      toast.success(t('orderApproved'))
    }
  }

  const handleReject = async () => {
    if (!data) return
    if (!rejectReason.trim()) return
    const result = await rejectOrder.mutateAsync({
      id: data.order.id,
      reason: rejectReason.trim(),
    })
    if (!result.ok) {
      toast.error(result.error)
    } else {
      toast.success(t('orderRejected'))
    }
  }

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    const result = await markInvoicePaid.mutateAsync(invoiceId)
    if (result.ok) {
      toast.success(it('invoicePaid'))
    } else {
      toast.error(result.error ?? ct('cancel'))
    }
  }

  const handleCompleteOrder = async () => {
    if (!data) return
    const result = await advanceOrderStatus.mutateAsync({
      id: data.order.id,
    })
    if (result.ok) {
      toast.success(t('orderCompleted'))
    } else {
      toast.error(result.error)
    }
  }

  return {
    isGeneratingLink,
    isApproving: approveOrder.isPending,
    isRejecting: rejectOrder.isPending,
    isMarkingPaid: markInvoicePaid.isPending,
    isCompletingOrder: advanceOrderStatus.isPending,
    handleCopyPortalLink,
    handleApprove,
    handleReject,
    handleMarkInvoicePaid,
    handleCompleteOrder,
  }
}
