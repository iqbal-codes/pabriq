import { useRouter } from '@tanstack/react-router'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useMemo, useState } from 'react'
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
  const orderTotal = orderData?.order.total ?? 0
  const orderDataId = orderData?.order.id ?? null

  const { data: paymentMethods } = usePaymentMethods()
  const paymentMethodOptions = useMemo(
    () =>
      (paymentMethods ?? []).map((pm) => ({
        value: pm.id,
        label: pm.name,
      })),
    [paymentMethods],
  )

  const [customAmount, setCustomAmount] = useState<number>(0)
  const [selectedPercentage, setSelectedPercentage] =
    useState<InvoicePercentageMode | null>(null)
  const selectedMode =
    selectedPercentage ??
    ((orderData?.invoicedPercentage ?? 0) > 0 ? 'remaining' : 'custom')

  const effectivePercentage =
    selectedMode === 'remaining'
      ? (orderData?.remainingPercentage ?? 100)
      : orderTotal > 0
        ? Math.round((customAmount / orderTotal) * 10_000) / 100
        : 0

  const invoicesTotal = orderData
    ? selectedMode === 'remaining'
      ? orderData.remainingAmount
      : customAmount
    : 0

  useEffect(() => {
    if (orderDataId) {
      setCustomAmount(orderTotal)
    }
  }, [orderDataId, orderTotal])

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
          customAmount={customAmount}
          invoiceTotal={invoicesTotal}
          onSelectedPercentageChange={setSelectedPercentage}
          onCustomAmountChange={setCustomAmount}
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
            <form.SubmitButton
              isPending={createInvoice.isPending}
              disabled={Boolean(orderData && invoicesTotal <= 0)}
            >
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
