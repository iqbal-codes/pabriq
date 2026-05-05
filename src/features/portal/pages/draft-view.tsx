import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import { FormGrid, FormRoot, useAppForm } from '#/components/app/form'
import {
  useConfirmPortalOrder,
  useSavePortalAddress,
  useUpdatePortalLineItem,
} from '../hooks'
import type { PortalOrder } from '../model'

function CustomerInfoCard({ order }: { order: PortalOrder }) {
  const t = useTranslations('portal')

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="mb-4 text-sm font-medium text-card-foreground">
        {t('customerInfo')}
      </h2>
      <p className="text-sm text-card-foreground">
        {order.customerName ?? t('guestCustomer')}
      </p>
      {order.customerPhone && (
        <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
      )}
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

      for (const li of value.lineItems) {
        const orig = order.lineItems.find((o) => o.id === li.id)
        if (!orig) continue
        const nameChanged = li.name !== (orig.name ?? '')
        const notesChanged = li.notes !== (orig.notes ?? '')
        if (nameChanged || notesChanged) {
          await updateLineItem.mutateAsync({
            itemId: li.id,
            name: li.name || undefined,
            notes: li.notes || undefined,
          })
        }
      }

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
      <div className="min-h-screen bg-muted py-4">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="mb-6 text-xl font-semibold text-foreground">
            {t('title')}
          </h1>

          <div className="space-y-6">
            {hasCustomer ? (
              <CustomerInfoCard order={order} />
            ) : (
              <div className="rounded-lg border border-border bg-card p-4">
                <h2 className="mb-4 text-sm font-medium text-card-foreground">
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
                </FormGrid>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 text-sm font-medium text-card-foreground">
                {t('shippingAddress')}
              </h2>
              <form.AppField name="address">
                {(field) => (
                  <field.AddressField showAreaSearch={showAreaSearch} />
                )}
              </form.AppField>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 text-sm font-medium text-card-foreground">
                {t('lineItems')}
              </h2>
              <div className="space-y-4">
                {order.lineItems.map((item, i) => (
                  <div
                    key={item.id}
                    className="space-y-3 border-b border-border pb-4 last:border-0"
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {item.name || item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('quantity')}: {item.quantity} ×{' '}
                          {new Intl.NumberFormat('en-ID', {
                            style: 'currency',
                            currency: 'IDR',
                          }).format(item.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-card-foreground">
                        {new Intl.NumberFormat('en-ID', {
                          style: 'currency',
                          currency: 'IDR',
                        }).format(item.total)}
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
                    {new Intl.NumberFormat('en-ID', {
                      style: 'currency',
                      currency: 'IDR',
                    }).format(order.total)}
                  </p>
                </div>
              </div>
            </div>
            <form.AppForm>
              <form.SubmitButton className="w-full">
                {isSubmitting ? t('submitting') : t('submit')}
              </form.SubmitButton>
            </form.AppForm>
          </div>
        </div>
      </div>
    </FormRoot>
  )
}
