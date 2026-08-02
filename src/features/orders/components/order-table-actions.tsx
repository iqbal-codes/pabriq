import { Link } from '@tanstack/react-router'
import { ExternalLink, Eye, Link2, Pencil } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import type { OrderRow } from '#/features/orders/model'
import { useCopyOrderPortalLink } from './use-copy-order-portal-link'

export function OrderRowActions({ row }: { row: OrderRow }) {
  const t = useTranslations('orders')
  const { copyPortalLink, isGeneratingLink } = useCopyOrderPortalLink()

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        asChild
        tooltip={t('viewOrder')}
        aria-label={t('viewOrder')}
      >
        <Link to="/orders/$id" params={{ id: row.id }}>
          <Eye className="size-4" />
        </Link>
      </Button>
      {row.status === 'draft' && (
        <Button
          variant="ghost"
          size="icon-sm"
          asChild
          tooltip={t('editOrder')}
          aria-label={t('editOrder')}
        >
          <Link to="/orders/$id/edit" params={{ id: row.id }}>
            <Pencil className="size-4" />
          </Link>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="cursor-pointer"
        tooltip={t('copyPortalLink')}
        aria-label={t('copyPortalLink')}
        isLoading={isGeneratingLink}
        onClick={() =>
          void copyPortalLink({ id: row.id, orderToken: row.orderToken })
        }
      >
        <Link2 className="size-4" />
      </Button>
      {row.orderToken && (
        <Button
          variant="ghost"
          size="icon-sm"
          asChild
          tooltip={t('openPortalLink')}
          aria-label={t('openPortalLink')}
        >
          <Link
            to="/portal/$token"
            params={{ token: row.orderToken }}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}
