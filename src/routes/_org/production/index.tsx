import { createFileRoute } from '@tanstack/react-router'
import { parseAsStringEnum, useQueryState } from 'nuqs'
import { useTranslations } from 'use-intl'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { useTaskCounts } from '#/features/production/hooks'
import { ArchivedTasksPage } from '#/features/production/pages/archived-tasks-page'
import { KanbanPage } from '#/features/production/pages/kanban-page'

export const Route = createFileRoute('/_org/production/')({
  beforeLoad: () => ({
    breadcrumb: 'production',
    pageTitle: 'production',
  }),
  component: ProductionPage,
})

function ProductionPage() {
  const t = useTranslations('production')
  const ctx = Route.useRouteContext() as { session: unknown; org: { id: string } }
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsStringEnum(['active', 'archive']).withDefault('active'),
  )
  const [board, setBoard] = useQueryState(
    'board',
    parseAsStringEnum(['pre_production', 'production']).withDefault('pre_production'),
  )
  const { data: counts } = useTaskCounts(board)

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v === 'archive' ? 'archive' : null)}
      className="h-full"
    >
      <div className="flex items-center justify-between gap-4 pt-4 pb-2 px-4">
        <div className="flex gap-2">
          <Button
            variant={board === 'pre_production' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBoard('pre_production')}
          >
            {t('boardPreProduction')}
          </Button>
          <Button
            variant={board === 'production' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setBoard('production')}
          >
            {t('boardProduction')}
          </Button>
        </div>
        <TabsList>
          <TabsTrigger value="active">
            {t('tabActive')}
            {counts && (
              <Badge variant="default" className="ml-1.5 text-[10px] size-5">
                {counts.active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archive">
            {t('tabArchive')}
            {counts && (
              <Badge variant="default" className="ml-1.5 text-[10px] size-5">
                {counts.archived}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="active">
        <KanbanPage orgId={ctx.org.id} board={board} />
      </TabsContent>
      <TabsContent value="archive">
        <ArchivedTasksPage orgId={ctx.org.id} board={board} />
      </TabsContent>
    </Tabs>
  )
}
