import { useTranslations } from 'use-intl'
import { usePortalOrder } from '../hooks'
import { DraftView } from './draft-view'
import { PendingView } from './pending-view'
import { ProgressView } from './progress-view'
import { RejectedView } from './rejected-view'

type PortalPageProps = { token: string }

export function PortalPage({ token }: PortalPageProps) {
  const { data } = usePortalOrder(token)
  const t = useTranslations('portal')

  if (!data.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">
            {t('notFound')}
          </h1>
        </div>
      </div>
    )
  }

  const order = data.order

  if (order.status === 'pending') return <PendingView order={order} />
  if (order.status === 'draft') return <DraftView order={order} token={token} />
  if (order.status === 'rejected') return <RejectedView order={order} />
  return <ProgressView order={order} />
}
