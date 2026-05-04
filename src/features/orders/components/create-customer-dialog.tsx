'use client'

import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { FormRoot, useAppForm } from '#/components/app/form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { useCreateCustomer } from '#/features/customers/hooks'

type CreateCustomerDialogProps = {
  onSelect: (customerId: string) => void
  trigger: React.ReactNode
}

export function CreateCustomerDialog({
  onSelect,
  trigger,
}: CreateCustomerDialogProps) {
  const t = useTranslations('orders')
  const ct = useTranslations('common')
  const [open, setOpen] = useState(false)
  const createCustomer = useCreateCustomer()

  const form = useAppForm({
    defaultValues: { name: '', phone: '' },
    onSubmit: async ({ value }) => {
      try {
        const result = await createCustomer.mutateAsync({
          name: value.name,
          phone: value.phone || undefined,
        })
        if ('id' in result) {
          onSelect(result.id)
          setOpen(false)
          form.reset()
        }
      } catch {
        // handled by sonner toast from mutation error handler
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createCustomer')}</DialogTitle>
        </DialogHeader>
        <FormRoot form={form}>
          <div className="space-y-4">
            <form.AppField name="name">
              {(field) => (
                <field.TextField
                  label={ct('name')}
                  placeholder={t('customerNamePlaceholder')}
                />
              )}
            </form.AppField>
            <form.AppField name="phone">
              {(field) => (
                <field.PhoneField
                  label={ct('phone')}
                  placeholder={t('customerPhonePlaceholder')}
                />
              )}
            </form.AppField>
            <form.AppForm>
              <form.SubmitButton>{t('createCustomer')}</form.SubmitButton>
            </form.AppForm>
          </div>
        </FormRoot>
      </DialogContent>
    </Dialog>
  )
}
