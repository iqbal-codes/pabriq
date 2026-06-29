import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { usePortalOrder } from '../hooks'
import { DraftView } from './draft-view'
import { PendingView } from './pending-view'
import { ProgressView } from './progress-view'
import { RejectedView } from './rejected-view'

type PortalPageProps = { token: string }

type PortalMessageStateProps = {
  title: string
  description?: string
  action?: React.ReactNode
}

function PortalMessageState({
  title,
  description,
  action,
}: PortalMessageStateProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold text-card-foreground">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}

export function PortalPage({ token }: PortalPageProps) {
  const { data, isPending, isError } = usePortalOrder(token)
  const t = useTranslations('portal')

  if (isPending) {
    return <PortalMessageState title={t('loadingOrder')} />
  }

  if (isError || !data) {
    return (
      <PortalMessageState
        title={t('loadFailed')}
        description={t('loadFailedDesc')}
        action={
          <Button onClick={() => window.location.reload()}>{t('retry')}</Button>
        }
      />
    )
  }

  if (!data.ok) {
    return (
      <PortalMessageState
        title={t('notFound')}
        description={t('notFoundHelp')}
      />
    )
  }

  const order = data.order

  if (order.status === 'pending') return <PendingView order={order} />
  if (order.status === 'draft') return <DraftView order={order} token={token} />
  if (order.status === 'rejected') return <RejectedView order={order} />
  return <ProgressView order={order} token={token} />
}
