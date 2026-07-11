import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import type { DataTableLabels } from '#/components/app/data-table'
import { DataTable } from '#/components/app/data-table'
import { FormGrid, FormRoot, useAppForm } from '#/components/app/form'
import { PageHeader } from '#/components/app/page-shell/page-header'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import {
  PaymentMethodRowActions,
  usePaymentMethodColumns,
} from '#/features/invoices/components/payment-method-columns'
import { PaymentMethodDeleteDialog } from '#/features/invoices/components/payment-method-delete-dialog'
import {
  useDeletePaymentMethod,
  usePaymentMethods,
} from '#/features/invoices/hooks'
import type { PaymentMethod } from '#/features/invoices/model'
import { useOrgSettings, useUpdateOrgSettings } from '#/features/settings/hooks'
import { useGlobalModal } from '#/hooks/use-global-overlay'

function MidtransForm() {
  const t = useTranslations('settings')
  const { data: settings } = useOrgSettings()
  const updateOrgSettings = useUpdateOrgSettings()

  const form = useAppForm({
    defaultValues: {
      midtransServerKey: settings?.midtransServerKey ?? '',
      midtransClientKey: settings?.midtransClientKey ?? '',
      midtransIsProduction: settings?.midtransIsProduction ?? false,
    },
    onSubmit: async ({ value }) => {
      const result = await updateOrgSettings.mutateAsync({
        midtransServerKey: value.midtransServerKey.trim() || null,
        midtransClientKey: value.midtransClientKey.trim() || null,
        midtransIsProduction: value.midtransIsProduction,
      })
      if (result.ok) {
        toast.success(t('saved'))
      } else {
        toast.error(t('saveFailed'))
      }
    },
  })

  return (
    <FormRoot form={form}>
      <FormGrid columns={1}>
        <form.AppField name="midtransServerKey">
          {(field) => <field.PasswordField label={t('midtransServerKey')} />}
        </form.AppField>

        <form.AppField name="midtransClientKey">
          {(field) => <field.TextField label={t('midtransClientKey')} />}
        </form.AppField>

        <form.AppField name="midtransIsProduction">
          {(field) => (
            <div className="flex items-center justify-between">
              <Label>{t('midtransProduction')}</Label>
              <Switch
                checked={field.state.value}
                onCheckedChange={(v) => field.handleChange(v)}
              />
            </div>
          )}
        </form.AppField>

        <div className="border-t pt-4">
          <Label>{t('midtransWebhookUrl')}</Label>
          <div className="mt-1 flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/midtrans-notification`}
              className="bg-muted"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/api/midtrans-notification`,
                )
                toast.success(t('midtransWebhookCopied'))
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </FormGrid>

      <div className="mt-4 flex justify-end gap-2">
        <form.AppForm>
          <form.SubmitButton>{t('save')}</form.SubmitButton>
        </form.AppForm>
      </div>
    </FormRoot>
  )
}

export function PaymentMethodsPage() {
  const t = useTranslations('settings')
  const dt = useTranslations('dataTable')
  const { openModal } = useGlobalModal()

  const { data: methods, isLoading } = usePaymentMethods()
  const deletePaymentMethod = useDeletePaymentMethod()
  const { isLoading: settingsLoading } = useOrgSettings()

  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null)

  const columns = usePaymentMethodColumns()

  const labels: DataTableLabels = {
    clearFilters: dt('clearFilters'),
    columnVisibility: dt('columnVisibility'),
    errorRetry: dt('errorRetry'),
    errorTitle: dt('errorTitle'),
    firstPage: dt('firstPage'),
    lastPage: dt('lastPage'),
    loading: dt('loading'),
    nextPage: dt('nextPage'),
    of: dt('of'),
    page: dt('page'),
    perPage: dt('perPage'),
    previousPage: dt('previousPage'),
    resetColumns: dt('resetColumns'),
    rowsSelected: (selected: number, total: number) =>
      dt('rowsSelected', { selected, total }),
    visibleRows: (from: number, to: number, total: number) =>
      dt('visibleRows', { from, to, total }),
  }

  const methodList = methods ?? []

  return (
    <>
      <PageHeader
        title={t('paymentMethods')}
        primaryAction={{
          label: t('addPaymentMethod'),
          onClick: () => openModal('payment-method-form'),
        }}
      />

      <DataTable
        columns={columns}
        data={methodList}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        labels={labels}
        onPageChange={() => {}}
        onPerPageChange={() => {}}
        page={1}
        perPage={methodList.length || 1}
        tableId="payment-methods"
        totalRows={methodList.length}
        emptyTitle={t('noPaymentMethods')}
        emptyDescription={t('noPaymentMethodsDesc')}
        noResultsTitle={t('noPaymentMethods')}
        hasActiveFilters={false}
        rowActions={(method: PaymentMethod) => (
          <PaymentMethodRowActions
            onEdit={() => openModal('payment-method-form', method.id)}
            onDelete={() => setDeleteTarget(method)}
          />
        )}
      />

      <PaymentMethodDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        isDeleting={deletePaymentMethod.isPending}
        onConfirm={async () => {
          if (!deleteTarget) return
          const result = await deletePaymentMethod.mutateAsync(deleteTarget.id)
          if (result.ok) {
            setDeleteTarget(null)
          } else {
            toast.error(result.error ?? t('deletePaymentMethod'))
          }
        }}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('midtransIntegration')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('midtransIntegrationDescription')}
          </p>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <p className="text-sm text-muted-foreground">{dt('loading')}</p>
          ) : (
            <MidtransForm />
          )}
        </CardContent>
      </Card>
    </>
  )
}
