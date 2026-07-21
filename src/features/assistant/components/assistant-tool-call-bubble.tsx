import { CheckCircle2, CircleAlert, Loader2, Wrench } from 'lucide-react'
import { useTranslations } from 'use-intl'
import type { AssistantStreamToolCall } from '#/features/assistant/hooks/use-stream-assistant-message'
import { cn } from '#/lib/utils'

type AssistantToolCallBubbleProps = {
  call: AssistantStreamToolCall
}

function resolveToolLabel(
  toolName: string,
  t: ReturnType<typeof useTranslations<'assistant'>>,
): string {
  if (toolName === 'businessSearch') return t('toolCall.search')
  if (toolName === 'businessOverview') return t('toolCall.overview')
  if (toolName === 'proposeOrderDraft') return t('toolCall.propose')
  if (toolName === 'resolveOrderDraft') return t('toolCall.resolve')
  if (toolName === 'confirmOrderDraft') return t('toolCall.confirm')
  return t('toolCall.generic', { name: toolName })
}

export default function AssistantToolCallBubble({
  call,
}: AssistantToolCallBubbleProps) {
  const t = useTranslations('assistant')
  const isRunning = call.status === 'running'
  const isError = call.status === 'error'
  const label = resolveToolLabel(call.toolName, t)

  return (
    <div
      role="status"
      aria-live="polite"
      data-status={call.status}
      className={cn(
        'flex items-start gap-2 border bg-muted/40 px-3 py-2 text-xs text-muted-foreground',
        isError && 'border-destructive/30 bg-destructive/5 text-destructive',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border bg-background',
          isRunning && 'border-primary/40 text-primary',
          !isRunning && !isError && 'border-success/40 text-success',
          isError && 'border-destructive/40 text-destructive',
        )}
        aria-hidden="true"
      >
        {isRunning ? (
          <Loader2 className="size-3 animate-spin" />
        ) : isError ? (
          <CircleAlert className="size-3" />
        ) : (
          <CheckCircle2 className="size-3" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-medium text-foreground/90 h-6">
          <Wrench className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </p>
        {!isRunning && call.summary && call.summary.length > 0 && (
          <p className="mt-0.5 break-words text-foreground/70 [overflow-wrap:anywhere]">
            {call.summary}
          </p>
        )}
      </div>
    </div>
  )
}
