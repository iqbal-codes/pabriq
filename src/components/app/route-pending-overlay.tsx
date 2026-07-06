import { useRouterState } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { Spinner } from '#/components/ui/spinner'

export function RoutePendingOverlay() {
  const t = useTranslations('common')
  const isNavigating = useRouterState({
    select: (s) => s.isLoading || s.status === 'pending',
  })

  if (!isNavigating) {
    return null
  }

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-[1px]"
    >
      <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm font-medium shadow-sm">
        <Spinner className="size-4" />
        <span>{t('loading')}</span>
      </div>
    </div>
  )
}
