import { Link } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle2,
  CreditCard,
  MapPin,
  PackagePlus,
  Workflow,
} from 'lucide-react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import { Progress } from '#/components/ui/progress'
import { Skeleton } from '#/components/ui/skeleton'
import type { OrderCreationReadiness } from '#/features/orders/model'
import { cn } from '#/lib/utils'

type MissionKey =
  | 'businessAddress'
  | 'productionStages'
  | 'firstProduct'
  | 'paymentMethods'

type Mission = {
  key: MissionKey
  icon: LucideIcon
  isComplete: boolean
  title: string
  description: string
}

type OrderCreationMissionOverlayProps = {
  readiness: OrderCreationReadiness | null
}

function MissionAction({
  missionKey,
  label,
}: {
  missionKey: MissionKey
  label: string
}) {
  const button = (
    <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
      {missionKey === 'businessAddress' ? (
        <Link to="/settings/general">{label}</Link>
      ) : missionKey === 'productionStages' ? (
        <Link to="/settings/production-stages" search={{ board: 'production' }}>
          {label}
        </Link>
      ) : missionKey === 'firstProduct' ? (
        <Link to="/products/new">{label}</Link>
      ) : (
        <Link to="/settings/payment-methods">{label}</Link>
      )}
    </Button>
  )

  return button
}

export function OrderCreationMissionOverlay({
  readiness,
}: OrderCreationMissionOverlayProps) {
  const t = useTranslations('orders')

  if (!readiness) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-full max-w-lg" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  const progressValue = Math.round(
    (readiness.completedCount / readiness.totalCount) * 100,
  )
  const progressLabel = t('setupMissionProgress', {
    completed: readiness.completedCount,
    total: readiness.totalCount,
  })
  const missions: Mission[] = [
    {
      key: 'businessAddress',
      icon: MapPin,
      isComplete: readiness.businessAddressComplete,
      title: t('setupBusinessAddressTitle'),
      description: t('setupBusinessAddressDesc'),
    },
    {
      key: 'productionStages',
      icon: Workflow,
      isComplete: readiness.productionStageCount > 0,
      title: t('setupProductionStagesTitle'),
      description: t('setupProductionStagesDesc'),
    },
    {
      key: 'firstProduct',
      icon: PackagePlus,
      isComplete: readiness.activeProductCount > 0,
      title: t('setupFirstProductTitle'),
      description: t('setupFirstProductDesc'),
    },
    {
      key: 'paymentMethods',
      icon: CreditCard,
      isComplete: readiness.paymentMethodCount > 0,
      title: t('setupPaymentMethodTitle'),
      description: t('setupPaymentMethodDesc'),
    },
  ]

  return (
    <div className="space-y-6 p-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('setupMissionLocked')}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-pretty">
          {t('setupMissionTitle')}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          {t('setupMissionDescription')}
        </p>
      </div>

      <div className="space-y-2 border-t pt-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="font-medium text-sm text-foreground">
            {progressLabel}
          </span>
          <span className="text-muted-foreground text-sm font-semibold tabular-nums">
            {progressValue}%
          </span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      <ul className="divide-y border-t" aria-label={t('setupMissionListLabel')}>
        {missions.map((mission) => {
          const Icon = mission.icon
          return (
            <li
              key={mission.key}
              className="flex flex-col gap-3 py-4 first:pt-4 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-none',
                    mission.isComplete
                      ? 'bg-success/10 text-success ring-1 ring-success/20'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {mission.isComplete ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </span>
                <div className="min-w-0 space-y-1">
                  <h3 className="font-medium text-sm leading-5">
                    {mission.title}
                  </h3>
                  <p className="text-muted-foreground text-xs leading-normal text-pretty">
                    {mission.description}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-11 sm:pl-0">
                <span
                  className={cn(
                    'rounded-none px-2 py-0.5 text-xs font-medium',
                    mission.isComplete
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {mission.isComplete
                    ? t('setupMissionComplete')
                    : t('setupMissionIncomplete')}
                </span>
                {!mission.isComplete && (
                  <MissionAction
                    missionKey={mission.key}
                    label={
                      mission.key === 'businessAddress'
                        ? t('setupBusinessAddressAction')
                        : mission.key === 'productionStages'
                          ? t('setupProductionStagesAction')
                          : mission.key === 'firstProduct'
                            ? t('setupFirstProductAction')
                            : t('setupPaymentMethodAction')
                    }
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
