import { Check } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { cn } from '#/lib/utils'

export type StageItem = {
  id: string
  name: string
  /** When the order moved into or past this stage. ISO string or null. */
  reachedAt?: string | null
}

type StageTrackerProps = {
  stages: StageItem[]
  /** Identifier of the stage the order is currently sitting in. */
  currentStageId?: string | null
  className?: string
}

export function StageTracker({
  stages,
  currentStageId,
  className,
}: StageTrackerProps) {
  const t = useTranslations('portal')

  if (stages.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        {t('stagesUnknown')}
      </p>
    )
  }

  const currentIndex = currentStageId
    ? stages.findIndex((s) => s.id === currentStageId)
    : -1
  // If we don't know yet but at least have stages, treat the first as pending
  const activeIndex = currentIndex >= 0 ? currentIndex : -1

  return (
    <ol
      aria-label={t('stageTrackerLabel')}
      className={cn('flex w-full items-stretch gap-1.5', className)}
    >
      {stages.map((stage, idx) => {
        const isCompleted = activeIndex >= 0 && idx < activeIndex
        const isActive = idx === activeIndex
        const isUpcoming = activeIndex < 0 ? idx === 0 : idx > activeIndex
        return (
          <li
            key={stage.id}
            className="flex flex-1 flex-col gap-1.5"
            aria-current={isActive ? 'step' : undefined}
          >
            <div className="relative h-1.5 overflow-hidden bg-muted">
              <div
                className={cn(
                  'absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-out',
                  isCompleted && 'w-full',
                  isActive && 'w-1/2',
                  isUpcoming && 'w-0',
                )}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold tabular-nums',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground',
                  isActive && 'border-primary text-primary',
                  isUpcoming && 'border-border text-muted-foreground/50',
                )}
                aria-hidden
              >
                {isCompleted ? (
                  <Check className="size-2.5" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  'min-w-0 truncate text-[11px] font-medium leading-tight',
                  (isCompleted || isActive) && 'text-foreground',
                  isUpcoming && 'text-muted-foreground/60',
                )}
                title={stage.name}
              >
                {stage.name}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
