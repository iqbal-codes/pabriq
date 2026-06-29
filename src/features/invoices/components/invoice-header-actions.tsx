import { Printer } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '#/components/ui/tooltip'

type InvoiceHeaderActionsProps = {
  invoiceId: string
  status: string
  percentage: number | null
}

export function InvoiceHeaderActions({
  invoiceId,
  status,
  percentage,
}: InvoiceHeaderActionsProps) {
  const t = useTranslations('invoices')

  return (
    <div className="mb-4 flex items-center gap-2">
      <StatusBadge status={status} />
      {percentage && <Badge variant="secondary">{percentage}%</Badge>}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon-sm" asChild>
            <a
              href={`/api/documents/invoices/${invoiceId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Printer className="size-4" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('printInvoice')}</TooltipContent>
      </Tooltip>
    </div>
  )
}
