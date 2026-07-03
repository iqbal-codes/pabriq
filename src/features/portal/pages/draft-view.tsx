import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { getVisibleDesignName } from '#/features/orders/line-item-display'
import { CustomerInfoCard } from '#/features/portal/components/customer-info-card'
import { formatCurrency } from '#/lib/formatters'
import {
  useConfirmPortalOrder,
  useSavePortalAddress,
  useUpdatePortalLineItem,
} from '../hooks'
import type { PortalOrder } from '../model'

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

  console.log({ order })

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
        designName: item.designName ?? '',
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
        if (
          li.designName !== (orig.designName ?? '') ||
          li.notes !== (orig.notes ?? '')
        ) {
          acc.push(
            updateLineItem.mutateAsync({
              itemId: li.id,
              designName: li.designName || undefined,
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
        </header>

        {/* Contact and Shipping details side-by-side on desktop */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground mb-2">
            {t('customerInfo')}
          </h2>
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
            <form.AppField name="address">
              {(field) => (
                <field.AddressField
                  showAreaSearch={showAreaSearch}
                  label={t('shippingAddress')}
                />
              )}
            </form.AppField>
          </FormGrid>
        </section>

        {/* Step 3 — Items */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {t('orderPillLabel')}
          </h2>
          <div className="mt-4 space-y-4">
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
                    {getVisibleDesignName(
                      item.designName,
                      item.productName,
                    ) && (
                      <p className="text-xs text-muted-foreground">
                        {t('designName')}:{' '}
                        {getVisibleDesignName(
                          item.designName,
                          item.productName,
                        )}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {t('quantity')}: {item.quantity} ×{' '}
                      {formatCurrency(item.unitPrice, locale)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(item.total, locale)}
                  </p>
                </div>
                <form.AppField name={`lineItems[${i}].designName`}>
                  {(field) => (
                    <field.TextField
                      label={t('designName')}
                      placeholder={t('designNamePlaceholder')}
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
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('orderTotal')}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                {formatCurrency(order.total, locale)}
              </p>
            </div>
            <FormActions>
              <form.AppForm>
                <form.SubmitButton
                  className="w-full sm:w-auto min-w-[140px]"
                  isPending={isSubmitting}
                >
                  {isSubmitting ? t('submitting') : t('submit')}
                </form.SubmitButton>
              </form.AppForm>
            </FormActions>
          </div>
        </div>
      </div>
    </FormRoot>
  )
}
