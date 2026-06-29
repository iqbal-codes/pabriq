import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { CustomerInfoCard } from '#/features/portal/components/customer-info-card'
import { PortalHeader } from '#/features/portal/components/portal-header'
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

  return (
    <FormRoot form={form}>
      <div className="min-h-screen bg-muted">
        <PortalHeader
          orgLogoAssetId={order.orgLogoAssetId}
          title={t('title')}
        />
        <div className="mx-auto max-w-2xl p-4">
          <div className="space-y-6">
            {hasCustomer ? (
              <CustomerInfoCard
                name={order.customerName}
                phone={order.customerPhone}
                photoAssetId={order.customerPhotoAssetId}
              />
            ) : (
              <FormSection title={t('customerInfo')}>
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

            <FormSection title={t('shippingAddress')}>
              <form.AppField name="address">
                {(field) => (
                  <field.AddressField showAreaSearch={showAreaSearch} />
                )}
              </form.AppField>
            </FormSection>

            <FormSection title={t('lineItems')}>
              <div className="space-y-4">
                {order.lineItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="space-y-3 border-b border-border pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {item.name || item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('quantity')}: {item.quantity} ×{' '}
                          {formatCurrency(item.unitPrice, locale)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-card-foreground">
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
              <div className="mt-4 flex justify-end border-t border-border pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('orderTotal')}
                  </p>
                  <p className="text-lg font-semibold text-card-foreground">
                    {formatCurrency(order.total, locale)}
                  </p>
                </div>
              </div>
            </FormSection>
            <FormActions align="stretch">
              <form.SubmitButton className="w-full">
                {isSubmitting ? t('submitting') : t('submit')}
              </form.SubmitButton>
            </FormActions>
          </div>
        </div>
      </div>
    </FormRoot>
  )
}
