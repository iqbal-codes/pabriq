'use client'

import { useRouter } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { signOutAndNavigate } from '#/components/app/operator-header'
import { Button } from '#/components/ui/button'

export function OperatorEmptyOrg() {
  const t = useTranslations('operator')
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <h1 className="text-2xl font-semibold">{t('noOrgTitle')}</h1>
        <p className="text-muted-foreground">{t('noOrgDescription')}</p>
        <Button variant="outline" onClick={() => signOutAndNavigate(router)}>
          {t('backToDashboard')}
        </Button>
      </div>
    </div>
  )
}
