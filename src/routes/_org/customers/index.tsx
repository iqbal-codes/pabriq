import { createFileRoute } from '@tanstack/react-router'
import { CustomersListPage } from '#/features/customers/pages/customers-list-page'
import { globalOverlaySearchSchema } from '#/hooks/use-global-overlay'

type CustomerSearch = {
  q?: string
  page?: number
  perPage?: number
  sort?: string
  status?: string
  modal?: string | null
  modalId?: string | null
  sheet?: string | null
  sheetId?: string | null
}

export const Route = createFileRoute('/_org/customers/')({
  validateSearch: (search: Record<string, unknown>): CustomerSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    page: typeof search.page === 'number' ? search.page : undefined,
    perPage: typeof search.perPage === 'number' ? search.perPage : undefined,
    sort: typeof search.sort === 'string' ? search.sort : undefined,
    status: typeof search.status === 'string' ? search.status : undefined,
    ...globalOverlaySearchSchema.parse(search),
  }),
  beforeLoad: () => ({
    breadcrumb: 'customers',
    pageTitle: 'customers',
  }),
  component: CustomersListPage,
})
