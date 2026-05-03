import { createFileRoute } from '@tanstack/react-router'
import { EditCustomerPage } from '#/features/customers/pages/edit-customer-page'
import { getCustomerFn } from '#/features/customers/server'

export const Route = createFileRoute('/_org/customers/$id/edit')({
  beforeLoad: () => ({
    breadcrumb: 'editCustomer',
    pageTitle: 'editCustomer',
  }),
  loader: async ({ params }) => {
    return await getCustomerFn({ data: { id: params.id } })
  },
  component: EditCustomerPage,
})
