import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
import {
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { CustomerInfoCard } from '#/features/portal/components/customer-info-card'
import { formatCurrency } from '#/lib/formatters'
import { cn } from '#/lib/utils'
import { PortalContactButton } from '../components/portal-contact-button'
import {
  useConfirmPortalOrder,
  useSavePortalAddress,
  useUpdatePortalLineItem,
} from '../hooks'
import type { PortalOrder } from '../model'

type DraftStep = {
  id: 'customer' | 'shipping' | 'items'
  titleKey: 'draftStepCustomer' | 'draftStepShipping' | 'draftStepItems'
  descriptionKey:
    | 'draftStepCustomerDesc'
    | 'draftStepShippingDesc'
    | 'draftStepItemsDesc'
}

const DRAFT_STEPS: DraftStep[] = [
  {
    id: 'customer',
    titleKey: 'draftStepCustomer',
    descriptionKey: 'draftStepCustomerDesc',
  },
  {
    id: 'shipping',
    titleKey: 'draftStepShipping',
    descriptionKey: 'draftStepShippingDesc',
  },
  {
    id: 'items',
    titleKey: 'draftStepItems',
    descriptionKey: 'draftStepItemsDesc',
  },
]

function StepHeader({
  index,
  total,
  state,
  title,
  description,
}: {
  index: number
  total: number
  state: 'done' | 'active' | 'empty'
  title: string
  description: string
}) {
  const t = useTranslations('portal')
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
          state === 'active' &&
            'bg-primary text-primary-foreground ring-4 ring-primary/15',
          state === 'done' && 'bg-primary text-primary-foreground',
          state === 'empty' && 'border border-border text-muted-foreground',
        )}
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <Badge
            variant={state === 'active' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {state === 'done'
              ? t('draftStepComplete')
              : state === 'active'
                ? t('draftStepInProgress')
                : t('draftStepEmpty')}
          </Badge>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/70 tabular-nums">
          {index + 1} / {total}
        </p>
      </div>
    </div>
  )
}

