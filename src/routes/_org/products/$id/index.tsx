import { createFileRoute } from '@tanstack/react-router'
import { ProductsListPage } from '#/features/products/pages/products-list-page'

function EditProduct() {
  const { id } = Route.useParams()
  return <ProductsListPage sheet={{ type: 'edit', id }} />
}

export const Route = createFileRoute('/_org/products/$id/')({
  beforeLoad: () => ({
    breadcrumb: 'edit',
    parentBreadcrumbs: [{ label: 'products', href: '/products' }],
    pageTitle: 'editProduct',
  }),
  component: EditProduct,
})
