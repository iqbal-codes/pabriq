import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'use-intl'
import {
  createR2UploaderAdapter,
  getAcceptedMimeTypes,
  getMaxBytes,
  PhotoGridUpload,
} from '#/components/app/asset-upload'
import {
  FormActions,
  FormGrid,
  FormRoot,
  FormSection,
  useAppForm,
} from '#/components/app/form'
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
import type { UploadItem } from '#/features/assets/upload-machine'
import type { Customer, CustomerInput } from '#/features/customers/model'
import { getCustomerFn, updateCustomerFn } from '#/features/customers/server'

export const Route = createFileRoute('/_org/customers/$id/edit')({
  beforeLoad: () => ({
    breadcrumb: 'editCustomer',
    pageTitle: 'editCustomer',
  }),
  loader: async ({ params }) => {
    return await getCustomerFn({ data: { id: params.id } })
  },
  component: EditCustomer,
})

function EditCustomer() {
  const navigate = useNavigate()
  const customer = Route.useLoaderData() as Customer | null
  const t = useTranslations('customers')
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [_uploadedPhotoAssetId, setUploadedPhotoAssetId] = useState<
    string | null
  >(null)

  const photoAdapter = useMemo(
    () =>
      createR2UploaderAdapter({
        ownerType: 'customer',
        usage: 'profile',
      }),
    [],
  )

  const form = useAppForm({
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      notes: customer?.notes ?? '',
      active: customer?.active ?? true,
      photoAssetId: customer?.photoAssetId ?? null,
    } satisfies CustomerInput,
    onSubmit: async ({ value }) => {
      const result = await updateCustomerFn({
        data: { ...value, id: customer?.id ?? '' },
      })
      if (result.ok) {
        toast.success(t('customerUpdated'))
        navigate({ to: '/customers' })
      } else {
        const msg =
          result.error === 'nameRequired' ? t('nameRequired') : result.error
        toast.error(msg)
      }
    },
  })

  if (!customer) {
    return (
      <PageContent>
        <p>{t('noCustomers')}</p>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <PageHeader
        title={t('editCustomer')}
        primaryAction={{
          label: t('save'),
          onClick: () => form.handleSubmit(),
        }}
      />
      <FormRoot form={form}>
        <FormSection title={t('editCustomer')}>
          <FormGrid>
            <form.AppField name="name">
              {(field) => <field.TextField label={t('name')} />}
            </form.AppField>
            <form.AppField name="email">
              {(field) => <field.EmailField label={t('email')} />}
            </form.AppField>
            <form.AppField name="phone">
              {(field) => <field.PhoneField label={t('phone')} />}
            </form.AppField>
            <form.AppField name="notes">
              {(field) => <field.TextareaField label={t('notes')} />}
            </form.AppField>
            <div className="col-span-full">
              <p className="text-sm font-medium">{t('photo')}</p>
              <div className="mt-1">
                <PhotoGridUpload
                  items={uploadItems}
                  onItemsChange={(items) => setUploadItems(items)}
                  config={{
                    ownerType: 'customer',
                    usage: 'profile',
                    maxFiles: 1,
                  }}
                  adapter={photoAdapter}
                  acceptedMimeTypes={getAcceptedMimeTypes('profile')}
                  maxBytes={getMaxBytes('profile')}
                  onUploadComplete={(assetId) =>
                    setUploadedPhotoAssetId(assetId)
                  }
                />
              </div>
            </div>
          </FormGrid>
        </FormSection>
        <FormActions>
          <form.AppForm>
            <form.SubmitButton>{t('save')}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </PageContent>
  )
}
