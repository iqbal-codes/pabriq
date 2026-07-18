import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { PageHeader } from '#/components/app/page-shell/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog'
import {
  useApproveChannelAccess,
  useDisconnectTelegramChannel,
  useRevokeChannelAccess,
} from '#/features/channels/hooks'
import {
  AccessIdentitiesCard,
  type ChannelAccessRowData,
} from './access-identities-card'
import { ConnectBotCard } from './connect-bot-card'

type PendingAction =
  | { kind: 'disconnect'; botName: string }
  | { kind: 'approve'; access: ChannelAccessRowData }
  | { kind: 'revoke'; access: ChannelAccessRowData }
  | { kind: 'decline'; access: ChannelAccessRowData }

function accessIdentityString(access: ChannelAccessRowData): string {
  return access.username
    ? `${access.displayName} (@${access.username})`
    : access.displayName
}

export function ChannelsSettingsPage() {
  const t = useTranslations('channels')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)

  const disconnectMutation = useDisconnectTelegramChannel()
  const approveMutation = useApproveChannelAccess()
  const revokeMutation = useRevokeChannelAccess()

  const handleConfirmAction = async () => {
    if (!pendingAction) return
    const action = pendingAction

    try {
      if (action.kind === 'disconnect') {
        const res = await disconnectMutation.mutateAsync({})
        if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
          toast.error(
            (res as { error?: string }).error || t('error.loadFailed'),
          )
        } else {
          toast.success(t('toast.disconnected'))
        }
      } else if (action.kind === 'approve') {
        const res = await approveMutation.mutateAsync({ id: action.access.id })
        if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
          toast.error(
            (res as { error?: string }).error || t('error.loadFailed'),
          )
        } else {
          toast.success(
            t('toast.approved', {
              identity: accessIdentityString(action.access),
            }),
          )
        }
      } else if (action.kind === 'decline') {
        const res = await revokeMutation.mutateAsync({ id: action.access.id })
        if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
          toast.error(
            (res as { error?: string }).error || t('error.loadFailed'),
          )
        } else {
          toast.success(
            t('toast.declined', {
              identity: accessIdentityString(action.access),
            }),
          )
        }
      } else if (action.kind === 'revoke') {
        const res = await revokeMutation.mutateAsync({ id: action.access.id })
        if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
          toast.error(
            (res as { error?: string }).error || t('error.loadFailed'),
          )
        } else {
          toast.success(
            t('toast.revoked', {
              identity: accessIdentityString(action.access),
            }),
          )
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('error.loadFailed')
      toast.error(msg)
    } finally {
      setPendingAction(null)
    }
  }

  const isMutatingAction =
    disconnectMutation.isPending ||
    approveMutation.isPending ||
    revokeMutation.isPending

  const dialogTitle = pendingAction
    ? pendingAction.kind === 'disconnect'
      ? t('dialog.disconnectTitle')
      : pendingAction.kind === 'approve'
        ? t('dialog.approveTitle', {
            identity: pendingAction.access.displayName,
          })
        : pendingAction.kind === 'decline'
          ? t('dialog.declineTitle', {
              identity: pendingAction.access.displayName,
            })
          : t('dialog.revokeTitle', {
              identity: pendingAction.access.displayName,
            })
    : ''

  const dialogDescription = pendingAction
    ? pendingAction.kind === 'disconnect'
      ? t('dialog.disconnectDescription', { bot: pendingAction.botName })
      : pendingAction.kind === 'approve'
        ? t('dialog.approveDescription', {
            identity: accessIdentityString(pendingAction.access),
          })
        : t('dialog.revokeDescription', {
            identity: accessIdentityString(pendingAction.access),
          })
    : ''

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('subtitle')} />

      <ConnectBotCard
        onDisconnectClick={(botName) =>
          setPendingAction({ kind: 'disconnect', botName })
        }
      />

      <AccessIdentitiesCard
        onActionClick={(kind, access) => setPendingAction({ kind, access })}
      />

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutatingAction}>
              {t('actions.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isMutatingAction}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmAction()
              }}
            >
              {isMutatingAction ? t('actions.saving') : t('actions.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ChannelsSettingsPage
