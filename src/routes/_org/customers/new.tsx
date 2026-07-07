import { createFileRoute } from '@tanstack/react-router'
import { CustomersListPage } from '#/features/customers/pages/customers-list-page'

export const Route = createFileRoute('/_org/customers/new')({
  beforeLoad: () => ({
    breadcrumb: 'new',
    parentBreadcrumbs: [{ label: 'customers', href: '/customers' }],
    pageTitle: 'createCustomer',
  }),
  component: () => <CustomersListPage sheet={{ type: 'create' }} />,
})
