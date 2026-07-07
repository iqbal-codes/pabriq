import { parseAsStringEnum, useQueryState } from 'nuqs'
import { useTranslations } from 'use-intl'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useGlobalModal } from '#/hooks/use-global-overlay'
import { StageList } from '../components/stage-list'
import { useStages } from '../hooks'

export function StageManagementPage() {
  const t = useTranslations('production')
  const { openModal } = useGlobalModal()
  const [board, setBoard] = useQueryState(
    'board',
    parseAsStringEnum(['pre_production', 'production']).withDefault(
      'pre_production',
    ),
  )
  const { data: stages, isLoading } = useStages(board)

  return (
    <>
      <PageHeader
        title={t('stageManagement')}
        primaryAction={{
          label: t('addStage'),
          onClick: () => openModal('stage-form'),
        }}
      />
      <Tabs
        value={board}
        onValueChange={(v) => setBoard(v as 'pre_production' | 'production')}
        className="pt-2"
      >
        <TabsList>
          <TabsTrigger value="pre_production">
            {t('boardPreProduction')}
          </TabsTrigger>
          <TabsTrigger value="production">{t('boardProduction')}</TabsTrigger>
        </TabsList>
      </Tabs>
      <StageList stages={stages ?? []} loading={isLoading} />
    </>
  )
}
