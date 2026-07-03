import { Link } from '@tanstack/react-router'
import { ShieldX } from 'lucide-react'
import type { ReactElement } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'

export function ForbiddenPage({
  actionHref,
  actionKey,
}: {
  actionHref: '/' | '/operator'
  actionKey: 'backToDashboard' | 'backToProduction'
}): ReactElement {
  const t = useTranslations('operator')

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <ShieldX className="size-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">{t('accessDeniedTitle')}</h1>
        <p className="text-muted-foreground">{t('accessDeniedDescription')}</p>
        <Button asChild>
          <Link to={actionHref}>{t(actionKey)}</Link>
        </Button>
      </div>
    </div>
  )
}
