import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  type EnrichedPartState,
  ErrorPrimitive,
  groupPartByType,
  MessagePartPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useMessage,
} from '@assistant-ui/react'
import {
  AssistantChatTransport,
  useChatRuntime,
} from '@assistant-ui/react-ai-sdk'
import type { UIMessage } from 'ai'
import {
  ArrowDown,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Send,
  Square,
  Wrench,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { type _Translator, useTranslations } from 'use-intl'
import { DotMatrix } from '#/components/assistant-ui/dot-matrix'
import {
  StreamdownText,
  StreamingMarkdown,
} from '#/components/assistant-ui/streamdown-text'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { Skeleton } from '#/components/ui/skeleton'
import { OrderDraftProposalCard } from '#/features/assistant/components/order-draft-proposal-card'
import {
  type AssistantChatMessageMetadata,
  type AssistantChatScope,
  useAssistantChatHistory,
} from '#/features/assistant/hooks'
import { cn } from '#/lib/utils'
import type { Messages } from '#/messages'

type AssistantTranslations = _Translator<Messages, 'assistant'>
type ToolCallPart = Extract<EnrichedPartState, { type: 'tool-call' }>

const groupAssistantParts = groupPartByType({
  reasoning: ['group-chainOfThought', 'group-reasoning'],
  'tool-call': ['group-chainOfThought', 'group-tool'],
} as const)

function formatPartValue(value: unknown): string {
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2) ?? String(value)
}

function resolveToolLabel(toolName: string, t: AssistantTranslations): string {
  if (toolName === 'businessSearch') return t('toolCall.search')
  if (toolName === 'businessOverview') return t('toolCall.overview')
  if (toolName === 'proposeOrderDraft') return t('toolCall.propose')
  if (toolName === 'resolveOrderDraft') return t('toolCall.resolve')
  if (toolName === 'confirmOrderDraft') return t('toolCall.confirm')
  return t('toolCall.generic', { name: toolName })
}

function ThinkingAccordion({
  children,
  isRunning,
  t,
}: {
  children: ReactNode
  isRunning: boolean
  t: AssistantTranslations
}) {
  const [isOpen, setIsOpen] = useState(isRunning)
  const [isManuallyToggled, setIsManuallyToggled] = useState(false)

  useEffect(() => {
    if (!isManuallyToggled) setIsOpen(isRunning)
  }, [isManuallyToggled, isRunning])

  return (
    <section className="border bg-muted/30">
      <button
        type="button"
        className="flex min-h-9 w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={isOpen}
        onClick={() => {
          setIsManuallyToggled(true)
          setIsOpen((value) => !value)
        }}
      >
        {isRunning ? (
          <Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" />
        ) : (
          <CheckCircle2 className="size-3.5 text-success" />
        )}
        <span className="flex-1">
          {isRunning ? t('thinking') : t('reasoning')}
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div
          className="divide-y border-t bg-background"
          aria-live={isRunning ? 'polite' : 'off'}
          aria-busy={isRunning}
        >
          {children}
        </div>
      )}
    </section>
  )
}

