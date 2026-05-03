import { createFileRoute } from '@tanstack/react-router'
import { EditCustomerPage } from '#/features/customers/pages/edit-customer-page'

export const Route = createFileRoute('/_org/customers/$id/edit')({
  beforeLoad: () => ({
    breadcrumb: 'edit',
    parentBreadcrumbs: [{ label: 'customers', href: '/customers' }],
    pageTitle: 'editCustomer',
  }),
  component: EditCustomerPage,
})
