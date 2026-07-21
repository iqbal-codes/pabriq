import { useStore } from '@tanstack/react-form'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, Bot, ChevronUp, Loader2, Send, Square } from 'lucide-react'
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form/form-context'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { Textarea } from '#/components/ui/textarea'
import AssistantMessageContent from '#/features/assistant/components/assistant-message-content'
import AssistantToolCallBubble from '#/features/assistant/components/assistant-tool-call-bubble'
import { OrderDraftProposalCard } from '#/features/assistant/components/order-draft-proposal-card'
import {
  type AssistantChatMessage,
  type AssistantChatScope,
  type AssistantStreamCallbacks,
  type AssistantStreamToolCall,
  type AssistantStreamTurn,
  useAssistantChatHistory,
  useStreamAssistantMessage,
} from '#/features/assistant/hooks'
import { queryKeys } from '#/lib/query-keys'

type FloatingAssistantProps = {
  orgId: string
  userId: string
}

type StreamTurnEntry = {
  turn: AssistantStreamTurn
  bubbleId: string
}

type StreamTurnMap = Record<string, StreamTurnEntry>

const NEAR_BOTTOM_THRESHOLD = 96
const GROUP_GAP_MS = 5 * 60 * 1000

function getDateKey(value: string): string {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function isNearBottom(element: HTMLDivElement): boolean {
  return (
    element.scrollHeight - element.scrollTop - element.clientHeight <
    NEAR_BOTTOM_THRESHOLD
  )
}

export function FloatingAssistant({ orgId, userId }: FloatingAssistantProps) {
  const t = useTranslations('assistant')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [streamTurns, setStreamTurns] = useState<StreamTurnMap>({})
  const [completedTurns, setCompletedTurns] = useState<AssistantChatMessage[]>(
    [],
  )
  const [isAtBottom, setIsAtBottom] = useState(true)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const previousMessageCountRef = useRef(0)
  const previousScrollHeightRef = useRef<number | null>(null)

  const scope = useMemo<AssistantChatScope>(
    () => ({ orgId, userId }),
    [orgId, userId],
  )
  const historyQuery = useAssistantChatHistory(scope)
  const {
    stream: streamMessage,
    cancel: cancelStream,
    isStreaming,
  } = useStreamAssistantMessage(scope)

  const historyMessages = useMemo(
    () =>
      historyQuery.data?.pages
        .slice()
        .reverse()
        .flatMap((page) => (page.ok ? page.messages : [])) ?? [],
    [historyQuery.data],
  )

  const historyError = historyQuery.data?.pages.find((page) => !page.ok)

  const messages = useMemo<AssistantChatMessage[]>(() => {
    const seenIds = new Set<string>()
    const seenClientIds = new Set<string>()

    for (const m of historyMessages) {
      seenIds.add(m.id)
      if (m.clientMessageId) seenClientIds.add(m.clientMessageId)
    }

    // The optimistic user bubble is delivered via onUserMessage ->
    // completedTurns (with real content). We deliberately do NOT push a
    // second empty user bubble from the live stream entry: the empty one
    // would flicker before the first text-delta arrives.
    const liveEntries: AssistantChatMessage[] = []
    for (const entry of Object.values(streamTurns)) {
      const { turn, bubbleId } = entry
      if (seenIds.has(bubbleId)) continue
      liveEntries.push({
        id: bubbleId,
        role: 'assistant',
        content: turn.text,
        createdAt: new Date().toISOString(),
        clientMessageId: turn.clientMessageId,
        metadata: turn.metadata ?? undefined,
        toolCalls: turn.toolCalls,
      })
    }

    // completedTurns holds the local copy of the just-finished turn until
    // the history refetch lands. After refetch, history's persisted copy
    // has a different id, so we also dedup by (role, content) within a
    // 5-minute window to prevent the post-stream duplicate.
    const dedupWindowMs = 5 * 60 * 1000
    const now = Date.now()
    const streamedCompletions: AssistantChatMessage[] = []
    for (const m of completedTurns) {
      if (seenIds.has(m.id)) continue
      if (m.clientMessageId && seenClientIds.has(m.clientMessageId)) continue
      const mTime = new Date(m.createdAt).getTime()
      const matchedByContent = historyMessages.some((h) => {
        if (h.role !== m.role) return false
        if (h.content !== m.content) return false
        if (!Number.isFinite(mTime)) return true
        return Math.abs(new Date(h.createdAt).getTime() - mTime) < dedupWindowMs
      })
      if (matchedByContent) continue
      if (Number.isFinite(mTime) && now - mTime > dedupWindowMs) continue
      streamedCompletions.push(m)
    }

    return [...historyMessages, ...streamedCompletions, ...liveEntries]
  }, [historyMessages, streamTurns, completedTurns])
  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    [locale],
  )
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    [locale],
  )

  function scrollToLatest(behavior: ScrollBehavior = 'smooth') {
    const transcript = transcriptRef.current
    if (!transcript) return
    transcript.scrollTo({ top: transcript.scrollHeight, behavior })
    setIsAtBottom(true)
  }

  useEffect(() => {
    if (!open) return
    const transcript = transcriptRef.current
    if (!transcript) return

    if (previousScrollHeightRef.current !== null) {
      transcript.scrollTop +=
        transcript.scrollHeight - previousScrollHeightRef.current
      previousScrollHeightRef.current = null
    } else if (previousMessageCountRef.current === 0 || isAtBottom) {
      transcript.scrollTop = transcript.scrollHeight
      setIsAtBottom(true)
    }
    previousMessageCountRef.current = messages.length
  }, [isAtBottom, messages, open])

  useEffect(() => {
    if (open) window.requestAnimationFrame(() => composerRef.current?.focus())
  }, [open])

  const registerUserMessage = useCallback(
    (userMessage: AssistantChatMessage) => {
      setCompletedTurns((previous) => {
        const cid = userMessage.clientMessageId
        if (!cid) return [...previous, userMessage]
        if (previous.some((m) => m.clientMessageId === cid)) return previous
        return [...previous, userMessage]
      })
    },
    [],
  )

  const updateStreamTurn = useCallback((turn: AssistantStreamTurn) => {
    setStreamTurns((previous) => {
      const existing = previous[turn.clientMessageId]
      if (existing) {
        return {
          ...previous,
          [turn.clientMessageId]: { ...existing, turn },
        }
      }
      return {
        ...previous,
        [turn.clientMessageId]: {
          turn,
          bubbleId: turn.assistantId,
        },
      }
    })
  }, [])

  const handleStreamComplete = useCallback(
    (assistantMessage: AssistantChatMessage) => {
      const cid = assistantMessage.clientMessageId
      // Clear the live turn (if any) but DO NOT drop earlier completed
      // entries that share the same clientMessageId — the optimistic
      // user message is one of those, and dropping it here would erase
      // the user bubble until the history refetch lands.
      if (cid) {
        setStreamTurns((previous) => {
          if (!previous[cid]) return previous
          const next = { ...previous }
          delete next[cid]
          return next
        })
      }
      setCompletedTurns((previous) => [...previous, assistantMessage])
    },
    [],
  )

  const queryClient = useQueryClient()
  const form = useAppForm({
    defaultValues: { message: '' },
    onSubmit: async ({ value }) => {
      const text = value.message.trim()
      if (!text || isStreaming) return

      const clientMessageId = crypto.randomUUID()
      const callbacks: AssistantStreamCallbacks = {
        onUserMessage: registerUserMessage,
        onAssistantTurn: updateStreamTurn,
        onComplete: (assistantMessage) => {
          handleStreamComplete(assistantMessage)
          // Clear the composer only when the stream ends naturally. We
          // deliberately do not clear on cancel so the user can retry or
          // tweak their message.
          form.reset({ message: '' })
        },
        onError: (_assistantId, errorMessage) => {
          // Leave the composer populated so the user can adjust and retry.
          // The server may not have persisted the user turn on hard errors.
          console.error('assistant stream failed', errorMessage)
        },
      }
      await streamMessage(text, clientMessageId, callbacks)
      queryClient.invalidateQueries({
        queryKey: queryKeys.assistant.chat(scope),
      })
    },
  })
  const composerValue = useStore(form.store, (state) => state.values.message)

  function submitMessage(event?: FormEvent) {
    event?.preventDefault()
    void form.handleSubmit()
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      submitMessage()
    }
  }

  async function loadEarlierMessages() {
    const transcript = transcriptRef.current
    if (transcript) previousScrollHeightRef.current = transcript.scrollHeight
    await historyQuery.fetchNextPage()
  }

  function formatDateLabel(value: string): string {
    const date = new Date(value)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (getDateKey(value) === getDateKey(today.toISOString())) return t('today')
    if (getDateKey(value) === getDateKey(yesterday.toISOString()))
      return t('yesterday')
    return dateFormatter.format(date)
  }

  const activeLiveTurns = useMemo(() => {
    return Object.values(streamTurns).map((entry) => ({
      bubbleId: entry.bubbleId,
      turn: entry.turn,
    }))
  }, [streamTurns])

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
          className="flex w-full! max-w-none! flex-col p-0 sm:w-[30rem]! sm:max-w-[calc(100vw-2rem)]!"
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

          <div className="relative min-h-0 flex-1 bg-muted/30">
            <div
              ref={transcriptRef}
              role="log"
              aria-label={t('title')}
              aria-live="polite"
              className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
              onScroll={(event) =>
                setIsAtBottom(isNearBottom(event.currentTarget))
              }
            >
              {historyQuery.isLoading ? (
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
              ) : historyQuery.isError || historyError ? (
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
              ) : messages.length === 0 ? (
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
                  <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
                    {[
                      t('starterOrderDraft'),
                      t('starterPendingWork'),
                      t('starterPriorities'),
                    ].map((prompt) => (
                      <Button
                        key={prompt}
                        type="button"
                        variant="outline"
                        className="h-auto min-h-11 justify-start whitespace-normal px-3 py-2 text-left"
                        onClick={() => {
                          form.setFieldValue('message', prompt)
                          window.requestAnimationFrame(() =>
                            composerRef.current?.focus(),
                          )
                        }}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {historyQuery.hasNextPage && (
                    <div className="mb-4 flex justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={historyQuery.isFetchingNextPage}
                        onClick={() => void loadEarlierMessages()}
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
                  <ol className="space-y-1">
                    {messages.map((message, index) => {
                      const previous = messages[index - 1]
                      const isNewDay =
                        !previous ||
                        getDateKey(previous.createdAt) !==
                          getDateKey(message.createdAt)
                      const isGroupStart =
                        !previous ||
                        previous.role !== message.role ||
                        new Date(message.createdAt).getTime() -
                          new Date(previous.createdAt).getTime() >
                          GROUP_GAP_MS ||
                        isNewDay
                      const sender =
                        message.role === 'user' ? t('you') : t('assistant')

                      const liveTurn =
                        message.role === 'assistant'
                          ? activeLiveTurns.find(
                              (entry) => entry.bubbleId === message.id,
                            )
                          : undefined
                      // While streaming, tool-calls come from the live turn.
                      // After the stream ends, the hook copies them onto the
                      // completedTurns entry as `message.toolCalls` so the
                      // trail survives the live turn being cleared.
                      const displayToolCalls: AssistantStreamToolCall[] =
                        liveTurn?.turn.toolCalls ?? message.toolCalls ?? []
                      const isStreamingThisBubble =
                        liveTurn?.turn.status === 'streaming'

                      return (
                        <li
                          key={message.id}
                          className={isGroupStart ? 'pt-3 first:pt-0' : ''}
                        >
                          {isNewDay && (
                            <div className="my-4 flex items-center gap-3">
                              <span className="h-px flex-1 bg-border" />
                              <time
                                dateTime={message.createdAt}
                                className="text-xs font-medium text-muted-foreground"
                              >
                                {formatDateLabel(message.createdAt)}
                              </time>
                              <span className="h-px flex-1 bg-border" />
                            </div>
                          )}
                          <div
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`min-w-0 ${message.role === 'user' ? 'max-w-[84%]' : 'w-full max-w-[92%]'}`}
                            >
                              {isGroupStart && (
                                <p
                                  className={`mb-1 text-xs font-medium text-muted-foreground ${message.role === 'user' ? 'text-right' : ''}`}
                                >
                                  {sender}
                                </p>
                              )}
                              {message.role === 'user' && (
                                <div className="bg-primary px-3 py-2.5 text-primary-foreground">
                                  <p className="whitespace-pre-wrap text-sm/relaxed [overflow-wrap:anywhere]">
                                    {message.content}
                                  </p>
                                  <time
                                    dateTime={message.createdAt}
                                    className="mt-1.5 block text-right text-xs tabular-nums text-primary-foreground/75"
                                  >
                                    {timeFormatter.format(
                                      new Date(message.createdAt),
                                    )}
                                  </time>
                                </div>
                              )}
                              {message.role === 'assistant' && (
                                <div className="space-y-2">
                                  {displayToolCalls.map((call) => (
                                    <AssistantToolCallBubble
                                      key={call.toolCallId}
                                      call={call}
                                    />
                                  ))}
                                  {message.content.length > 0 && (
                                    <div
                                      data-streaming={
                                        isStreamingThisBubble ? 'true' : 'false'
                                      }
                                      className="border bg-background px-3 py-2.5 text-foreground"
                                    >
                                      <AssistantMessageContent
                                        content={message.content}
                                      />
                                      <time
                                        dateTime={message.createdAt}
                                        className="mt-1.5 block text-right text-xs tabular-nums text-muted-foreground"
                                      >
                                        {timeFormatter.format(
                                          new Date(message.createdAt),
                                        )}
                                        {isStreamingThisBubble && (
                                          <span
                                            aria-hidden="true"
                                            className="ml-2 inline-block size-1.5 translate-y-[-1px] animate-pulse rounded-full bg-primary motion-reduce:hidden"
                                          />
                                        )}
                                      </time>
                                    </div>
                                  )}
                                  {message.metadata?.kind ===
                                    'order_draft_proposal' && (
                                    <div>
                                      <OrderDraftProposalCard
                                        metadata={message.metadata}
                                        scope={scope}
                                      />
                                    </div>
                                  )}
                                  {message.metadata?.kind ===
                                    'order_draft_cancelled' && (
                                    <p className="border bg-muted px-3 py-2 text-xs text-muted-foreground">
                                      {t('proposal.cancelled')}
                                    </p>
                                  )}
                                  {message.metadata?.kind ===
                                    'order_draft_error' && (
                                    <div
                                      role="alert"
                                      className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                                    >
                                      <p className="[overflow-wrap:anywhere]">
                                        {message.metadata.reason}
                                      </p>
                                      <p className="mt-1 text-muted-foreground">
                                        {t('error.tryAgain')}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                    {isStreaming && activeLiveTurns.length === 0 && (
                      <li className="pt-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          {t('assistant')}
                        </p>
                        <div
                          role="status"
                          className="inline-flex items-center gap-2 border bg-background px-3 py-2.5 text-sm text-foreground"
                        >
                          <span
                            className="flex gap-1 motion-reduce:hidden"
                            aria-hidden="true"
                          >
                            {[0, 1, 2].map((dot) => (
                              <span
                                key={dot}
                                className="size-1.5 animate-pulse rounded-full bg-primary"
                                style={{ animationDelay: `${dot * 160}ms` }}
                              />
                            ))}
                          </span>
                          <span>{t('responding')}</span>
                        </div>
                      </li>
                    )}
                  </ol>
                </div>
              )}
            </div>

            {!isAtBottom && messages.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="absolute right-4 bottom-3 bg-background shadow-sm"
                onClick={() => scrollToLatest()}
              >
                <ArrowDown />
                {t('jumpToLatest')}
              </Button>
            )}
          </div>

          <div className="shrink-0 border-t bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
            <form.AppForm>
              <form onSubmit={submitMessage} className="space-y-2">
                <form.AppField name="message">
                  {(field) => (
                    <>
                      <label htmlFor={field.name} className="sr-only">
                        {t('messageLabel')}
                      </label>
                      <div className="flex items-end gap-2">
                        <Textarea
                          ref={composerRef}
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          onBlur={field.handleBlur}
                          onKeyDown={handleComposerKeyDown}
                          rows={1}
                          maxLength={2000}
                          aria-label={t('messageLabel')}
                          placeholder={t('messagePlaceholder')}
                          className="max-h-36 min-h-11 resize-none bg-background px-3 py-3 text-sm placeholder:text-muted-foreground md:text-sm"
                        />
                        {isStreaming ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-11 shrink-0"
                            onClick={() => cancelStream()}
                            aria-label={t('responding')}
                          >
                            <Square className="size-4" />
                          </Button>
                        ) : (
                          <Button
                            type="submit"
                            size="icon"
                            className="size-11 shrink-0"
                            disabled={!composerValue.trim()}
                            aria-label={t('send')}
                          >
                            <Send />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </form.AppField>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  {t('keyboardHint')}
                </p>
              </form>
            </form.AppForm>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export type { AssistantChatScope } from '#/features/assistant/hooks'
