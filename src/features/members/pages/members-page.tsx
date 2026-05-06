import { ChevronDown, UserMinus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  useCancelInvitation,
  useInvitations,
  useInviteMember,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from '#/features/members/hooks'
import type { MemberItem } from '#/features/members/server'
import { canManageMembers } from '#/features/permissions/model'

const ROLE_LABEL_KEYS: Record<string, string> = {
  owner: 'ownerRole',
  admin: 'adminRole',
  member: 'memberRole',
}

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://app.pabriq.com'
    : 'http://localhost:3000'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function MemberRow({
  member,
  canManage,
  onRemove,
  onRoleChange,
}: {
  member: MemberItem
  canManage: boolean
  onRemove: (member: MemberItem) => void
  onRoleChange: (member: MemberItem, role: string) => void
}) {
  const mt = useTranslations('members')
  const isOwner = member.role === 'owner'
  const roleLabelKey = ROLE_LABEL_KEYS[member.role] ?? member.role

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.user.image ?? ''} alt={member.user.name} />
            <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{member.user.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {member.user.email}
      </TableCell>
      <TableCell>
        {isOwner || !canManage ? (
          <Badge variant={isOwner ? 'default' : 'secondary'}>
            {mt(roleLabelKey)}
          </Badge>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                {mt(roleLabelKey)}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(['admin', 'member'] as const).map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => onRoleChange(member, r)}
                >
                  {mt(ROLE_LABEL_KEYS[r])}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {new Date(member.createdAt).toLocaleDateString()}
      </TableCell>
      <TableCell>
        {canManage && !isOwner && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(member)}
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

export function MembersPage({ orgRole }: { orgRole: string }) {
  const t = useTranslations('members')
  const ct = useTranslations('common')
  const canManage = canManageMembers(orgRole as 'owner' | 'admin' | 'member')

  const { data: members, isLoading: membersLoading } = useMembers()
  const { data: invitations, isLoading: invitationsLoading } = useInvitations()
  const inviteMember = useInviteMember()
  const updateMemberRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()
  const cancelInvitation = useCancelInvitation()

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

  const pendingInvitations = useMemo(
    () => (invitations ?? []).filter((inv) => inv.status === 'pending'),
    [invitations],
  )

  if (membersLoading || invitationsLoading) return null

  return (
    <PageContent>
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

      <Card className="mb-8">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('joined')}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  canManage={canManage}
                  onRemove={setRemoveTarget}
                  onRoleChange={(m, role) => {
                    updateMemberRole.mutate({
                      memberId: m.id,
                      role,
                    })
                  }}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('pending')}</CardTitle>
            <CardDescription>{t('pendingDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t(ROLE_LABEL_KEYS[inv.role] ?? inv.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setCancelTarget(inv.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
    </PageContent>
  )
}
