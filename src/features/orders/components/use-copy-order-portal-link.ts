import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { generateOrderTokenFn } from '#/features/portal/server'
import { queryKeys } from '#/lib/query-keys'

export type CopyOrderPortalLinkInput = {
  id: string
  orderToken: string | null
}

export function useCopyOrderPortalLink(): {
  copyPortalLink: (input: CopyOrderPortalLinkInput) => Promise<void>
  isGeneratingLink: boolean
} {
  const queryClient = useQueryClient()
  const t = useTranslations('orders')

  const generateToken = useMutation({
    mutationFn: (orderId: string) =>
      generateOrderTokenFn({ data: { orderId } }),
    onSuccess: (_result, orderId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(orderId),
      })
    },
  })

  const copyPortalLink = async (input: CopyOrderPortalLinkInput) => {
    try {
      let token = input.orderToken

      if (!token) {
        const result = await generateToken.mutateAsync(input.id)
        if (!('token' in result)) {
          toast.error(t('copyLinkFailed'))
          return
        }
        token = result.token
      }

      const url = `${window.location.origin}/order/${token}`
      await navigator.clipboard.writeText(url)
      toast.success(t('linkCopied'))
    } catch {
      toast.error(t('copyLinkFailed'))
    }
  }

  return {
    copyPortalLink,
    isGeneratingLink: generateToken.isPending,
  }
}
