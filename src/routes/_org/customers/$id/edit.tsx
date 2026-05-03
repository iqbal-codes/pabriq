import { createFileRoute } from '@tanstack/react-router'
import { EditCustomerPage } from '#/features/customers/pages/edit-customer-page'

export const Route = createFileRoute('/_org/customers/$id/edit')({
  beforeLoad: () => ({
    breadcrumb: 'editCustomer',
    pageTitle: 'editCustomer',
  }),
  component: EditCustomerPage,
})
