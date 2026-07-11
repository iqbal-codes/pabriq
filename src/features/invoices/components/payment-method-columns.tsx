import { Edit, Trash } from 'lucide-react'
import { useTranslations } from 'use-intl'
import type { AppColumnDef } from '#/components/app/data-table'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import type { PaymentMethod } from '#/features/invoices/model'

export function usePaymentMethodColumns(): AppColumnDef<PaymentMethod>[] {
  const t = useTranslations('settings')
  const ct = useTranslations('common')

  return [
    {
      id: 'bankName',
      header: t('bankName'),
      meta: { label: t('bankName'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.bankName ?? '—'}
        </span>
      ),
    },
    {
      id: 'account',
      header: t('accountNumber'),
      meta: { label: t('accountNumber'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.accountNumber
            ? `${row.original.accountNumber}${row.original.accountHolder ? ` (${row.original.accountHolder})` : ''}`
            : '—'}
        </span>
      ),
    },
    {
      id: 'isDefault',
      header: t('defaultPayment'),
      meta: { label: t('defaultPayment'), mobileRole: 'meta' },
      cell: ({ row }) =>
        row.original.isDefault ? <Badge>{t('defaultPayment')}</Badge> : null,
    },
    {
      id: 'active',
      header: ct('status'),
      meta: { label: ct('status'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <StatusBadge status={row.original.active ? 'active' : 'inactive'} />
      ),
    },
  ]
}

export function PaymentMethodRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  const t = useTranslations('settings')
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        tooltip={t('editPaymentMethod')}
        onClick={onEdit}
      >
        <Edit className="size-4" />
      </Button>
      <Button
        variant="ghost"
        className="text-destructive"
        size="icon"
        tooltip={t('deletePaymentMethod')}
        onClick={onDelete}
      >
        <Trash className="size-4" />
      </Button>
    </div>
  )
}
