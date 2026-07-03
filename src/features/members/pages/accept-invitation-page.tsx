import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Spinner } from '#/components/ui/spinner'
import {
  acceptInvitationFn,
  getInvitationFn,
  rejectInvitationFn,
} from '#/features/members/server'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'

export function AcceptInvitationPage({
  invitationId,
}: {
  invitationId: string
}) {
  const t = useTranslations('members')
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: invitation, isLoading } = useQuery({
    queryKey: ['invitation', invitationId],
    queryFn: () => getInvitationFn({ data: { id: invitationId } }),
  })

  const acceptMutation = useMutation({
    mutationFn: () => acceptInvitationFn({ data: { invitationId } }),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success(t('accepted'))
        await invalidateMutationQueries(queryClient, [{ queryKey: ['members'] }])
        navigate({ to: '/' })
      } else {
        toast.error(result.error)
      }
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => rejectInvitationFn({ data: { invitationId } }),
    onSuccess: async (result) => {
      if (result.ok) {
        toast.success(t('rejected'))
        await invalidateMutationQueries(queryClient, [{ queryKey: ['members'] }])
        navigate({ to: '/' })
      } else {
        toast.error(result.error)
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!invitation || invitation.status !== 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('acceptPageTitle')}</CardTitle>
            <CardDescription>{t('pendingDesc')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('acceptPageTitle')}</CardTitle>
          <CardDescription>
            {t('acceptDesc')}{' '}
            <strong>{invitation.organizationName ?? ''}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('email')}</span>
            <span>{invitation.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('role')}</span>
            <span>{invitation.role}</span>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            className="flex-1"
            isLoading={acceptMutation.isPending}
            disabled={acceptMutation.isPending || rejectMutation.isPending}
            onClick={() => acceptMutation.mutate()}
          >
            <Check className="mr-2 size-4" />
            {t('accept')}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            isLoading={rejectMutation.isPending}
            disabled={acceptMutation.isPending || rejectMutation.isPending}
            onClick={() => rejectMutation.mutate()}
          >
            <X className="mr-2 size-4" />
            {t('reject')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
