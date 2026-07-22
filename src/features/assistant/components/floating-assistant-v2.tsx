import {
  AssistantRuntimeProvider,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react'
import {
  AssistantChatTransport,
  useChatRuntime,
} from '@assistant-ui/react-ai-sdk'
import type { UIMessage } from 'ai'
import { Bot, ChevronUp, Loader2, Send, Square } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslations } from 'use-intl'
import { StreamdownText } from '#/components/assistant-ui/streamdown-text'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import {
  type AssistantChatScope,
  useAssistantChatHistory,
} from '#/features/assistant/hooks'
import { DotMatrix } from '#/components/assistant-ui/dot-matrix'

function formatMessageTime(dateInput?: Date | string | number) {
  if (!dateInput) return ''
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
function AssistantRuntimeWrapper({
  messages,
  children,
}: {
  messages: UIMessage[]
  children: React.ReactNode
}) {
  // Canonical AI SDK v7 + assistant-ui wiring: useChatRuntime handles
  // messages, status, tool calls, and incremental UI message stream updates
  // out of the box. Server derives thread/resource from the session, so the
  // client only needs to point at the route.
  const runtime = useChatRuntime({
    messages,
    transport: new AssistantChatTransport({ api: '/api/assistant/chat' }),
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  )
}
type FloatingAssistantProps = {
  orgId: string
  userId: string
}

export function FloatingAssistantV2({ orgId, userId }: FloatingAssistantProps) {
  const t = useTranslations('assistant')
  const [open, setOpen] = useState(false)

  const scope = useMemo<AssistantChatScope>(
    () => ({ orgId, userId }),
    [orgId, userId],
  )
  const historyQuery = useAssistantChatHistory(scope)
  const historyError = historyQuery.data?.pages.find((page) => !page.ok)

  const historyMessages = useMemo(() => {
    return (
      historyQuery.data?.pages
        .slice()
        .reverse()
        .flatMap((page) => (page.ok ? page.messages : [])) ?? []
    )
  }, [historyQuery.data])
  const messages = useMemo<UIMessage[]>(() => {
    return historyMessages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: new Date(msg.createdAt),
      parts: [
        { type: 'text' as const, text: msg.content },
        ...((
          msg.toolCalls as
            | Array<{
                toolCallId: string
                toolName: string
                summary?: string
              }>
            | undefined
        )?.map((call) => ({
          type: 'dynamic-tool' as const,
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          state: 'output-available' as const,
          input: {},
          output:
            msg.metadata?.kind === 'order_draft_proposal'
              ? {
                  actionId: msg.metadata.actionId,
                  expiresAt: msg.metadata.expiresAt,
                }
              : msg.metadata?.kind === 'order_draft_error'
                ? { reason: msg.metadata.reason }
                : { summary: call.summary },
        })) ?? []),
      ],
    }))
  }, [historyMessages])

  const historyMessageTimeMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const msg of historyMessages) {
      if (msg.id && msg.createdAt) {
        map.set(msg.id, msg.createdAt)
      }
    }
    return map
  }, [historyMessages])
  return (
    <>
      <Button
        className="fixed right-4 bottom-4 z-40 size-12 rounded-full shadow-md md:right-6 md:bottom-6"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t('trigger')}
      >
        <Bot className="size-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="flex w-full! max-w-none! flex-col p-0 sm:w-[35rem]! sm:max-w-[calc(100vw-2rem)]!"
        >
          <SheetHeader className="shrink-0 border-b px-4 py-3 pr-12">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-4" aria-hidden="true" />
              </span>
              {t('title')}
            </SheetTitle>
            <SheetDescription className="max-w-[46ch] text-xs/relaxed">
              {t('description')}
            </SheetDescription>
          </SheetHeader>

          {historyQuery.isLoading ? (
            <div className="relative min-h-0 flex-1 bg-muted/30 px-3 py-4 sm:px-4">
              <div
                role="status"
                aria-label={t('loadingHistory')}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-16 w-[78%]" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-12 w-[64%]" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-24 w-[86%]" />
                </div>
              </div>
            </div>
          ) : historyQuery.isError || historyError ? (
            <div className="relative min-h-0 flex-1 bg-muted/30 px-3 py-4 sm:px-4">
              <div
                role="alert"
                className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center"
              >
                <p className="text-sm font-medium text-destructive">
                  {t('historyError')}
                </p>
                <Button
                  variant="outline"
                  onClick={() => void historyQuery.refetch()}
                >
                  {t('retry')}
                </Button>
              </div>
            </div>
          ) : (
            <AssistantRuntimeWrapper messages={messages}>
              <div className="relative min-h-0 flex-1 bg-muted/30">
                <ThreadPrimitive.Root className="flex h-full flex-col">
                  <ThreadPrimitive.Viewport
                    turnAnchor="top"
                    className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
                  >
                    {historyQuery.hasNextPage && (
                      <div className="mb-4 flex justify-center">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={historyQuery.isFetchingNextPage}
                          onClick={() => void historyQuery.fetchNextPage()}
                        >
                          {historyQuery.isFetchingNextPage ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <ChevronUp />
                          )}
                          {historyQuery.isFetchingNextPage
                            ? t('loadingEarlier')
                            : t('loadEarlier')}
                        </Button>
                      </div>
                    )}

                    <AuiIf condition={(s) => s.thread.isEmpty}>
                      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Bot className="size-5" aria-hidden="true" />
                        </div>
                        <h3 className="text-base font-semibold text-foreground">
                          {t('emptyTitle')}
                        </h3>
                        <p className="mt-1 max-w-[36ch] text-sm/relaxed text-muted-foreground">
                          {t('emptyDescription')}
                        </p>
                      </div>
                    </AuiIf>

                    <ThreadPrimitive.Messages>
                      {({ message }) => {
                        const rawTime =
                          historyMessageTimeMap.get(message.id) ??
                          message.createdAt
                        const formattedTime = formatMessageTime(rawTime)
                        if (message.role === 'user') {
                          return (
                            <MessagePrimitive.Root className="flex flex-col items-end pt-3 first:pt-0">
                              <span className="mb-1 px-1 text-[10px] font-medium text-muted-foreground">
                                {t('me')}
                              </span>
                              <div className="max-w-[84%] bg-primary px-3 py-2.5 text-primary-foreground text-sm/relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                                <MessagePrimitive.Parts
                                  components={{ Text: StreamdownText }}
                                />
                              </div>
                              {formattedTime && (
                                <span className="mt-1 px-1 text-xs text-muted-foreground/80 font-mono">
                                  {formattedTime}
                                </span>
                              )}
                            </MessagePrimitive.Root>
                          )
                        }
                        return (
                          <MessagePrimitive.Root className="flex flex-col items-start pt-3 first:pt-0">
                            <span className="flex gap-2 mb-1 px-1 text-xs font-medium text-muted-foreground items-center">
                              <Bot className="size-4" />
                              {t('assistant')}
                              <AuiIf
                                condition={(state) =>
                                  state.message.status?.type === 'running'
                                }
                              >
                                <DotMatrix state="loading" />
                              </AuiIf>
                            </span>

                            <MessagePrimitive.Parts>
                              {({ part }) => {
                                if (part.type === 'text') {
                                  return (
                                    <div className="max-w-[92%] border bg-background px-3 py-2.5 text-foreground text-sm/relaxed gap-y-2">
                                      <StreamdownText />
                                    </div>
                                  )
                                }
                                if (part.type === 'tool-call') {
                                  const result = part.result as
                                    | {
                                        actionId?: string
                                        expiresAt?: string
                                        reason?: string
                                      }
                                    | undefined
                                  const isError = result?.reason
                                  return (
                                    <div className="flex items-center gap-2 py-0.5 text-muted-foreground">
                                      {part.status.type === 'running' && (
                                        <Loader2 className="size-3 animate-spin" />
                                      )}
                                      <span className="font-medium">
                                        {part.toolName}
                                      </span>
                                      {isError ? (
                                        <span className="text-destructive">
                                          {result.reason}
                                        </span>
                                      ) : part.result ? (
                                        <span>done</span>
                                      ) : (
                                        <span>running...</span>
                                      )}
                                    </div>
                                  )
                                }
                                return null
                              }}
                            </MessagePrimitive.Parts>
                            {formattedTime && (
                              <span className="mt-1 px-1 text-[10px] text-muted-foreground/80 font-mono">
                                {formattedTime}
                              </span>
                            )}
                          </MessagePrimitive.Root>
                        )
                      }}
                    </ThreadPrimitive.Messages>
                  </ThreadPrimitive.Viewport>
                </ThreadPrimitive.Root>
              </div>

              <div className="shrink-0 border-t bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
                <ComposerPrimitive.Root className="flex flex-col gap-2">
                  <div className="flex items-end gap-2">
                    <ComposerPrimitive.Input
                      placeholder={t('messagePlaceholder')}
                      className="max-h-36 min-h-11 flex-1 resize-none bg-background px-3 py-3 text-sm placeholder:text-muted-foreground md:text-sm border rounded-md focus:outline-none"
                      rows={1}
                    />
                    <AuiIf condition={(s) => s.thread.isRunning}>
                      <ComposerPrimitive.Cancel asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-11 shrink-0"
                          aria-label={t('responding')}
                        >
                          <Square className="size-4" />
                        </Button>
                      </ComposerPrimitive.Cancel>
                    </AuiIf>
                    <AuiIf condition={(s) => !s.thread.isRunning}>
                      <ComposerPrimitive.Send asChild>
                        <Button
                          type="submit"
                          size="icon"
                          className="size-11 shrink-0"
                          aria-label={t('send')}
                        >
                          <Send className="size-4" />
                        </Button>
                      </ComposerPrimitive.Send>
                    </AuiIf>
                  </div>
                </ComposerPrimitive.Root>
                <p className="hidden text-xs text-muted-foreground sm:block mt-2">
                  {t('keyboardHint')}
                </p>
              </div>
            </AssistantRuntimeWrapper>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
