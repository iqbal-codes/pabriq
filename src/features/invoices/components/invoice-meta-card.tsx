import { useLocale, useTranslations } from 'use-intl'
import { formatCurrency, formatShortDate } from '#/lib/formatters'

type InvoiceMetaCardProps = {
  issuedDate: string
  dueDate: string
  total: number
}

export function InvoiceMetaCard({
  issuedDate,
  dueDate,
  total,
}: InvoiceMetaCardProps) {
  const t = useTranslations('invoices')
  const locale = useLocale()

  return (
    <div className="grid gap-3 rounded-xl border bg-card p-6 md:grid-cols-3">
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">
          {t('issuedDate')}
        </p>
        <p className="font-semibold">{formatShortDate(issuedDate, locale)}</p>
      </div>
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">
          {t('dueDate')}
        </p>
        <p className="font-semibold">{formatShortDate(dueDate, locale)}</p>
      </div>
      <div>
        <p className="text-[13px] font-medium text-muted-foreground">
          {t('total')}
        </p>
        <p className="text-lg font-semibold">{formatCurrency(total, locale)}</p>
      </div>
    </div>
  )
}
