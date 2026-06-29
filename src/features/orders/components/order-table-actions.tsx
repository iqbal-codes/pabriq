import { Link } from '@tanstack/react-router'
import { Eye, Link2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import type { OrderRow } from '#/features/orders/model'
import { generateOrderTokenFn } from '#/features/portal/server'

export function OrderRowActions({ row }: { row: OrderRow }) {
  const t = useTranslations('orders')

  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon-sm" asChild tooltip={t('viewOrder')}>
        <Link to="/orders/$id" params={{ id: row.id }}>
          <Eye className="size-4" />
        </Link>
      </Button>
      {row.status === 'draft' && (
        <Button variant="ghost" size="icon-sm" asChild tooltip={t('editOrder')}>
          <Link to="/orders/$id/edit" params={{ id: row.id }}>
            <Pencil className="size-4" />
          </Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        tooltip={t('copyOrderLink')}
        onClick={async () => {
          let token = row.orderToken
          if (!token) {
            const result = await generateOrderTokenFn({
              data: { orderId: row.id },
            })
            if (!('token' in result)) {
              toast.error('Failed to generate link')
              return
            }
            token = result.token
          }
          const url = `${window.location.origin}/order/${token}`
          await navigator.clipboard.writeText(url)
          toast.success(t('orderLinkCopied'))
        }}
      >
        <Link2 className="size-4" />
      </Button>
    </div>
  )
}
