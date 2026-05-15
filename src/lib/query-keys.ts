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
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters: {
      orgId: string
      status?: string
      q?: string
      page?: number
      perPage?: number
    }) => [...queryKeys.invoices.lists(), filters] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
    paymentMethods: () =>
      [...queryKeys.invoices.all, 'payment-methods'] as const,
    orderForInvoice: (orderId: string) =>
      [...queryKeys.invoices.all, 'order-for-invoice', orderId] as const,
    payments: (invoiceId: string) =>
      [...queryKeys.invoices.all, 'payments', invoiceId] as const,
    balance: (invoiceId: string) =>
      [...queryKeys.invoices.all, 'balance', invoiceId] as const,
  },
  portal: {
    all: ['portal'] as const,
    order: (token: string) =>
      [...queryKeys.portal.all, 'order', token] as const,
    timeline: (token: string) =>
      [...queryKeys.portal.all, 'timeline', token] as const,
  },
  address: {
    all: ['address'] as const,
    areas: (query: string) =>
      [...queryKeys.address.all, 'areas', query] as const,
  },
  production: {
    all: ['production'] as const,
    stages: (board?: string) =>
      [...queryKeys.production.all, 'stages', board ?? 'all'] as const,
    board: (filters: {
      orgId: string
      board?: string
      stageId?: string
      search?: string
    }) => [...queryKeys.production.all, 'board', filters] as const,
    task: (id: string) => [...queryKeys.production.all, 'task', id] as const,
    activities: (taskId: string) =>
      [...queryKeys.production.all, 'activities', taskId] as const,
    archived: (filters: {
      orgId: string
      board?: string
      search?: string
      page?: number
      perPage?: number
    }) => [...queryKeys.production.all, 'archived', filters] as const,
    counts: (board?: string) =>
      [...queryKeys.production.all, 'counts', board ?? 'all'] as const,
    tasksByOrder: (orderId: string) =>
      [...queryKeys.production.all, 'tasks-by-order', orderId] as const,
  },
}
