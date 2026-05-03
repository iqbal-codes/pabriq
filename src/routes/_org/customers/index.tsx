import { createFileRoute } from '@tanstack/react-router'
import { CustomersListPage } from '#/features/customers/pages/customers-list-page'
import { listCustomersFn } from '#/features/customers/server'

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
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: async ({ context, deps }) => {
    const ctx = context as { org: { id: string } }
    const result = await listCustomersFn({
      data: { orgId: ctx.org.id, search: deps.q },
    })
    return result
  },
  component: CustomersListPage,
})
