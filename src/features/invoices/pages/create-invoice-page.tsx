import { useRouter } from '@tanstack/react-router'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  FormActions,
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Button } from '#/components/ui/button'
import { useCreateInvoice } from '#/features/invoices/hooks'

export function CreateInvoicePage() {
  const t = useTranslations('invoices')
  const router = useRouter()
  const createInvoice = useCreateInvoice()

  const form = useAppForm({
    defaultValues: {
      customerId: '',
      customerName: '',
      dueDate: '',
      paymentMethodId: '',
      notes: '',
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
    onSubmit: async ({ value }) => {
      const result = await createInvoice.mutateAsync({
        customerId: value.customerId,
        customerName: value.customerName,
        dueDate: value.dueDate,
        paymentMethodId: value.paymentMethodId,
        notes: value.notes || undefined,
        lineItems: value.lineItems.map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
        })),
      })
      if (result.ok) {
        toast.success(t('title'))
        router.navigate({ to: '/invoices' })
      } else {
        toast.error(result.error ?? 'Failed')
      }
    },
  })

  return (
    <PageContent>
      <PageHeader title={t('createInvoice')} />
      <FormRoot form={form}>
        <FormSection title={t('customer')}>
          <FormGrid columns={2}>
            <form.AppField name="customerId">
              {(field) => <field.TextField label={t('customer')} />}
            </form.AppField>
            <form.AppField name="customerName">
              {(field) => <field.TextField label={`${t('customer')} Name`} />}
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
              {(field) => <field.TextField label={t('paymentMethod')} />}
            </form.AppField>
            <form.AppField name="notes">
              {(field) => <field.TextareaField label={t('notes')} />}
            </form.AppField>
          </FormGrid>
        </FormSection>

        <FormSection title={t('lineItems')}>
          <form.AppField name="lineItems" mode="array">
            {(itemsField) => (
              <div className="space-y-2">
                {itemsField.state.value.map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable order for form array
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1">
                      <form.AppField name={`lineItems[${i}].description`}>
                        {(field) => <field.TextField label="Description" />}
                      </form.AppField>
                    </div>
                    <div className="w-20">
                      <form.AppField name={`lineItems[${i}].quantity`}>
                        {(field) => <field.NumberField label="Qty" />}
                      </form.AppField>
                    </div>
                    <div className="w-24">
                      <form.AppField name={`lineItems[${i}].unitPrice`}>
                        {(field) => <field.NumberField label={t('total')} />}
                      </form.AppField>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => itemsField.removeValue(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            )}
          </form.AppField>
        </FormSection>

        <FormActions>
          <form.AppForm>
            <form.SubmitButton>{t('createInvoice')}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </PageContent>
  )
}
