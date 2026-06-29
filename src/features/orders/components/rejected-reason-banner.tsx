import { XCircle } from 'lucide-react'
import { useTranslations } from 'use-intl'

type RejectedReasonBannerProps = { reason: string | null }

export function RejectedReasonBanner({
  reason,
}: RejectedReasonBannerProps): React.ReactElement | null {
  const t = useTranslations('orders')

  if (!reason) return null

  return (
    <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <XCircle className="size-5 text-destructive mt-0.5" />
        <div>
          <p className="font-medium">{t('rejectReason')}</p>
          <p className="text-sm text-muted-foreground">{reason}</p>
        </div>
      </div>
    </div>
  )
}
