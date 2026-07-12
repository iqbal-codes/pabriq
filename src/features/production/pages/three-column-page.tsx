import { XIcon } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from '#/components/ui/sheet'
import { Tabs, TabsContent } from '#/components/ui/tabs'
import { useIsMobile } from '#/hooks/use-mobile'
import { DetailTabBar } from '../components/detail-tab-bar'
import {
  SelectedTaskPane,
  SelectedTaskSummary,
} from '../components/selected-task-pane'
import { type QueueTab, WorkQueue } from '../components/work-queue'
import { WorkflowRail } from '../components/workflow-rail'
import { useBoardTasks, useStages } from '../hooks'
import type { BoardTask, Stage } from '../model'

type Props = {
  orgId: string
}

type BoardData = {
  queued: BoardTask[]
  stages: Map<string, BoardTask[]>
  readyForProduction: BoardTask[]
  done: BoardTask[]
}

function pickBoardTasks(
  boardData: BoardData | undefined,
  activeStages: Stage[],
): { ready: BoardTask[]; waiting: BoardTask[] } {
  if (!boardData) return { ready: [], waiting: [] }
  const inFlight: BoardTask[] = []
  for (const stageTasks of boardData.stages.values()) {
    inFlight.push(...stageTasks)
  }
  const ready: BoardTask[] = [
    ...boardData.queued,
    ...inFlight.filter((bt) => bt.task.status !== 'pending_approval'),
    ...boardData.readyForProduction,
  ]
  const waiting: BoardTask[] = inFlight.filter(
    (bt) => bt.task.status === 'pending_approval',
  )
  const stageOrder = new Map(activeStages.map((s, i) => [s.id, i] as const))
  const sortByStage = (a: BoardTask, b: BoardTask): number => {
    const aIdx = a.task.stageId ? (stageOrder.get(a.task.stageId) ?? -1) : -1
    const bIdx = b.task.stageId ? (stageOrder.get(b.task.stageId) ?? -1) : -1
    if (aIdx !== bIdx) return aIdx - bIdx
    return 0
  }
  ready.sort(sortByStage)
  waiting.sort(sortByStage)
  return { ready, waiting }
}

export function ThreeColumnPage({ orgId }: Props) {
  const t = useTranslations('production')
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''))
  const [selectedTaskId, setSelectedTaskId] = useQueryState(
    'task',
    parseAsString.withDefault(''),
  )
  const isPhone = useIsMobile(728)
  const isBelowWideDesktop = useIsMobile(1728, true)
  const isTwoColumn = !isPhone && isBelowWideDesktop
  const [queueTab, setQueueTab] = useState<QueueTab>('active')
  const [detailTab, setDetailTab] = useState<'detail' | 'activity'>('detail')
  const handleSelectTask = useCallback(
    (id: string) => {
      void setSelectedTaskId(id)
      setDetailTab('detail')
    },
    [setSelectedTaskId],
  )

  const { data: stages } = useStages()
  const activeStages = useMemo(
    () =>
      (stages ?? [])
        .filter((s) => s.active)
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [stages],
  )

  const filters = useMemo(
    () => ({
      orgId,
      search: search || undefined,
    }),
    [orgId, search],
  )
  const { data: boardData, isLoading: boardLoading } = useBoardTasks(filters)
  const { ready, waiting } = useMemo(
    () => pickBoardTasks(boardData, activeStages),
    [boardData, activeStages],
  )

  const allTasks = useMemo(() => [...ready, ...waiting], [ready, waiting])
  const effectiveTaskId =
    selectedTaskId && allTasks.some((bt) => bt.task.id === selectedTaskId)
      ? selectedTaskId
      : ''

  useEffect(() => {
    if (effectiveTaskId) {
      setDetailTab('detail')
    }
  }, [effectiveTaskId])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={
          isPhone
            ? 'grid min-h-0 flex-1 grid-cols-1'
            : isTwoColumn
              ? 'grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)]'
              : 'grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)_300px]'
        }
      >
        <WorkQueue
          orgId={orgId}
          tab={queueTab}
          onTabChange={setQueueTab}
          ready={ready}
          waiting={waiting}
          activeStages={activeStages}
          selectedTaskId={effectiveTaskId}
          onSelect={handleSelectTask}
          isLoading={boardLoading}
          search={search}
          onSearchChange={(val) => void setSearch(val || null)}
        />

        {isTwoColumn && (
          <TabbedTaskPane
            taskId={effectiveTaskId}
            orgId={orgId}
            activeStages={activeStages}
            tab={detailTab}
            onTabChange={setDetailTab}
          />
        )}

        {!isPhone && !isTwoColumn && (
          <>
            <SelectedTaskPane
              key={effectiveTaskId}
              taskId={effectiveTaskId}
              orgId={orgId}
              activeStages={activeStages}
            />
            <WorkflowRail taskId={effectiveTaskId} />
          </>
        )}
      </div>

      {isPhone && (
        <Sheet
          open={!!effectiveTaskId}
          onOpenChange={(open) => {
            if (!open) void setSelectedTaskId(null)
          }}
        >
          <SheetContent
            side="right"
            showCloseButton={false}
            className="border-l-0 data-[side=right]:w-full data-[side=right]:max-w-none data-[side=right]:sm:max-w-none [&_aside]:border-l-0 [&_section]:border-r-0"
            aria-describedby={undefined}
          >
            <SheetTitle className="sr-only">{t('taskDetail')}</SheetTitle>
            <div className="relative shrink-0 border-b">
              <SelectedTaskSummary
                taskId={effectiveTaskId}
                activeStages={activeStages}
              />
              <SheetClose asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label={t('close')}
                  className="absolute right-0 top-0"
                >
                  <XIcon className="size-4" aria-hidden="true" />
                </Button>
              </SheetClose>
            </div>
            <TabbedTaskPane
              taskId={effectiveTaskId}
              orgId={orgId}
              activeStages={activeStages}
              tab={detailTab}
              onTabChange={setDetailTab}
              showSummary={false}
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

type TabbedTaskPaneProps = {
  taskId: string
  orgId: string
  activeStages: Stage[]
  tab: 'detail' | 'activity'
  onTabChange: (tab: 'detail' | 'activity') => void
  showSummary?: boolean
}

function TabbedTaskPane({
  taskId,
  orgId,
  activeStages,
  tab,
  onTabChange,
  showSummary = true,
}: TabbedTaskPaneProps) {
  const t = useTranslations('production')

  if (!taskId) {
    return (
      <section
        className="flex h-full min-h-0 items-center justify-center"
        aria-label={t('noTasks')}
      >
        <p className="text-sm text-muted-foreground">{t('noTasks')}</p>
      </section>
    )
  }
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {showSummary && taskId && (
        <div className="shrink-0 border-b">
          <SelectedTaskSummary taskId={taskId} activeStages={activeStages} />
        </div>
      )}
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'detail' || value === 'activity') onTabChange(value)
        }}
        className="flex min-h-0 flex-1 flex-col gap-0!"
      >
        <DetailTabBar />
        <TabsContent
          value="detail"
          className="min-h-0 flex-1 overflow-y-auto [&_aside]:h-auto [&_section]:h-auto"
        >
          <SelectedTaskPane
            key={`tabbed-${taskId}`}
            showSummary={false}
            taskId={taskId}
            orgId={orgId}
            activeStages={activeStages}
          />
        </TabsContent>
        <TabsContent value="activity" className="min-h-0 flex-1">
          <WorkflowRail taskId={taskId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
