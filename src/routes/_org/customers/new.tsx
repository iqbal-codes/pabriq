import { createFileRoute } from '@tanstack/react-router'
import { CreateCustomerPage } from '#/features/customers/pages/create-customer-page'

export const Route = createFileRoute('/_org/customers/new')({
  beforeLoad: () => ({
    breadcrumb: 'new',
    parentBreadcrumbs: [{ label: 'customers', href: '/customers' }],
    pageTitle: 'createCustomer',
  }),
  component: CreateCustomerPage,
})
