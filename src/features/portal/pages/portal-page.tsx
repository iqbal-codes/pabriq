import { AlertCircle, ChevronRight, Inbox, RefreshCcw } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { Skeleton } from '#/components/ui/skeleton'
import { PortalShell } from '../components/portal-shell'
import { usePortalOrder } from '../hooks'
import { DraftView } from './draft-view'
import { PendingView } from './pending-view'
import { ProgressView } from './progress-view'
import { RejectedView } from './rejected-view'

type PortalPageProps = { token: string }

function PortalMessageShell({
  eyebrow,
  title,
  description,
  action,
  variant = 'neutral',
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: React.ReactNode
  variant?: 'neutral' | 'error' | 'empty'
}) {
  const Icon = variant === 'error' ? AlertCircle : Inbox
  const accentClass =
    variant === 'error'
      ? 'bg-destructive/10 text-destructive'
      : 'bg-muted text-muted-foreground'

  return (
    <PortalShell order={{ orgLogoAssetId: null, orderNumber: null }}>
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div
            className={`mx-auto mb-4 flex size-12 items-center justify-center rounded-full ${accentClass}`}
          >
            <Icon className="size-5" />
          </div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-lg font-semibold text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
          {action ? <div className="mt-5">{action}</div> : null}
        </div>
      </div>
    </PortalShell>
  )
}

function PortalLoadingShell() {
  return (
    <PortalShell order={{ orgLogoAssetId: null, orderNumber: null }}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </PortalShell>
  )
}

export function PortalPage({ token }: PortalPageProps) {
  const { data, isPending, isError } = usePortalOrder(token)
  const t = useTranslations('portal')

  if (isPending) return <PortalLoadingShell />

  if (isError || !data) {
    return (
      <PortalMessageShell
        eyebrow={t('loadingTitle')}
        title={t('loadFailed')}
        description={t('loadFailedDesc')}
        variant="error"
        action={
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCcw className="size-3.5" />
            {t('retry')}
          </Button>
        }
      />
    )
  }

  if (!data.ok) {
    return (
      <PortalMessageShell
        eyebrow="404"
        title={t('notFound')}
        description={t('notFoundHelp')}
        variant="empty"
      />
    )
  }

  const order = data.order
  const orgPhone = order.orgPhone
  const orgPhoneHref = orgPhone
    ? `https://wa.me/${orgPhone.replace(/\D/g, '').replace(/^0/, '62')}`
    : null

  return (
    <PortalShell order={order}>
      {order.status === 'pending' && <PendingView order={order} />}
      {order.status === 'draft' && <DraftView order={order} token={token} />}
      {order.status === 'rejected' && <RejectedView order={order} />}
      {!['pending', 'draft', 'rejected'].includes(order.status) && (
        <ProgressView order={order} token={token} />
      )}
      {orgPhoneHref ? (
        <div className="mt-8 flex justify-center">
          <a
            href={orgPhoneHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t('chatOnWhatsApp')}
            <ChevronRight className="size-3" />
          </a>
        </div>
      ) : null}
    </PortalShell>
  )
}
