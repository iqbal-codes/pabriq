import { useTranslations } from 'use-intl'
import type { PaymentMethod } from '#/features/invoices/model'

type PaymentMethodInstructionsCardProps = {
  paymentMethod: PaymentMethod
}

export function PaymentMethodInstructionsCard({
  paymentMethod,
}: PaymentMethodInstructionsCardProps) {
  const t = useTranslations('invoices')

  return (
    <div className="rounded-xl border bg-card p-6">
      <p className="mb-4 flex items-center gap-2 font-semibold text-muted-foreground">
        {t('paymentMethod')}
      </p>
      <div className="space-y-1 rounded-lg bg-accent p-4">
        <p className="font-semibold">{paymentMethod.name}</p>
        {paymentMethod.accountHolder && (
          <p className="text-sm text-muted-foreground">
            {paymentMethod.accountHolder}
          </p>
        )}
        {paymentMethod.instructions && (
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {paymentMethod.instructions}
          </p>
        )}
      </div>
    </div>
  )
}
