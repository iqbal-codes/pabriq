import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelOrderDraftProposalFn,
  consumeOrderDraftProposalFn,
  getProposalFn,
  loadAssistantChatFn,
  sendAssistantMessageFn,
} from '#/features/assistant/server'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'

export type {
  AssistantChatMessage,
  AssistantChatMessageMetadata,
} from '#/features/assistant/model'

export type AssistantChatScope = { orgId: string; userId: string }

function buildResource(scope: AssistantChatScope): string {
  return `org:${scope.orgId}:user:${scope.userId}`
}

export function useAssistantChatHistory(scope: AssistantChatScope) {
  return useQuery({
    queryKey: queryKeys.assistant.chat(scope),
    queryFn: () => loadAssistantChatFn({ data: {} }),
  })
}

export function useSendAssistantMessage(scope: AssistantChatScope) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: queryKeys.assistant.chat(scope),
    mutationFn: (message: string) =>
      sendAssistantMessageFn({ data: { message } }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.assistant.chat(scope) },
      ])
    },
  })
}

export function useConsumeOrderDraftProposal(scope: AssistantChatScope) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (actionId: string) =>
      consumeOrderDraftProposalFn({
        data: {
          actionId,
          threadId: `assistant:${scope.orgId}:${scope.userId}`,
          resourceId: buildResource(scope),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assistant.chat(scope),
      })
    },
  })
}

export function useCancelOrderDraftProposal(scope: AssistantChatScope) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (actionId: string) =>
      cancelOrderDraftProposalFn({
        data: {
          actionId,
          threadId: `assistant:${scope.orgId}:${scope.userId}`,
          resourceId: buildResource(scope),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assistant.chat(scope),
      })
    },
  })
}

export function useGetProposal(actionId: string) {
  return useQuery({
    queryKey: ['assistant', 'proposal', actionId],
    queryFn: () => getProposalFn({ data: { actionId } }),
    staleTime: 30_000,
  })
}
