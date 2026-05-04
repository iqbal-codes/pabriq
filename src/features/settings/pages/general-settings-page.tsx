import { useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'

export function GeneralSettingsPage() {
  const t = useTranslations('breadcrumb')
  const pt = useTranslations('production')

  return (
    <>
      <PageHeader title={t('general')} />
      <PageContent>
        <Tabs value="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general" asChild>
              <a href="/settings/general">{t('general')}</a>
            </TabsTrigger>
            <TabsTrigger value="stages" asChild>
              <a href="/settings/production-stages">{pt('stageManagement')}</a>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-6 text-muted-foreground text-sm">
          General settings coming soon
        </div>
      </PageContent>
    </>
  )
}
