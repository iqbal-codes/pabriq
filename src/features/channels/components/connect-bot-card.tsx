import { AlertCircle, Check, MessageSquare, RefreshCw } from 'lucide-react'
import React from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { z } from 'zod'
import {
  FormActions,
  FormGrid,
  FormRoot,
  useAppForm,
} from '#/components/app/form'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Skeleton } from '#/components/ui/skeleton'
import {
  useConnectedChannel,
  useConnectTelegramChannel,
} from '#/features/channels/hooks'

export type ConnectedChannelData = {
  id?: string
  status?: 'connected' | 'disconnected' | string | null
  telegramBotUsername?: string | null
  telegramBotName?: string | null
  telegramBotId?: string | number | null
  connectionVersion?: number
  connectedAt?: Date | string | null
} | null

interface ConnectBotCardProps {
  onDisconnectClick: (botName: string) => void
}

export function ConnectBotCard({ onDisconnectClick }: ConnectBotCardProps) {
  const t = useTranslations('channels')

  const botTokenSchema = React.useMemo(
    () =>
      z.object({
        botToken: z.string().trim().min(1, t('telegram.tokenRequired')),
      }),
    [t],
  )

  const {
    data: connectedChannel,
    isLoading,
    isError,
    error,
    refetch,
  } = useConnectedChannel()

  const connectMutation = useConnectTelegramChannel()
  const channel = (connectedChannel as ConnectedChannelData) ?? null
  const isConnected = channel?.status === 'connected'
  const botName = channel?.telegramBotUsername
    ? `@${channel.telegramBotUsername}`
    : channel?.telegramBotName || t('telegram.defaultBotName')

  const connectForm = useAppForm({
    defaultValues: {
      botToken: '',
    },
    validators: {
      onSubmit: botTokenSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      try {
        const res = await connectMutation.mutateAsync({
          botToken: value.botToken.trim(),
        })
        formApi.reset()
        if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
          toast.error(
            (res as { error?: string }).error || t('error.loadFailed'),
          )
        } else {
          toast.success(
            isConnected ? t('toast.replaced') : t('toast.connected'),
          )
        }
      } catch (err: unknown) {
        formApi.reset()
        const msg = err instanceof Error ? err.message : t('error.loadFailed')
        toast.error(msg)
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MessageSquare className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {t('telegram.title')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isConnected
                  ? t('telegram.connectedAs', { bot: botName })
                  : t('telegram.connectDescription')}
              </p>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : isConnected ? (
            <Badge variant="success" className="px-2.5 py-0.5">
              <Check className="mr-1 size-3" />
              {t('telegram.active')}
            </Badge>
          ) : (
            <Badge variant="secondary" className="px-2.5 py-0.5">
              {t('telegram.inactive')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError ? (
          <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>
                {error instanceof Error ? error.message : t('error.loadFailed')}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => refetch()}
            >
              <RefreshCw className="mr-1 size-3" />
              {t('actions.cancel')}
            </Button>
          </div>
        ) : null}

        {isConnected && channel?.telegramBotId ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3 text-xs">
            <span className="font-mono text-muted-foreground">
              {t('telegram.botId', { id: String(channel.telegramBotId) })}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDisconnectClick(botName)}
            >
              {t('actions.disconnect')}
            </Button>
          </div>
        ) : null}

        <FormRoot form={connectForm}>
          <FormGrid columns={1}>
            <connectForm.AppField name="botToken">
              {(field) => (
                <field.PasswordField
                  label={
                    isConnected
                      ? t('telegram.replaceToken')
                      : t('telegram.token')
                  }
                  placeholder={t('telegram.botTokenPlaceholder')}
                  autoComplete="off"
                />
              )}
            </connectForm.AppField>
          </FormGrid>
          <p className="text-xs text-muted-foreground">
            {t('telegram.verificationNote')}
          </p>
          <FormActions align="stacked">
            <connectForm.AppForm>
              <connectForm.SubmitButton disabled={connectMutation.isPending}>
                {connectMutation.isPending
                  ? t('actions.verifying')
                  : isConnected
                    ? t('actions.verifyReplace')
                    : t('actions.verifyConnect')}
              </connectForm.SubmitButton>
            </connectForm.AppForm>
          </FormActions>
        </FormRoot>
      </CardContent>
    </Card>
  )
}
