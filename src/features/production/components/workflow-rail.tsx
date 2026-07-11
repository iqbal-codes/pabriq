import { Check } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form'
import { useMembers } from '#/features/members/hooks'
import { getReadyForProductionLabel } from '#/features/production/ready-for-production-label'
import { cn } from '#/lib/utils'
import {
  useStages,
  useTaskActivities,
  useTaskDetail,
  useTaskMutations,
} from '../hooks'
import type { Stage } from '../model'
import { ActivityRow } from './activity-row'

export function WorkflowRail({
  taskId,
  activeStages,
  stepCounts,
}: {
  taskId: string
  activeStages: Stage[]
  stepCounts: Record<string, number>
}) {
  const t = useTranslations('production')
  const { data: task } = useTaskDetail(taskId)
  const { data: activities } = useTaskActivities(taskId)
  const { data: stages } = useStages()
  const { data: members } = useMembers()
  const { saveComment } = useTaskMutations()

  const stageNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of stages ?? []) map.set(s.id, s.name)
    return map
  }, [stages])

  const actorMap = useMemo(() => {
    const map = new Map<string, { name: string; image: string | null }>()
    if (!members) return map
    for (const m of members) {
      map.set(m.user.id, { name: m.user.name, image: m.user.image })
    }
    return map
  }, [members])

  const firstProdStageName = useMemo(
    () => activeStages.find((s) => s.board === 'production')?.name,
    [activeStages],
  )
  const readyForProductionLabel = useMemo(
    () =>
      getReadyForProductionLabel({
        firstProductionStageName: firstProdStageName,
        readyForProduction: t('readyForProduction'),
        readyForProductionWithStage: (values) =>
          t('readyForProductionQueue', values),
      }),
    [firstProdStageName, t],
  )

  const filteredActivities = useMemo(() => {
    if (!activities) return []
    return activities.filter(
      (act) =>
        act.type !== 'advancement_requested' &&
        act.type !== 'approved' &&
        act.type !== 'rejected',
    )
  }, [activities])

  const steps = useMemo(() => {
    const list: {
      id: string
      name: string
      board: string
      needApproval?: boolean
    }[] = []

    // 1. Queue
    list.push({ id: 'queue', name: t('queue'), board: 'pre_production' })

    // 2. Pre-production stages
    for (const s of activeStages) {
      if (s.board === 'pre_production') {
        list.push({
          id: s.id,
          name: s.name,
          board: 'pre_production',
          needApproval: s.needApproval,
        })
      }
    }

    // 3. Ready for production (computed label)
    list.push({
      id: 'ready_for_production',
      name: readyForProductionLabel,
      board: 'pre_production',
    })

    // 4. Production stages
    for (const s of activeStages) {
      if (s.board === 'production') {
        list.push({
          id: s.id,
          name: s.name,
          board: 'production',
          needApproval: s.needApproval,
        })
      }
    }

    // 5. Done
    list.push({ id: 'completed', name: t('done'), board: 'production' })

    if (!task) {
      return list.map((item) => ({ ...item, status: 'later' as const }))
    }

    let currentIndex = -1
    if (task.status === 'queued') {
      currentIndex = 0
    } else if (task.status === 'ready_for_production') {
      currentIndex = list.findIndex(
        (item) => item.id === 'ready_for_production',
      )
    } else if (task.status === 'completed') {
      currentIndex = list.findIndex((item) => item.id === 'completed')
    } else if (task.stageId) {
      currentIndex = list.findIndex((item) => item.id === task.stageId)
    }

    return list.map((item, idx) => {
      let status: 'done' | 'current' | 'next' | 'later' = 'later'
      if (idx < currentIndex) {
        status = 'done'
      } else if (idx === currentIndex) {
        status = 'current'
      } else if (idx === currentIndex + 1) {
        status = 'next'
      }
      return { ...item, status }
    })
  }, [activeStages, task, t, readyForProductionLabel])

  const commentForm = useAppForm({
    defaultValues: { text: '' },
    onSubmit: async ({ value }) => {
      if (!taskId || !value.text.trim()) return
      await saveComment.mutateAsync({ taskId, text: value.text.trim() })
      commentForm.reset()
    },
  })

  if (!taskId) {
    return (
      <section
        className="flex h-full min-h-0 items-center justify-center border-l border-border"
        aria-label={t('noTasks')}
      >
        <p className="text-sm text-muted-foreground">{t('noTasks')}</p>
      </section>
    )
  }

  return (
    <aside
      className="flex h-full min-h-0 flex-col border-l border-border!"
      aria-label={t('workflow')}
    >
      <div className="flex-1">
        <section className="shrink-0 border-b border-border px-4 py-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('workflow')}
          </h3>
          <ol className="mt-3 space-y-3">
            {steps.map((step, idx) => {
              const count = stepCounts?.[step.id] ?? 0
              const subtitle = (() => {
                if (step.id === 'queue') {
                  return step.status === 'done'
                    ? t('stepSubtitleReleased')
                    : t('stepSubtitleInQueue')
                }
                if (step.id === 'completed') {
                  return t('stepSubtitleReadyToShip')
                }
                if (step.status === 'current') {
                  if (task?.status === 'pending_approval') {
                    return t('stepSubtitlePendingReview')
                  }
                  return t('stepSubtitleCurrentStage')
                }
                if (step.status === 'next') {
                  return t('stepSubtitleNextStage')
                }
                if (step.status === 'later') {
                  if (step.needApproval) {
                    return t('stepSubtitleRequiresReview')
                  }
                  return t('stepSubtitleLater')
                }
                return t('stepSubtitleDone')
              })()

              return (
                <li
                  key={step.id}
                  className="flex items-start justify-between gap-3 text-[12px]"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    {step.status === 'done' ? (
                      <div className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                        <Check className="size-3" strokeWidth={3} />
                      </div>
                    ) : (
                      <span
                        className={cn(
                          'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                          step.status === 'current' &&
                            'bg-primary text-primary-foreground',
                          step.status === 'next' &&
                            'border border-primary text-foreground',
                          step.status === 'later' &&
                            'border border-border text-muted-foreground',
                        )}
                        aria-hidden
                      >
                        {idx + 1}
                      </span>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span
                        className={cn(
                          'truncate font-medium',
                          step.status === 'current'
                            ? 'font-semibold text-foreground'
                            : 'text-foreground/80',
                        )}
                      >
                        {step.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-none">
                        {subtitle}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-sm">
                    {count}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
        <section className="flex min-h-0 flex-1 flex-col border-b border-border px-4 py-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('activity')}
          </h3>
          <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-auto pr-1">
            {filteredActivities.length === 0 ? (
              <li className="py-6 text-center text-[11.5px] text-muted-foreground">
                {t('noActivity')}
              </li>
            ) : (
              filteredActivities.map((act) => (
                <li key={act.id}>
                  <ActivityRow
                    activity={act}
                    stageNameMap={stageNameMap}
                    actorMap={actorMap}
                    stages={stages}
                    taskContext={
                      task?.context as Record<string, unknown> | null
                    }
                  />
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
      <commentForm.AppForm>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void commentForm.handleSubmit()
          }}
          className="flex shrink-0 items-center gap-2 p-2"
        >
          <commentForm.AppField name="text">
            {(field) => (
              <input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void commentForm.handleSubmit()
                  }
                }}
                placeholder={t('commentPlaceholder')}
                aria-label={t('commentPlaceholder')}
                className="flex h-8 w-full rounded-none border border-input px-3 py-1 text-[12px] outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          </commentForm.AppField>
          <commentForm.SubmitButton
            size="sm"
            isPending={saveComment.isPending}
            disabled={!taskId}
          >
            {t('send')}
          </commentForm.SubmitButton>
        </form>
      </commentForm.AppForm>
    </aside>
  )
}
