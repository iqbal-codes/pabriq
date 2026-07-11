import { useTranslations } from 'use-intl'
import { TabsList, TabsTrigger } from '#/components/ui/tabs'

export function DetailTabBar() {
  const t = useTranslations('production')

  return (
    <TabsList
      variant="line"
      className="w-full border-b border-border"
      aria-label={t('taskDetail')}
    >
      <TabsTrigger value="detail" className="text-xs font-medium">
        {t('taskDetail')}
      </TabsTrigger>
      <TabsTrigger value="activity" className="text-xs font-medium">
        {t('activity')}
      </TabsTrigger>
    </TabsList>
  )
}
