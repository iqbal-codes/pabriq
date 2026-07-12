import { useRouteContext } from '@tanstack/react-router'
import { lazy, useMemo } from 'react'
import { useTranslations } from 'use-intl'
import { usePaymentMethods } from '#/features/invoices/hooks'
import type { PaymentMethod } from '#/features/invoices/model'
import type { Role } from '#/features/permissions/model'
import { canApproveProductionTask } from '#/features/permissions/model'
import {
  useStages,
  useTaskDetail,
  useTaskMutations,
} from '#/features/production/hooks'
import { getReadyForProductionLabel } from '#/features/production/ready-for-production-label'
import { useGlobalModal } from '#/hooks/use-global-overlay'

import type { GlobalOverlayProps } from './global-modal-registry'

// Lazy-loaded presenters
const InviteMemberDialog = lazy(() =>
  import('#/features/members/components/invite-member-dialog').then((m) => ({
    default: m.InviteMemberDialog,
  })),
)
const PaymentMethodFormDialog = lazy(() =>
  import('#/features/invoices/components/payment-method-form-dialog').then(
    (m) => ({ default: m.PaymentMethodFormDialog }),
  ),
)
const RecordPaymentDialog = lazy(() =>
  import('#/features/invoices/components/record-payment-dialog').then((m) => ({
    default: m.RecordPaymentDialog,
  })),
)
const StageForm = lazy(() =>
  import('#/features/production/components/stage-form').then((m) => ({
    default: m.StageForm,
  })),
)
const TaskDetailModal = lazy(() =>
  import('#/features/production/components/task-detail-modal').then((m) => ({
    default: m.TaskDetailModal,
  })),
)
const ReviewModal = lazy(() =>
  import('#/features/production/components/review-modal').then((m) => ({
    default: m.ReviewModal,
  })),
)

// Smart container wrappers — resolve data deps so presentation components stay pure

function InviteMemberDialogWrapper({ open, onOpenChange }: GlobalOverlayProps) {
  return <InviteMemberDialog open={open} onOpenChange={onOpenChange} />
}

function PaymentMethodFormDialogWrapper({
  open,
  onOpenChange,
  id,
}: GlobalOverlayProps) {
  const { data: methods } = usePaymentMethods()
  const editingMethod = useMemo(() => {
    return id
      ? (methods?.find((m: PaymentMethod) => m.id === id) ?? null)
      : null
  }, [methods, id])

  return (
    <PaymentMethodFormDialog
      open={open}
      onOpenChange={onOpenChange}
      editingMethod={editingMethod}
      onSaved={() => {}}
    />
  )
}

function RecordPaymentDialogWrapper({
  open,
  onOpenChange,
  id,
}: GlobalOverlayProps) {
  if (!id) return null
  return (
    <RecordPaymentDialog
      open={open}
      onOpenChange={onOpenChange}
      invoiceId={id}
    />
  )
}

function StageFormWrapper({ open, onOpenChange, id }: GlobalOverlayProps) {
  const { data: stages } = useStages()
  const stage = useMemo(() => {
    return id ? stages?.find((s) => s.id === id) : undefined
  }, [stages, id])

  if (id && !stage) return null

  return <StageForm open={open} onOpenChange={onOpenChange} stage={stage} />
}

function TaskDetailModalWrapper({
  open,
  onOpenChange,
  id,
}: GlobalOverlayProps) {
  const { openModal } = useGlobalModal()
  // Route context is guaranteed since the container mounts inside _org layout
  const ctx = useRouteContext({ from: '/_org' }) as {
    org: { id: string }
    role: Role
  }
  const canApprove = canApproveProductionTask(ctx.role)

  if (!id) return null

  return (
    <TaskDetailModal
      open={open}
      onOpenChange={onOpenChange}
      taskId={id}
      orgId={ctx.org.id}
      canApprove={canApprove}
      onReview={(taskId) => openModal('review-task', taskId)}
    />
  )
}

function ReviewModalWrapper({ open, onOpenChange, id }: GlobalOverlayProps) {
  const pt = useTranslations('portal')
  const { data: task } = useTaskDetail(id ?? '')
  const { data: stages } = useStages()
  const { approveAdvance, rejectAdvance } = useTaskMutations()

  const allActiveStages = useMemo(() => {
    if (!stages) return []
    return stages
      .filter((s) => s.active)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  }, [stages])

  const getBoardStages = useMemo(() => {
    return (board: string) =>
      allActiveStages
        .filter((s) => s.board === board)
        .sort((a, b) => a.orderIndex - b.orderIndex)
  }, [allActiveStages])

  const reviewStageName = useMemo(() => {
    if (!task || !allActiveStages.length) return ''
    const s = allActiveStages.find((st) => st.id === task.stageId)
    return s?.name ?? ''
  }, [task, allActiveStages])

  const reviewNextStageName = useMemo(() => {
    if (!task || !allActiveStages.length) return ''
    const boardStages = getBoardStages(task.board)
    const idx = boardStages.findIndex((st) => st.id === task.stageId)
    const next = boardStages[idx + 1]
    if (next) return next.name
    if (task.board === 'pre_production') {
      const firstProdStage = allActiveStages.find(
        (s) => s.active && s.board === 'production',
      )
      return getReadyForProductionLabel({
        firstProductionStageName: firstProdStage?.name,
        readyForProduction: pt('timelineReadyForProduction'),
        readyForProductionWithStage: (values) =>
          pt('timelineReadyForProductionWithStage', values),
      })
    }
    return ''
  }, [task, allActiveStages, getBoardStages, pt])

  const reviewRequirementResponses = useMemo(() => {
    if (!task) return undefined
    const ctx = task.context as Record<string, unknown> | null
    return ctx?.requirementResponses as
      | Record<string, { value?: string; assetIds?: string[] }>
      | undefined
  }, [task])

  const reviewRequirements = useMemo(() => {
    if (!task || !allActiveStages.length) return []
    const stage = allActiveStages.find((st) => st.id === task.stageId)
    return stage?.requirements ?? []
  }, [task, allActiveStages])

  if (!id || !task) return null

  return (
    <ReviewModal
      open={open}
      onOpenChange={onOpenChange}
      taskId={id}
      taskNumber={task.taskNumber ?? null}
      stageName={reviewStageName}
      nextStageName={reviewNextStageName || undefined}
      requirementResponses={reviewRequirementResponses}
      requirements={reviewRequirements}
      isApproving={approveAdvance.isPending}
      isRejecting={rejectAdvance.isPending}
      onApprove={async (taskId, notes) => {
        const result = await approveAdvance.mutateAsync({
          taskId,
          reviewNotes: notes,
        })
        if ('ok' in result && result.ok) {
          onOpenChange(false)
        }
      }}
      onReject={async (taskId, notes) => {
        const result = await rejectAdvance.mutateAsync({
          taskId,
          reviewNotes: notes,
        })
        if ('ok' in result && result.ok) {
          onOpenChange(false)
        }
      }}
    />
  )
}

// Mapping of overlay keys to their container wrappers
export const GLOBAL_MODALS = {
  'invite-member': InviteMemberDialogWrapper,
  'payment-method-form': PaymentMethodFormDialogWrapper,
  'record-payment': RecordPaymentDialogWrapper,
  'stage-form': StageFormWrapper,
  'task-detail': TaskDetailModalWrapper,
  'review-task': ReviewModalWrapper,
} as const
