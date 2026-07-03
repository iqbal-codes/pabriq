import { Link } from '@tanstack/react-router'
import { Eye, Printer } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import type { InvoiceRow } from '#/features/invoices/model'

export function InvoiceRowActions({ row }: { row: InvoiceRow }) {
  const t = useTranslations('invoices')

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        asChild
        tooltip={t('printInvoice')}
        aria-label={t('printInvoice')}
      >
        <a
          href={`/api/documents/invoices/${row.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Printer className="size-4" />
        </a>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        asChild
        tooltip={t('viewInvoice')}
        aria-label={t('viewInvoice')}
      >
        <Link to="/invoices/$id" params={{ id: row.id }}>
          <Eye className="size-4" />
        </Link>
      </Button>
    </div>
  )
}
