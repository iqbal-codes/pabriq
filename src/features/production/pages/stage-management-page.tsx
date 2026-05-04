import { useTranslations } from 'use-intl'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { StageList } from '../components/stage-list'
import { useStages } from '../hooks'

export function StageManagementPage() {
  const t = useTranslations('breadcrumb')
  const pt = useTranslations('production')
  const { data: stages, isLoading } = useStages()

  return (
    <>
      <PageHeader title={pt('stageManagement')} />
      <PageContent>
        <Tabs value="stages" className="w-full">
          <TabsList>
            <TabsTrigger value="general" asChild>
              <a href="/settings/general">{t('general')}</a>
            </TabsTrigger>
            <TabsTrigger value="stages" asChild>
              <a href="/settings/production-stages">{pt('stageManagement')}</a>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-6">
          <StageList stages={stages ?? []} loading={isLoading} />
        </div>
      </PageContent>
    </>
  )
}
