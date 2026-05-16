import { ChevronDown, UserMinus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import type { AppColumnDef, DataTableLabels } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
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
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  useCancelInvitation,
  useInvitations,
  useInviteMember,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from '#/features/members/hooks'
import type { InvitationItem, MemberItem } from '#/features/members/server'
import { canManageMembers } from '#/features/permissions/model'

const ROLE_LABEL_KEYS: Record<
  string,
  'ownerRole' | 'adminRole' | 'memberRole'
> = {
  owner: 'ownerRole',
  admin: 'adminRole',
  member: 'memberRole',
}

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://app.pabriq.com'
    : 'http://localhost:3001'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function MembersPage({ orgRole }: { orgRole: string }) {
  const t = useTranslations('members')
  const ct = useTranslations('common')
  const dt = useTranslations('dataTable')
  const canManage = canManageMembers(orgRole as 'owner' | 'admin' | 'member')

  const { data: members, isLoading: membersLoading } = useMembers()
  const { data: invitations, isLoading: invitationsLoading } = useInvitations()
  const inviteMember = useInviteMember()
  const updateMemberRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()
  const cancelInvitation = useCancelInvitation()

  const memberList = members ?? []
  const pendingInvitations = useMemo(
    () => (invitations ?? []).filter((inv) => inv.status === 'pending'),
    [invitations],
  )

  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<MemberItem | null>(null)
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)

  const inviteForm = useAppForm({
    defaultValues: { email: '', role: 'member' as string },
    onSubmit: async ({ value }) => {
      const result = await inviteMember.mutateAsync({
        email: value.email,
        role: value.role,
      })
      if (result.ok) {
        const inviteUrl = `${BASE_URL}/invite/accept?id=${result.invitationId}`
        setInviteOpen(false)
        inviteForm.reset()
        try {
          await navigator.clipboard.writeText(inviteUrl)
          toast.success(t('inviteLinkCopied'))
        } catch {
          toast.success(t('inviteSent'))
        }
      } else {
        toast.error(result.error)
      }
    },
  })

  const memberColumns: AppColumnDef<MemberItem>[] = [
    {
      id: 'name',
      header: t('name'),
      meta: { label: t('name'), mobileRole: 'title' },
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarImage
              src={row.original.user.image ?? ''}
              alt={row.original.user.name}
            />
            <AvatarFallback>
              {getInitials(row.original.user.name)}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.original.user.name}</span>
        </div>
      ),
    },
    {
      id: 'email',
      header: t('email'),
      meta: { label: t('email'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.user.email}</span>
      ),
    },
    {
      id: 'role',
      header: t('role'),
      meta: { label: t('role'), mobileRole: 'badge' },
      cell: ({ row }) => {
        const member = row.original
        const isOwner = member.role === 'owner'
        const roleLabelKey = ROLE_LABEL_KEYS[member.role] ?? member.role
        if (isOwner || !canManage) {
          return (
            <Badge variant={isOwner ? 'default' : 'secondary'}>
              {t(roleLabelKey)}
            </Badge>
          )
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {t(roleLabelKey)}
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(['admin', 'member'] as const).map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() =>
                    updateMemberRole.mutate({
                      memberId: member.id,
                      role: r,
                    })
                  }
                >
                  {t(ROLE_LABEL_KEYS[r])}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
    {
      id: 'joined',
      header: t('joined'),
      meta: { label: t('joined'), mobileRole: 'meta' },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.createdAt).toLocaleDateString('id-ID')}
        </span>
      ),
    },
  ]

  const invitationColumns: AppColumnDef<InvitationItem>[] = [
    {
      accessorKey: 'email',
      header: t('email'),
      meta: { label: t('email'), mobileRole: 'title' },
    },
    {
      id: 'role',
      header: t('role'),
      meta: { label: t('role'), mobileRole: 'badge' },
      cell: ({ row }) => (
        <Badge variant="secondary">
          {t(ROLE_LABEL_KEYS[row.original.role] ?? row.original.role)}
        </Badge>
      ),
    },
  ]

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
                onClick: () => setInviteOpen(true),
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
        rowActions={(member: MemberItem) =>
          canManage && member.role !== 'owner' ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setRemoveTarget(member)}
            >
              <UserMinus className="size-4" />
            </Button>
          ) : null
        }
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
            rowActions={(inv: InvitationItem) =>
              canManage ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCancelTarget(inv.id)}
                >
                  <UserMinus className="size-4" />
                </Button>
              ) : null
            }
          />
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('invite')}</DialogTitle>
            <DialogDescription>{t('inviteDesc')}</DialogDescription>
          </DialogHeader>
          <FormRoot form={inviteForm}>
            <FormGrid columns={1}>
              <inviteForm.AppField name="email">
                {(field) => <field.EmailField label={t('email')} />}
              </inviteForm.AppField>
              <inviteForm.AppField name="role">
                {(field) => (
                  <field.SelectField
                    label={t('role')}
                    options={[
                      { value: 'admin', label: t('adminRole') },
                      { value: 'member', label: t('memberRole') },
                    ]}
                  />
                )}
              </inviteForm.AppField>
            </FormGrid>
            <FormActions>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                {ct('cancel')}
              </Button>
              <inviteForm.AppForm>
                <inviteForm.SubmitButton>{t('invite')}</inviteForm.SubmitButton>
              </inviteForm.AppForm>
            </FormActions>
          </FormRoot>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('remove')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ct('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) {
                  removeMember.mutate({
                    memberIdOrEmail: removeTarget.user.email,
                  })
                }
                setRemoveTarget(null)
              }}
            >
              {t('remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelInvite')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cancelConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ct('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cancelTarget) {
                  cancelInvitation.mutate({ invitationId: cancelTarget })
                }
                setCancelTarget(null)
              }}
            >
              {t('cancelInvite')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
