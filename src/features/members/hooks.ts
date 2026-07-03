import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import {
  cancelInvitationFn,
  inviteMemberFn,
  listInvitationsFn,
  listMembersFn,
  removeMemberFn,
  updateMemberRoleFn,
} from './server'

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: () => listMembersFn(),
  })
}

export function useInvitations() {
  return useQuery({
    queryKey: ['members', 'invitations'],
    queryFn: () => listInvitationsFn(),
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; role: string }) =>
      inviteMemberFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: ['members', 'invitations'] },
      ])
    },
  })
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { memberId: string; role: string }) =>
      updateMemberRoleFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [{ queryKey: ['members'] }])
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { memberIdOrEmail: string }) =>
      removeMemberFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [{ queryKey: ['members'] }])
    },
  })
}

export function useCancelInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { invitationId: string }) =>
      cancelInvitationFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: ['members', 'invitations'] },
      ])
    },
  })
}
