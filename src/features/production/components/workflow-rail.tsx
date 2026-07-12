import { useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form'
import { useMembers } from '#/features/members/hooks'
import {
  useStages,
  useTaskActivities,
  useTaskDetail,
  useTaskMutations,
} from '../hooks'
import { ActivityRow } from './activity-row'

export function WorkflowRail({ taskId }: { taskId: string }) {
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

  const filteredActivities = useMemo(() => {
    if (!activities) return []
    return activities.filter(
      (act) =>
        act.type !== 'advancement_requested' &&
        act.type !== 'approved' &&
        act.type !== 'rejected',
    )
  }, [activities])

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
        <section className="flex min-h-0 flex-1 flex-col border-b border-border px-4 py-3">
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
