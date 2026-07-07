import { useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import type { DataTableLabels } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { CancelInvitationDialog } from '#/features/members/components/cancel-invitation-dialog'
import {
  InvitationRowActions,
  MemberRowActions,
  useInvitationColumns,
  useMemberColumns,
} from '#/features/members/components/member-columns'
import { RemoveMemberDialog } from '#/features/members/components/remove-member-dialog'
import {
  useCancelInvitation,
  useInvitations,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from '#/features/members/hooks'
import type { InvitationItem, MemberItem } from '#/features/members/server'
import { canManageMembers } from '#/features/permissions/model'
import { useGlobalModal } from '#/hooks/use-global-overlay'

export function MembersPage({ orgRole }: { orgRole: string }) {
  const t = useTranslations('members')
  const dt = useTranslations('dataTable')
  const canManage = canManageMembers(orgRole as 'owner' | 'admin' | 'member')
  const { openModal } = useGlobalModal()

  const { data: members, isLoading: membersLoading } = useMembers()
  const { data: invitations, isLoading: invitationsLoading } = useInvitations()
  const updateMemberRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()
  const cancelInvitation = useCancelInvitation()

  const memberList = members ?? []
  const pendingInvitations = useMemo(
    () => (invitations ?? []).filter((inv) => inv.status === 'pending'),
    [invitations],
  )

  const [removeTarget, setRemoveTarget] = useState<MemberItem | null>(null)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)

  const memberColumns = useMemberColumns({ canManage, updateMemberRole })
  const invitationColumns = useInvitationColumns()

  const labels: DataTableLabels = {
    clearFilters: dt('clearFilters'),
    columnVisibility: dt('columnVisibility'),
    errorRetry: dt('errorRetry'),
    errorTitle: dt('errorTitle'),
    firstPage: dt('firstPage'),
    lastPage: dt('lastPage'),
    loading: dt('loading'),
    nextPage: dt('nextPage'),
    of: dt('of'),
    page: dt('page'),
    perPage: dt('perPage'),
    previousPage: dt('previousPage'),
    resetColumns: dt('resetColumns'),
    rowsSelected: (selected: number, total: number) =>
      dt('rowsSelected', { selected, total }),
    visibleRows: (from: number, to: number, total: number) =>
      dt('visibleRows', { from, to, total }),
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        primaryAction={
          canManage
            ? {
                label: t('invite'),
                onClick: () => openModal('invite-member'),
              }
            : undefined
        }
      />

      <DataTable
        columns={memberColumns}
        data={memberList}
        getRowId={(row) => row.id}
        isLoading={membersLoading}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={memberList.length || 1}
        tableId="members"
        totalRows={memberList.length}
        emptyTitle={t('noMembers')}
        emptyDescription={t('noMembersDesc')}
        noResultsTitle={t('noMembers')}
        hasActiveFilters={false}
        rowActions={(member: MemberItem) => (
          <MemberRowActions
            member={member}
            canManage={canManage}
            onRemove={() => setRemoveTarget(member)}
          />
        )}
      />

      {pendingInvitations.length > 0 && (
        <div className="mt-8 space-y-4">
          <div>
            <h2 className="text-base font-semibold">{t('pending')}</h2>
            <p className="text-sm text-muted-foreground">{t('pendingDesc')}</p>
          </div>
          <DataTable
            columns={invitationColumns}
            data={pendingInvitations}
            getRowId={(row) => row.id}
            isLoading={invitationsLoading}
            labels={labels}
            onPageChange={() => {}}
            onPerPageChange={() => {}}
            page={1}
            perPage={pendingInvitations.length || 1}
            tableId="invitations"
            totalRows={pendingInvitations.length}
            emptyTitle={t('noMembers')}
            hasActiveFilters={false}
            rowActions={(inv: InvitationItem) => (
              <InvitationRowActions
                canManage={canManage}
                onCancel={() => setCancelTarget(inv.id)}
              />
            )}
          />
        </div>
      )}

      <RemoveMemberDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        isRemoving={removeMember.isPending}
        onConfirm={async () => {
          if (!removeTarget) return
          const result = await removeMember.mutateAsync({
            memberIdOrEmail: removeTarget.user.email,
          })
          if (result.ok) {
            setRemoveTarget(null)
          }
        }}
      />

      <CancelInvitationDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        isCancelling={cancelInvitation.isPending}
        onConfirm={async () => {
          if (!cancelTarget) return
          const result = await cancelInvitation.mutateAsync({
            invitationId: cancelTarget,
          })
          if (result.ok) {
            setCancelTarget(null)
          }
        }}
      />
    </>
  )
}
