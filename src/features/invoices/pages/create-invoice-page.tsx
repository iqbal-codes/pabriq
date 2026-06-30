import { useRouter } from '@tanstack/react-router'
import { parseAsString, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'use-intl'
import { FormActions, FormRoot, useAppForm } from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { CreateInvoiceFormFields } from '#/features/invoices/components/create-invoice-form-fields'
import {
  defaultCreateInvoiceValues,
  type InvoicePercentageMode,
} from '#/features/invoices/components/create-invoice-form-types'
import { OrderForInvoiceSummaryCard } from '#/features/invoices/components/order-for-invoice-summary-card'
import {
  useCreateInvoice,
  useOrderForInvoice,
  usePaymentMethods,
} from '#/features/invoices/hooks'
import { formatCurrency } from '#/lib/formatters'

export function CreateInvoicePage() {
  const t = useTranslations('invoices')
  const locale = useLocale()
  const router = useRouter()
  const createInvoice = useCreateInvoice()

  const [orderId] = useQueryState('orderId', parseAsString)
  const orderIdValue = orderId ?? ''
  const orderForInvoice = useOrderForInvoice(orderIdValue)
  const orderData =
    orderIdValue && orderForInvoice.data ? orderForInvoice.data : null

  const { data: paymentMethods } = usePaymentMethods()
  const paymentMethodOptions = useMemo(
    () =>
      (paymentMethods ?? []).map((pm) => ({
        value: pm.id,
        label: pm.name,
      })),
    [paymentMethods],
  )

  const [customPercentage, setCustomPercentage] = useState<number>(100)
  const [selectedPercentage, setSelectedPercentage] =
    useState<InvoicePercentageMode | null>(null)
  const selectedMode =
    selectedPercentage ??
    ((orderData?.invoicedPercentage ?? 0) > 0 ? 'remaining' : 'full')

  const effectivePercentage =
    selectedMode === 'remaining'
      ? (orderData?.remainingPercentage ?? 100)
      : selectedMode === 'custom'
        ? customPercentage
        : 100

  const invoicesTotal = orderData
    ? selectedMode === 'remaining'
      ? orderData.remainingAmount
      : Math.round(
          ((orderData.order.total * effectivePercentage) / 100) * 100,
        ) / 100
    : 0

  const form = useAppForm({
    defaultValues: defaultCreateInvoiceValues(orderData),
    onSubmit: async ({ value }) => {
      const result = await createInvoice.mutateAsync({
        orderId: orderId ?? undefined,
        percentage: orderId ? effectivePercentage : undefined,
        customerId: value.customerId,
        customerName: value.customerName,
        dueDate: value.dueDate,
        paymentMethodId: value.paymentMethodId,
        notes: value.notes || undefined,
        lineItems: orderId
          ? []
          : value.lineItems.map((li) => ({
              description: li.description,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
            })),
      })
      if (result.ok) {
        toast.success(t('title'))
        router.navigate({ to: '/invoices' })
      } else {
        toast.error(result.error ?? t('failed'))
      }
    },
  })

  return (
    <PageContent>
      <PageHeader title={t('createInvoice')} />

      {orderData && (
        <OrderForInvoiceSummaryCard
          orderData={orderData}
          selectedPercentage={selectedMode}
          customPercentage={customPercentage}
          invoiceTotal={invoicesTotal}
          onSelectedPercentageChange={setSelectedPercentage}
          onCustomPercentageChange={setCustomPercentage}
        />
      )}

      <FormRoot form={form}>
        <CreateInvoiceFormFields
          form={form}
          orderData={orderData}
          paymentMethodOptions={paymentMethodOptions}
        />

        <FormActions>
          <form.AppForm>
            <form.SubmitButton>
              {orderData
                ? `${t('createInvoice')} — ${formatCurrency(invoicesTotal, locale)}`
                : t('createInvoice')}
            </form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </PageContent>
  )
}
