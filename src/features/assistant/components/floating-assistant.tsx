import { Bot, Loader2, Send } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useAppForm } from '#/components/app/form/form-context'
import { Button } from '#/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet'
import { OrderDraftProposalCard } from '#/features/assistant/components/order-draft-proposal-card'
import {
  type AssistantChatMessage,
  useAssistantChatHistory,
  useSendAssistantMessage,
} from '#/features/assistant/hooks'

type FloatingAssistantProps = {
  orgId: string
  userId: string
}

export function FloatingAssistant({ orgId, userId }: FloatingAssistantProps) {
  const t = useTranslations('assistant')
  const [open, setOpen] = useState(false)
  const [localMessages, setLocalMessages] = useState<AssistantChatMessage[]>([])
  const transcriptRef = useRef<HTMLDivElement>(null)

  const scope = { orgId, userId }
  const historyQuery = useAssistantChatHistory(scope)
  const sendMessage = useSendAssistantMessage(scope)

  // Derive history messages from query — no effect needed
  const historyMessages = useMemo(
    () => (historyQuery.data?.ok === true ? historyQuery.data.messages : []),
    [historyQuery.data],
  )

  // Combined: history + locally-added messages (deduplicated by id)
  const messages = useMemo(() => {
    const seen = new Set(historyMessages.map((m) => m.id))
    return [...historyMessages, ...localMessages.filter((m) => !seen.has(m.id))]
  }, [historyMessages, localMessages])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll trigger on new messages
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages])

  const form = useAppForm({
    defaultValues: { message: '' },
    onSubmit: async ({ value }) => {
      const text = value.message.trim()
      if (!text) return

      const userMessage: AssistantChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      }
      setLocalMessages((prev) => [...prev, userMessage])
      form.reset()

      const result = await sendMessage.mutateAsync(text)
      if (result.ok) {
        setLocalMessages((prev) => [...prev, result.message])
      } else {
        const errorText =
          result.error === 'AI assistant is not configured'
            ? t('notConfigured')
            : t('genericError')
        setLocalMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: errorText,
            createdAt: new Date().toISOString(),
          },
        ])
      }
    },
  })

  return (
    <>
      <Button
        className="fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6 rounded-full h-12 w-12 shadow-lg"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t('trigger')}
      >
        <Bot className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col p-0">
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle>{t('title')}</SheetTitle>
            <SheetDescription>{t('description')}</SheetDescription>
          </SheetHeader>

          <div
            ref={transcriptRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('loadingHistory')}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-2 px-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-sm">{t('emptyTitle')}</p>
                <p className="text-muted-foreground text-xs">
                  {t('emptyDescription')}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <span className="text-[10px] font-medium opacity-70 block mb-0.5">
                      {msg.role === 'user' ? t('you') : t('assistant')}
                    </span>
                    {msg.content}
                  </div>
                  {msg.role === 'assistant' &&
                    msg.metadata?.kind === 'order_draft_proposal' && (
                      <div className="max-w-[85%] ml-2">
                        <OrderDraftProposalCard
                          metadata={msg.metadata}
                          scope={scope}
                        />
                      </div>
                    )}
                  {msg.role === 'assistant' &&
                    msg.metadata?.kind === 'order_draft_cancelled' && (
                      <div className="max-w-[85%] ml-2 text-xs italic text-muted-foreground px-1 py-0.5">
                        {t('proposal.cancelled')}
                      </div>
                    )}
                  {msg.role === 'assistant' &&
                    msg.metadata?.kind === 'order_draft_error' && (
                      <div className="max-w-[85%] ml-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        {msg.metadata.reason}
                        <span className="block mt-1 text-muted-foreground">
                          {t('error.tryAgain')}
                        </span>
                      </div>
                    )}
                </div>
              ))
            )}
          </div>

          <div className="border-t px-4 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              className="flex gap-2 items-start"
            >
              <div className="flex-1">
                <form.AppField name="message">
                  {(field) => (
                    <field.TextareaField
                      placeholder={t('messagePlaceholder')}
                    />
                  )}
                </form.AppField>
              </div>
              <Button
                type="submit"
                size="icon"
                disabled={sendMessage.isPending}
                className="shrink-0 self-end"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
