import { useRouter } from '@tanstack/react-router'
import { Minus, Plus } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useMemo, useState } from 'react'
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
import { StatusBadge } from '#/components/status-badge'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
})

import {
  useCreateInvoice,
  useOrderForInvoice,
  usePaymentMethods,
} from '#/features/invoices/hooks'

export function CreateInvoicePage() {
  const t = useTranslations('invoices')
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
  const [selectedPercentage, setSelectedPercentage] = useState<
    'full' | 'remaining' | 'custom'
  >('full')

  const effectivePercentage =
    selectedPercentage === 'remaining'
      ? (orderData?.remainingPercentage ?? 100)
      : selectedPercentage === 'custom'
        ? customPercentage
        : 100

  const invoicesTotal = orderData
    ? Math.round(((orderData.order.total * effectivePercentage) / 100) * 100) /
      100
    : 0

  const defaultLineItems = orderData
    ? orderData.lineItems.map((item) => ({
        description: item.name ?? 'Order item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    : [{ description: '', quantity: 1, unitPrice: 0 }]

  const form = useAppForm({
    defaultValues: {
      customerId: orderData?.order.customerId ?? '',
      customerName: orderData?.order.customerName ?? '',
      dueDate: '',
      paymentMethodId: '',
      notes: '',
      lineItems: defaultLineItems,
    },
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
        toast.error(result.error ?? 'Failed')
      }
    },
  })

  const fmt = (n: number) => currencyFormatter.format(n)

  return (
    <PageContent>
      <PageHeader title={t('createInvoice')} />

      {orderData && (
        <>
          {/* Order Summary Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Order #{orderData.order.orderNumber ?? '—'}
                <StatusBadge status={orderData.order.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('customer')}
                  </p>
                  <p className="font-medium">
                    {orderData.order.customerName ?? '—'}
                  </p>
                  {orderData.order.customerPhone && (
                    <p className="text-sm text-muted-foreground">
                      {orderData.order.customerPhone}
                    </p>
                  )}
                  {orderData.order.customerEmail && (
                    <p className="text-sm text-muted-foreground">
                      {orderData.order.customerEmail}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('total')}</p>
                  <p className="text-2xl font-bold">
                    {fmt(orderData.order.total)}
                  </p>
                </div>
              </div>

              {/* Already Invoiced Progress */}
              {orderData.existingInvoices.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Already invoiced: {orderData.invoicedPercentage}% (
                    {fmt(orderData.invoicedAmount)})
                  </p>
                  <div className="flex gap-4 text-sm">
                    {orderData.existingInvoices.map((inv) => (
                      <Badge key={inv.id} variant="secondary">
                        {inv.invoiceNumber}: {inv.percentage}% ({fmt(inv.total)}
                        )
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Percentage Selector */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Invoice amount
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={
                      selectedPercentage === 'full' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setSelectedPercentage('full')}
                  >
                    Full (100%)
                  </Button>
                  <Button
                    variant={
                      selectedPercentage === 'remaining' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setSelectedPercentage('remaining')}
                    disabled={orderData.remainingPercentage <= 0}
                  >
                    Remaining ({orderData.remainingPercentage}%)
                  </Button>
                  <Button
                    variant={
                      selectedPercentage === 'custom' ? 'default' : 'outline'
                    }
                    size="sm"
                    onClick={() => setSelectedPercentage('custom')}
                  >
                    Custom
                  </Button>
                  {selectedPercentage === 'custom' && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setCustomPercentage((p) => Math.max(1, p - 10))
                        }
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-16 text-center font-medium">
                        {customPercentage}%
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setCustomPercentage((p) => Math.min(100, p + 10))
                        }
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="mt-2 font-semibold">
                  Invoice total: {fmt(invoicesTotal)}
                  {selectedPercentage === 'remaining' && (
                    <span className="text-sm text-muted-foreground font-normal ml-2">
                      (remaining from {fmt(orderData.order.total)})
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Order Line Items (read-only) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t('lineItems')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('description')}</TableHead>
                    <TableHead className="text-right">{t('qty')}</TableHead>
                    <TableHead className="text-right">{t('rate')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderData.lineItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <FormRoot form={form}>
        {orderData ? (
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
        ) : (
          <>
            {/* Standalone mode: full form */}
            <FormSection title={t('customer')}>
              <FormGrid columns={2}>
                <form.AppField name="customerId">
                  {(field) => <field.TextField label={t('customer')} />}
                </form.AppField>
                <form.AppField name="customerName">
                  {(field) => (
                    <field.TextField label={`${t('customer')} Name`} />
                  )}
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
                {(itemsField) => (
                  <div className="space-y-2">
                    {itemsField.state.value.map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable order for form array
                      <div key={i} className="flex items-end gap-2">
                        <div className="flex-1">
                          <form.AppField name={`lineItems[${i}].description`}>
                            {(field) => (
                              <field.TextField label={t('description')} />
                            )}
                          </form.AppField>
                        </div>
                        <div className="w-20">
                          <form.AppField name={`lineItems[${i}].quantity`}>
                            {(field) => <field.NumberField label={t('qty')} />}
                          </form.AppField>
                        </div>
                        <div className="w-24">
                          <form.AppField name={`lineItems[${i}].unitPrice`}>
                            {(field) => (
                              <field.NumberField label={t('total')} />
                            )}
                          </form.AppField>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => itemsField.removeValue(i)}
                        >
                          <Minus className="size-4" />
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
                      <Plus className="mr-2 size-4" />
                      {t('addItem')}
                    </Button>
                  </div>
                )}
              </form.AppField>
            </FormSection>
          </>
        )}

        <FormActions>
          <form.AppForm>
            <form.SubmitButton>
              {orderData
                ? `${t('createInvoice')} — ${fmt(invoicesTotal)}`
                : t('createInvoice')}
            </form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </PageContent>
  )
}
