export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: {
      orgId: string
      search?: string
      status?: string
      sort?: { field: string; direction: 'asc' | 'desc' } | null
      page?: number
      perPage?: number
    }) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    breakpoints: (productId: string) =>
      [...queryKeys.products.all, 'breakpoints', productId] as const,
    pricing: (productId: string, quantity: number) =>
      [...queryKeys.products.all, 'pricing', productId, quantity] as const,
  },
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: { orgId: string; search?: string }) =>
      [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: {
      orgId: string
      search?: string
      status?: string
      sort?: { field: string; direction: 'asc' | 'desc' } | null
      page?: number
      perPage?: number
    }) => [...queryKeys.orders.lists(), filters] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },
  assets: {
    all: ['assets'] as const,
    signedUrl: (assetId: string) =>
      [...queryKeys.assets.all, 'signed-url', assetId] as const,
  },
  portal: {
    all: ['portal'] as const,
    order: (token: string) =>
      [...queryKeys.portal.all, 'order', token] as const,
  },
  address: {
    all: ['address'] as const,
    areas: (query: string) =>
      [...queryKeys.address.all, 'areas', query] as const,
  },
}
