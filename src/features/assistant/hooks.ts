import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  loadAssistantChatFn,
  sendAssistantMessageFn,
} from '#/features/assistant/server'
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'

export type { AssistantChatMessage } from '#/features/assistant/model'

export type AssistantChatScope = { orgId: string; userId: string }

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
