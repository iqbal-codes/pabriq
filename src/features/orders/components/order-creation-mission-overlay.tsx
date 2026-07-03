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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
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
      <Card className="gap-0 overflow-hidden py-0 shadow-none" aria-busy="true">
        <CardHeader className="border-b p-6 md:p-8">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-full max-w-lg" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </CardHeader>
        <CardContent className="space-y-4 p-6 md:p-8">
          <Skeleton className="h-3 w-full" />
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
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
    <Card className="gap-0 overflow-hidden py-0 shadow-none">
      <CardContent className="grid p-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="p-6 md:p-8">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-medium text-foreground">
              {t('setupMissionLocked')}
            </p>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-pretty">
                {t('setupMissionTitle')}
              </h2>
              <p className="text-muted-foreground text-sm leading-6 text-pretty">
                {t('setupMissionDescription')}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium">{progressLabel}</span>
              <span className="text-muted-foreground tabular-nums">
                {progressValue}%
              </span>
            </div>
            <Progress value={progressValue} />
          </div>

          <ul className="mt-6 divide-y" aria-label={t('setupMissionListLabel')}>
            {missions.map((mission) => {
              const Icon = mission.icon
              return (
                <li
                  key={mission.key}
                  className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <span
                      className={cn(
                        'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                        mission.isComplete
                          ? 'bg-success/15 text-foreground ring-1 ring-success/30'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      {mission.isComplete ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-medium leading-5">{mission.title}</h3>
                      <p className="max-w-[62ch] text-muted-foreground text-sm leading-5 text-pretty">
                        {mission.description}
                      </p>
                    </div>
                  </div>
                  <div className="grid justify-items-start gap-2 pl-12 sm:flex sm:shrink-0 sm:items-center sm:gap-2 sm:pl-0">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        mission.isComplete
                          ? 'bg-success/15 text-foreground ring-1 ring-success/30'
                          : 'bg-muted text-foreground',
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
        </section>

        <aside className="border-t bg-foreground p-6 text-background lg:border-t-0 lg:border-l md:p-8">
          <CardHeader className="p-0">
            <CardTitle className="text-lg leading-6">
              {t('setupMissionHelpTitle')}
            </CardTitle>
            <CardDescription className="text-background text-sm leading-6">
              {t('setupMissionHelpBody')}
            </CardDescription>
          </CardHeader>
          <div className="mt-6 space-y-4 text-sm leading-6">
            <p>{t('setupMissionHelpAddress')}</p>
            <p>{t('setupMissionHelpProduction')}</p>
            <p>{t('setupMissionHelpPayment')}</p>
          </div>
        </aside>
      </CardContent>
    </Card>
  )
}
