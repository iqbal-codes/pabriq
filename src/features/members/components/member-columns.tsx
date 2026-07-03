import { ChevronDown, UserMinus } from 'lucide-react'
import { useTranslations } from 'use-intl'
import type { AppColumnDef } from '#/components/app/data-table'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import type { InvitationItem, MemberItem } from '#/features/members/server'
import { Spinner } from '#/components/ui/spinner'

const ROLE_LABEL_KEYS: Record<
  string,
  'ownerRole' | 'adminRole' | 'memberRole'
> = {
  owner: 'ownerRole',
  admin: 'adminRole',
  member: 'memberRole',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function useMemberColumns({
  canManage,
  updateMemberRole,
}: {
  canManage: boolean
  updateMemberRole: {
    mutate: (opts: { memberId: string; role: string }) => void
    isPending: boolean
    variables?: { memberId: string; role: string }
  }
}): AppColumnDef<MemberItem>[] {
  const t = useTranslations('members')

  return [
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
              {(['admin', 'member'] as const).map((r) => {
                const isUpdatingThisRole =
                  updateMemberRole.isPending &&
                  updateMemberRole.variables?.memberId === member.id &&
                  updateMemberRole.variables?.role === r
                return (
                  <DropdownMenuItem
                    key={r}
                    disabled={updateMemberRole.isPending}
                    onClick={() =>
                      updateMemberRole.mutate({
                        memberId: member.id,
                        role: r,
                      })
                    }
                  >
                    {isUpdatingThisRole && <Spinner className="mr-2 size-3" />}
                    {t(ROLE_LABEL_KEYS[r])}
                  </DropdownMenuItem>
                )
              })}
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
}

export function useInvitationColumns(): AppColumnDef<InvitationItem>[] {
  const t = useTranslations('members')

  return [
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
}

export function MemberRowActions({
  member,
  canManage,
  onRemove,
}: {
  member: MemberItem
  canManage: boolean
  onRemove: () => void
}) {
  if (!canManage || member.role === 'owner') return null
  return (
    <Button variant="ghost" size="icon-sm" onClick={onRemove}>
      <UserMinus className="size-4" />
    </Button>
  )
}

export function InvitationRowActions({
  canManage,
  onCancel,
}: {
  canManage: boolean
  onCancel: () => void
}) {
  if (!canManage) return null
  return (
    <Button variant="ghost" size="icon-sm" onClick={onCancel}>
      <UserMinus className="size-4" />
    </Button>
  )
}