export function DraftView({
  order,
  token,
}: {
  order: PortalOrder
  token: string
}) {
  const t = useTranslations('portal')
  const locale = useLocale()
  const confirmOrder = useConfirmPortalOrder()
  const saveAddress = useSavePortalAddress()
  const updateLineItem = useUpdatePortalLineItem()

  const hasCustomer = !!order.customerId
  const showAreaSearch = order.customerIsWni ?? true

  const form = useAppForm({
    defaultValues: {
      guestName: order.customerName ?? '',
      guestPhone: order.customerPhone ?? '',
      address: {
        areaId: order.shippingAddress?.areaId ?? '',
        areaName: order.shippingAddress?.areaName ?? '',
        streetAddress: order.shippingAddress?.streetAddress ?? '',
      },
      lineItems: order.lineItems.map((item) => ({
        id: item.id,
        name: item.name ?? '',
        notes: item.notes ?? '',
        attachmentIds: item.assetIds,
      })),
    },
    onSubmit: async ({ value }) => {
      const addressChanged =
        value.address.areaId !== (order.shippingAddress?.areaId ?? '') ||
        value.address.areaName !== (order.shippingAddress?.areaName ?? '') ||
        value.address.streetAddress !==
          (order.shippingAddress?.streetAddress ?? '')

      if (addressChanged && value.address.streetAddress) {
        const addrResult = await saveAddress.mutateAsync({
          orderId: order.id,
          areaId: value.address.areaId,
          areaName: value.address.areaName,
          streetAddress: value.address.streetAddress,
        })
        if (!addrResult.ok) {
          toast.error(t('confirmFailed'))
          return
        }
      }

      const origItemMap = new Map(order.lineItems.map((o) => [o.id, o]))
      const lineItemUpdates = value.lineItems.reduce<
        ReturnType<typeof updateLineItem.mutateAsync>[]
      >((acc, li) => {
        const orig = origItemMap.get(li.id)
        if (!orig) return acc
        if (li.name !== (orig.name ?? '') || li.notes !== (orig.notes ?? '')) {
          acc.push(
            updateLineItem.mutateAsync({
              itemId: li.id,
              name: li.name || undefined,
              notes: li.notes || undefined,
            }),
          )
        }
        return acc
      }, [])
      await Promise.all(lineItemUpdates)

      const result = await confirmOrder.mutateAsync({
        orderId: order.id,
        guestName: hasCustomer ? undefined : value.guestName || undefined,
        guestPhone: hasCustomer ? undefined : value.guestPhone || undefined,
      })

      if (!result.ok) {
        toast.error(t('confirmFailed'))
      }
    },
  })

  const isSubmitting =
    confirmOrder.isPending || saveAddress.isPending || updateLineItem.isPending
  const hasAddress = !!order.shippingAddress?.streetAddress
  const itemsHaveContent = order.lineItems.length > 0

  return (
    <FormRoot form={form}>
      <div className="space-y-6">
        {/* Checklist header */}
        <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('draftStepsTitle')}
          </p>
          <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('draftSubmitHelp', { org: order.orgName })}
          </p>
          {/* Mini-stepper */}
          <div className="mt-6 space-y-2">
            <ol
              aria-label={t('draftStepsTitle')}
              className="flex items-center gap-2"
            >
              {DRAFT_STEPS.map((step) => {
                const isDone =
                  (step.id === 'customer' && hasCustomer) ||
                  (step.id === 'shipping' && hasAddress) ||
                  (step.id === 'items' && itemsHaveContent)
                return (
                  <li key={step.id} className="flex-1">
                    <span
                      className={cn(
                        'block h-1 rounded-full transition-colors',
                        isDone ? 'bg-primary' : 'bg-muted',
                      )}
                      aria-hidden
                    />
                  </li>
                )
              })}
            </ol>
            <div className="flex justify-between text-[11px] font-medium text-muted-foreground">
              {DRAFT_STEPS.map((step) => (
                <span
                  key={step.id}
                  className="first:text-left last:text-right text-center flex-1"
                >
                  {t(step.titleKey)}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* Contact and Shipping details side-by-side on desktop */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Step 1 — Customer */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <StepHeader
              index={0}
              total={DRAFT_STEPS.length}
              state={hasCustomer ? 'done' : 'active'}
              title={t(DRAFT_STEPS[0].titleKey)}
              description={t(DRAFT_STEPS[0].descriptionKey)}
            />
            <div className="mt-5">
              {hasCustomer ? (
                <CustomerInfoCard
                  name={order.customerName}
                  phone={order.customerPhone}
                  photoAssetId={order.customerPhotoAssetId}
                />
              ) : (
                <FormSection title={t('customerInfo')} titleHidden>
                  <FormGrid columns={1}>
                    <form.AppField
                      name="guestName"
                      validators={{
                        onChange: ({ value }) =>
                          value.trim() ? undefined : t('required'),
                      }}
                    >
                      {(field) => (
                        <field.TextField
                          label={t('guestName')}
                          placeholder={t('guestNamePlaceholder')}
                        />
                      )}
                    </form.AppField>
                    <form.AppField
                      name="guestPhone"
                      validators={{
                        onChange: ({ value }) =>
                          value.trim() ? undefined : t('required'),
                      }}
                    >
                      {(field) => (
                        <field.PhoneField
                          label={t('guestPhone')}
                          placeholder={t('guestPhonePlaceholder')}
                        />
                      )}
                    </form.AppField>
                  </FormGrid>
                </FormSection>
              )}
            </div>
          </section>

          {/* Step 2 — Shipping */}
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <StepHeader
              index={1}
              total={DRAFT_STEPS.length}
              state={hasAddress ? 'done' : 'active'}
              title={t(DRAFT_STEPS[1].titleKey)}
              description={t(DRAFT_STEPS[1].descriptionKey)}
            />
            <div className="mt-5">
              <FormSection title={t('shippingAddress')} titleHidden>
                <form.AppField name="address">
                  {(field) => (
                    <field.AddressField showAreaSearch={showAreaSearch} />
                  )}
                </form.AppField>
              </FormSection>
            </div>
          </section>
        </div>

        {/* Step 3 — Items */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <StepHeader
            index={2}
            total={DRAFT_STEPS.length}
            state={
              itemsHaveContent &&
              order.lineItems.every((li) => li.assetIds.length > 0)
                ? 'done'
                : 'active'
            }
            title={t(DRAFT_STEPS[2].titleKey)}
            description={t(DRAFT_STEPS[2].descriptionKey)}
          />
          <div className="mt-5 space-y-4">
            {order.lineItems.map((item, i) => (
              <div
                key={item.id}
                className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      {item.productName}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {t('quantity')}: {item.quantity} ×{' '}
                      {formatCurrency(item.unitPrice, locale)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(item.total, locale)}
                  </p>
                </div>
                <form.AppField name={`lineItems[${i}].name`}>
                  {(field) => (
                    <field.TextField
                      label={t('itemName')}
                      placeholder={t('itemNamePlaceholder')}
                    />
                  )}
                </form.AppField>
                <form.AppField name={`lineItems[${i}].notes`}>
                  {(field) => (
                    <field.TextareaField
                      label={t('itemNotes')}
                      placeholder={t('itemNotesPlaceholder')}
                    />
                  )}
                </form.AppField>
                <form.AppField name={`lineItems[${i}].attachmentIds`}>
                  {(field) => (
                    <field.PortalFileUploadField
                      label={t('attachment')}
                      token={token}
                      lineItemId={item.id}
                    />
                  )}
                </form.AppField>
              </div>
            ))}
          </div>
        </section>

        {/* Submit footer */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('orderTotal')}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(order.total, locale)}
              </p>
            </div>
            <p className="hidden text-right text-xs text-muted-foreground sm:block max-w-[240px]">
              {t('draftSubmitHelp', { org: order.orgName })}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PortalContactButton
              order={order}
              label="chatOnWhatsApp"
              className="w-full sm:w-auto"
            />
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <a href={`/order/${token}`}>{t('retry')}</a>
              </Button>
              <div className="w-full sm:w-auto">
                <form.AppForm>
                  <form.SubmitButton className="w-full sm:w-auto min-w-[140px]">
                    {isSubmitting ? t('submitting') : t('submit')}
                  </form.SubmitButton>
                </form.AppForm>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FormRoot>
  )
}