function ToolCallPartView({
  part,
  t,
}: {
  part: ToolCallPart
  t: AssistantTranslations
}) {
  const isRunning = part.status.type === 'running'
  const isActionRequired = part.status.type === 'requires-action'
  const isCancelled =
    part.status.type === 'incomplete' && part.status.reason === 'cancelled'
  const isError =
    part.isError ||
    (part.status.type === 'incomplete' && part.status.reason === 'error')
  const hasArguments =
    part.argsText.trim().length > 0 && part.argsText.trim() !== '{}'
  const hasResult = part.result !== undefined

  const statusLabel = isRunning
    ? t('toolCall.running')
    : isActionRequired
      ? t('toolCall.actionRequired')
      : isError
        ? t('toolCall.failed')
        : isCancelled
          ? t('toolCall.cancelled')
          : t('toolCall.completed')

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'px-3 py-2 text-xs',
        isError && 'bg-destructive/5 text-destructive',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            'flex size-5 shrink-0 items-center justify-center rounded-full border bg-background',
            isRunning && 'border-primary/40 text-primary',
            !isRunning &&
              !isError &&
              !isCancelled &&
              'border-success/40 text-success',
            isError && 'border-destructive/40 text-destructive',
          )}
          aria-hidden="true"
        >
          {isRunning ? (
            <Loader2 className="size-3 animate-spin motion-reduce:animate-none" />
          ) : isError ? (
            <CircleAlert className="size-3" />
          ) : (
            <CheckCircle2 className="size-3" />
          )}
        </span>
        <Wrench className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
          {resolveToolLabel(part.toolName, t)}
        </span>
        <span className="shrink-0 text-muted-foreground">{statusLabel}</span>
      </div>

      {(hasArguments || hasResult || isError) && (
        <details className="mt-2 border-t pt-2">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            {t('toolCall.details')}
          </summary>
          <div className="mt-2 space-y-2">
            {hasArguments && (
              <div>
                <p className="mb-1 font-medium text-foreground">
                  {t('toolCall.arguments')}
                </p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap bg-muted/60 p-2 font-mono text-[0.6875rem] text-foreground [overflow-wrap:anywhere]">
                  {part.argsText}
                </pre>
              </div>
            )}
            {hasResult && (
              <div>
                <p className="mb-1 font-medium text-foreground">
                  {t('toolCall.result')}
                </p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap bg-muted/60 p-2 font-mono text-[0.6875rem] text-foreground [overflow-wrap:anywhere]">
                  {formatPartValue(part.result)}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

function AssistantParts({ t }: { t: AssistantTranslations }) {
  return (
    <MessagePrimitive.GroupedParts groupBy={groupAssistantParts}>
      {({ part, children }) => {
        switch (part.type) {
          case 'group-chainOfThought':
            return (
              <ThinkingAccordion
                isRunning={part.status.type === 'running'}
                t={t}
              >
                {children}
              </ThinkingAccordion>
            )
          case 'group-reasoning':
            return (
              <div className="px-3 py-2 text-xs/relaxed text-muted-foreground">
                {children}
              </div>
            )
          case 'group-tool':
            return <div className="divide-y">{children}</div>
          case 'text':
            if (!part.text && part.status.type === 'running') {
              return (
                <div className="border bg-background px-3 py-2.5">
                  <DotMatrix state="thinking" className="block" />
                </div>
              )
            }
            if (!part.text) return null
            return (
              <div className="border bg-background px-3 py-2.5 text-sm/relaxed text-foreground">
                <StreamdownText />
              </div>
            )
          case 'reasoning':
            return (
              <StreamingMarkdown
                text={part.text}
                isRunning={part.status.type === 'running'}
              />
            )
          case 'tool-call':
            return part.toolUI ?? <ToolCallPartView part={part} t={t} />
          case 'source':
            if (part.sourceType !== 'url') {
              return (
                <div className="flex items-center gap-2 border bg-background px-3 py-2 text-xs">
                  <FileText
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{part.title}</span>
                </div>
              )
            }
            return (
              <a
                href={part.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 border bg-background px-3 py-2 text-xs text-foreground hover:bg-muted"
              >
                <ExternalLink
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="truncate">{part.title ?? part.url}</span>
              </a>
            )
          case 'image':
            return (
              <MessagePartPrimitive.Image className="max-h-72 max-w-full border object-contain" />
            )
          case 'file':
            return (
              <a
                href={part.data}
                download={part.filename}
                className="flex items-center gap-2 border bg-background px-3 py-2 text-xs text-foreground hover:bg-muted"
              >
                <FileText
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                  {part.filename ?? t('attachment')}
                </span>
                <ExternalLink
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </a>
            )
          case 'data':
            if (part.name === 'om-status' || part.name?.startsWith('om-')) {
              return null
            }
            return (
              part.dataRendererUI ?? (
                <div className="border bg-background px-3 py-2 text-xs">
                  <p className="mb-1 font-medium text-foreground">
                    {part.name}
                  </p>
                  <pre className="max-h-40 overflow-auto whitespace-pre-wrap bg-muted/60 p-2 font-mono text-[0.6875rem] text-foreground [overflow-wrap:anywhere]">
                    {formatPartValue(part.data)}
                  </pre>
                </div>
              )
            )
          case 'indicator':
            return (
              <div className="border bg-background px-3 py-2.5">
                <DotMatrix state="thinking" className="block" />
              </div>
            )
          default:
            return null
        }
      }}
    </MessagePrimitive.GroupedParts>
  )
}

const messageActionClass =
  'inline-flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'

function MessageFooter({
  isUser,
  t,
}: {
  isUser: boolean
  t: AssistantTranslations
}) {
  return (
    <div
      className={cn(
        'mt-1 flex min-h-7 items-center gap-1',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      <BranchPickerPrimitive.Root
        hideWhenSingleBranch
        className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"
      >
        <BranchPickerPrimitive.Previous
          className={messageActionClass}
          aria-label={t('previousResponse')}
        >
          <ChevronLeft className="size-3.5" />
        </BranchPickerPrimitive.Previous>
        <span className="px-1 tabular-nums">
          <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
        </span>
        <BranchPickerPrimitive.Next
          className={messageActionClass}
          aria-label={t('nextResponse')}
        >
          <ChevronRight className="size-3.5" />
        </BranchPickerPrimitive.Next>
      </BranchPickerPrimitive.Root>

      <ActionBarPrimitive.Root
        hideWhenRunning
        autohide="not-last"
        autohideFloat="always"
        className="flex items-center gap-0.5 data-[floating]:opacity-0 data-[floating]:transition-opacity group-hover/message:opacity-100 focus-within:opacity-100"
      >
        <ActionBarPrimitive.Copy
          className={cn(messageActionClass, 'group/copy')}
          aria-label={t('copyMessage')}
        >
          <Copy className="size-3.5 group-data-[copied]/copy:hidden" />
          <Check className="hidden size-3.5 group-data-[copied]/copy:block" />
        </ActionBarPrimitive.Copy>
        {isUser ? (
          <ActionBarPrimitive.Edit
            className={messageActionClass}
            aria-label={t('editMessage')}
          >
            <Pencil className="size-3.5" />
          </ActionBarPrimitive.Edit>
        ) : (
          <ActionBarPrimitive.Reload
            className={messageActionClass}
            aria-label={t('regenerateResponse')}
          >
            <RefreshCw className="size-3.5" />
          </ActionBarPrimitive.Reload>
        )}
      </ActionBarPrimitive.Root>
    </div>
  )
}

function EditMessageComposer({ t }: { t: AssistantTranslations }) {
  return (
    <MessagePrimitive.Root className="flex justify-end pt-3 first:pt-0">
      <ComposerPrimitive.Root className="w-full max-w-[92%] border bg-background p-2 focus-within:ring-2 focus-within:ring-ring/40">
        <ComposerPrimitive.Input
          aria-label={t('messageLabel')}
          className="max-h-36 min-h-20 w-full resize-none bg-transparent px-2 py-1 text-sm/relaxed outline-none placeholder:text-muted-foreground"
          maxLength={2000}
        />
        <div className="mt-2 flex justify-end gap-2">
          <ComposerPrimitive.Cancel
            type="button"
            className="inline-flex h-8 items-center gap-1.5 border px-3 text-xs font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" />
            {t('cancel')}
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
          >
            <Save className="size-3.5" />
            {t('save')}
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  )
}

function MessageItem({
  scope,
  t,
}: {
  scope: AssistantChatScope
  t: AssistantTranslations
}) {
  const message = useMessage()
  const isUser = message.role === 'user'
  const rawMetadata = message.metadata as Record<string, unknown> | undefined
  const metadata = (rawMetadata?.custom ?? rawMetadata) as
    | AssistantChatMessageMetadata
    | undefined

  if (isUser) {
    return (
      <MessagePrimitive.Root className="group/message flex flex-col items-end pt-3 first:pt-0">
        <span className="mb-1 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
          {t('me')}
        </span>
        <div className="max-w-[84%] space-y-2 bg-primary px-3 py-2.5 text-sm/relaxed text-primary-foreground [overflow-wrap:anywhere]">
          <MessagePrimitive.Parts>
            {({ part }) => {
              if (part.type === 'text') {
                return <span className="whitespace-pre-wrap">{part.text}</span>
              }
              if (part.type === 'image') {
                return (
                  <MessagePartPrimitive.Image className="max-h-72 max-w-full object-contain" />
                )
              }
              if (part.type === 'file') {
                return (
                  <span className="flex items-center gap-2">
                    <FileText className="size-3.5" aria-hidden="true" />
                    {part.filename ?? t('attachment')}
                  </span>
                )
              }
              return null
            }}
          </MessagePrimitive.Parts>
        </div>
        <MessageFooter isUser t={t} />
      </MessagePrimitive.Root>
    )
  }

  return (
    <MessagePrimitive.Root className="group/message flex flex-col items-start pt-3 first:pt-0">
      <span className="mb-1 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
        <Bot className="size-4" />
        {t('assistant')}
      </span>

      <div className="w-full max-w-[92%] space-y-2">
        <AssistantParts t={t} />

        {metadata?.kind === 'order_draft_proposal' && (
          <OrderDraftProposalCard metadata={metadata} scope={scope} />
        )}
        {metadata?.kind === 'order_draft_cancelled' && (
          <p className="border bg-muted px-3 py-2 text-xs text-muted-foreground">
            {t('proposal.cancelled')}
          </p>
        )}
        {metadata?.kind === 'order_draft_error' && (
          <div
            role="alert"
            className="border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            <p className="[overflow-wrap:anywhere]">{metadata.reason}</p>
            <p className="mt-1 text-muted-foreground">{t('error.tryAgain')}</p>
          </div>
        )}

        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="flex items-start gap-2 border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <CircleAlert
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>

      <MessageFooter isUser={false} t={t} />
    </MessagePrimitive.Root>
  )
}

type ChatContentProps = {
  scope: AssistantChatScope
  hasEarlierMessages: boolean
  isLoadingEarlierMessages: boolean
  onLoadEarlier: () => void
  t: AssistantTranslations
}

function ChatContent({
  scope,
  hasEarlierMessages,
  isLoadingEarlierMessages,
  onLoadEarlier,
  t,
}: ChatContentProps) {
  return (
    <ThreadPrimitive.Root className="flex h-full min-h-0 flex-1 flex-col bg-muted/30">
      <ThreadPrimitive.Viewport className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-4 pb-0 sm:px-4">
        {hasEarlierMessages && (
          <div className="mb-4 flex justify-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isLoadingEarlierMessages}
              onClick={onLoadEarlier}
            >
              {isLoadingEarlierMessages ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <ChevronUp />
              )}
              {isLoadingEarlierMessages
                ? t('loadingEarlier')
                : t('loadEarlier')}
            </Button>
          </div>
        )}

        <AuiIf condition={(state) => state.thread.isEmpty}>
          <div className="flex min-h-[24rem] flex-col items-center justify-center px-4 text-center">
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
              <ThreadPrimitive.Suggestions>
                {() => (
                  <SuggestionPrimitive.Trigger className="min-h-10 border bg-background px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <SuggestionPrimitive.Title />
                  </SuggestionPrimitive.Trigger>
                )}
              </ThreadPrimitive.Suggestions>
            </div>
          </div>
        </AuiIf>

        <ThreadPrimitive.Messages>
          {({ message }) =>
            message.composer.isEditing ? (
              <EditMessageComposer key={message.id} t={t} />
            ) : (
              <MessageItem key={message.id} scope={scope} t={t} />
            )
          }
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 z-10 -mx-3 border-t bg-background px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:-mx-4 sm:px-4">
          <ThreadPrimitive.ScrollToBottom
            type="button"
            className="absolute -top-11 right-3 inline-flex h-8 items-center gap-1.5 border bg-background px-2.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:hidden sm:right-4"
            aria-label={t('jumpToLatest')}
          >
            <ArrowDown className="size-3.5" />
            <span className="hidden sm:inline">{t('jumpToLatest')}</span>
          </ThreadPrimitive.ScrollToBottom>

          <ComposerPrimitive.Root
            compact
            className="group/composer flex flex-col border bg-background focus-within:ring-2 focus-within:ring-ring/40 data-[compact]:flex-row data-[compact]:items-end"
          >
            <ComposerPrimitive.Input
              aria-label={t('messageLabel')}
              placeholder={t('messagePlaceholder')}
              className="max-h-36 min-h-11 w-full flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground md:text-sm"
              rows={1}
              maxLength={2000}
              submitMode="enter"
            />
            <div className="flex shrink-0 items-center justify-end gap-1.5 p-1.5 pt-0 group-data-[compact]/composer:pt-1.5">
              <AuiIf condition={(state) => state.thread.isRunning}>
                <ComposerPrimitive.Cancel
                  type="button"
                  className="inline-flex size-8 items-center justify-center border border-input bg-background text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t('responding')}
                >
                  <Square className="size-3.5" />
                </ComposerPrimitive.Cancel>
              </AuiIf>
              <AuiIf condition={(state) => !state.thread.isRunning}>
                <ComposerPrimitive.Send
                  type="submit"
                  className="inline-flex size-8 items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                  aria-label={t('send')}
                >
                  <Send className="size-3.5" />
                </ComposerPrimitive.Send>
              </AuiIf>
            </div>
          </ComposerPrimitive.Root>
          <p className="mt-2 hidden text-xs text-muted-foreground sm:block">
            {t('keyboardHint')}
          </p>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
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

  const uiMessages = useMemo<UIMessage[]>(() => {
    return historyMessages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      parts: [{ type: 'text', text: msg.content }],
      createdAt: msg.createdAt ? new Date(msg.createdAt) : undefined,
      metadata: msg.metadata ? { custom: msg.metadata } : undefined,
    }))
  }, [historyMessages])

  const transport = useMemo(
    () => new AssistantChatTransport({ api: '/api/assistant/chat' }),
    [],
  )

  const suggestions = useMemo(
    () =>
      [
        { prompt: t('starterOrderDraft') },
        { prompt: t('starterPendingWork') },
        { prompt: t('starterPriorities') },
      ] as const,
    [t],
  )

  const runtime = useChatRuntime({
    transport,
    messages: uiMessages,
    suggestions,
  })

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
            <AssistantRuntimeProvider runtime={runtime}>
              <ChatContent
                scope={scope}
                hasEarlierMessages={historyQuery.hasNextPage}
                isLoadingEarlierMessages={historyQuery.isFetchingNextPage}
                onLoadEarlier={() => void historyQuery.fetchNextPage()}
                t={t}
              />
            </AssistantRuntimeProvider>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
