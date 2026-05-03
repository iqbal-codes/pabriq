import { createFileRoute } from '@tanstack/react-router'
import { CustomersListPage } from '#/features/customers/pages/customers-list-page'

type CustomerSearch = { q?: string }

export const Route = createFileRoute('/_org/customers/')({
  validateSearch: (search: Record<string, unknown>): CustomerSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  beforeLoad: () => ({
    breadcrumb: 'customers',
    pageTitle: 'customers',
    primaryAction: { label: 'createCustomer', href: '/customers/new' },
  }),
  component: CustomersListPage,
})
