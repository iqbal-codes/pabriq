import { useTranslations } from 'use-intl'

export function GeneralSettingsPage() {
  const t = useTranslations('settings')

  return <div className="text-muted-foreground text-sm">{t('comingSoon')}</div>
}
