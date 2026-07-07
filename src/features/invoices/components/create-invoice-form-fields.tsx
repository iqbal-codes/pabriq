import { Minus, Plus } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { FormGrid, FormSection, withForm } from '#/components/app/form'
import { Button } from '#/components/ui/button'
import type { OrderForInvoice } from '#/features/invoices/model'
import { defaultCreateInvoiceValues } from './create-invoice-form-types'

type PaymentMethodOption = { value: string; label: string }

export const CreateInvoiceFormFields = withForm({
  defaultValues: defaultCreateInvoiceValues(null),
  props: {} as {
    orderData: OrderForInvoice | null
    paymentMethodOptions: PaymentMethodOption[]
  },
  render: function Render({ form, orderData, paymentMethodOptions }) {
    const t = useTranslations('invoices')

    if (orderData) {
      return (
        <FormSection title="">
          <FormGrid columns={2}>
            <form.AppField name="dueDate">
              {(field) => (
                <field.TextField
                  label={t('dueDate')}
                  placeholder="YYYY-MM-DD"
                />
              )}
            </form.AppField>
            <form.AppField name="paymentMethodId">
              {(field) => (
                <field.SelectField
                  label={t('paymentMethod')}
                  options={paymentMethodOptions}
                  placeholder={t('paymentMethod')}
                />
              )}
            </form.AppField>
            <form.AppField name="notes">
              {(field) => <field.TextareaField label={t('notes')} />}
            </form.AppField>
          </FormGrid>
        </FormSection>
      )
    }

    return (
      <>
        {/* Standalone mode: full form */}
        <FormSection title={t('customer')}>
          <FormGrid columns={2}>
            <form.AppField name="customerId">
              {(field) => <field.TextField label={t('customer')} />}
            </form.AppField>
            <form.AppField name="customerName">
              {(field) => <field.TextField label={t('customerName')} />}
            </form.AppField>
            <form.AppField name="dueDate">
              {(field) => (
                <field.TextField
                  label={t('dueDate')}
                  placeholder="YYYY-MM-DD"
                />
              )}
            </form.AppField>
            <form.AppField name="paymentMethodId">
              {(field) => (
                <field.SelectField
                  label={t('paymentMethod')}
                  options={paymentMethodOptions}
                  placeholder={t('paymentMethod')}
                />
              )}
            </form.AppField>
            <form.AppField name="notes">
              {(field) => <field.TextareaField label={t('notes')} />}
            </form.AppField>
          </FormGrid>
        </FormSection>

        <FormSection title={t('lineItems')}>
          <form.AppField name="lineItems" mode="array">
            {(itemsField) => {
              const lineItemKeyCounts = new Map<string, number>()

              return (
                <div className="space-y-2">
                  {itemsField.state.value.map((item, index) => {
                    const baseKey = [
                      item.description,
                      item.quantity,
                      item.unitPrice,
                    ].join(':')
                    const occurrence = lineItemKeyCounts.get(baseKey) ?? 0
                    lineItemKeyCounts.set(baseKey, occurrence + 1)
                    const lineItemKey = `${baseKey}:${occurrence}`

                    return (
                      <div key={lineItemKey} className="flex items-end gap-2">
                        <div className="flex-1">
                          <form.AppField
                            name={`lineItems[${index}].description`}
                          >
                            {(field) => (
                              <field.TextField label={t('description')} />
                            )}
                          </form.AppField>
                        </div>
                        <div className="w-20">
                          <form.AppField name={`lineItems[${index}].quantity`}>
                            {(field) => <field.NumberField label={t('qty')} />}
                          </form.AppField>
                        </div>
                        <div className="w-24">
                          <form.AppField name={`lineItems[${index}].unitPrice`}>
                            {(field) => (
                              <field.NumberField label={t('total')} />
                            )}
                          </form.AppField>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => itemsField.removeValue(index)}
                        >
                          <Minus className="size-4" />
                        </Button>
                      </div>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() =>
                      itemsField.pushValue({
                        description: '',
                        quantity: 1,
                        unitPrice: 0,
                      })
                    }
                  >
                    <Plus className="mr-2 size-4" />
                    {t('addItem')}
                  </Button>
                </div>
              )
            }}
          </form.AppField>
        </FormSection>
      </>
    )
  },
})
