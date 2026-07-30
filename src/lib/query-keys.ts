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
    addons: (productId: string) =>
      [...queryKeys.products.all, 'addons', productId] as const,
    pricing: (
      productId: string,
      quantity: number,
      options?: { isRepeatOrder?: boolean; addonIds?: string[] },
    ) =>
      [
        ...queryKeys.products.all,
        'pricing',
        productId,
        quantity,
        options ?? {},
      ] as const,
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
    creationReadiness: () =>
      [...queryKeys.orders.all, 'creation-readiness'] as const,
    history: (id: string) =>
      [...queryKeys.orders.details(), id, 'history'] as const,
    adminTimeline: (id: string) =>
      [...queryKeys.orders.details(), id, 'admin-timeline'] as const,
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
      sort?: { field: string; direction: 'asc' | 'desc' } | null
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
      [...queryKeys.portal.all, 'tasks-timeline', token] as const,
    orderTimeline: (token: string) =>
      [...queryKeys.portal.all, 'order-timeline', token] as const,
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
      sort?: { field: string; direction: 'asc' | 'desc' } | null
      page?: number
      perPage?: number
    }) => [...queryKeys.production.all, 'archived', filters] as const,
    counts: (board?: string) =>
      [...queryKeys.production.all, 'counts', board ?? 'all'] as const,
    tasksByOrder: (orderId: string) =>
      [...queryKeys.production.all, 'tasks-by-order', orderId] as const,
    timeline: (orderId: string) =>
      [...queryKeys.production.all, 'timeline', orderId] as const,
  },
  channels: {
    all: ['channels'] as const,
    connection: () => [...queryKeys.channels.all, 'connection'] as const,
    accesses: (status?: string) =>
      [...queryKeys.channels.all, 'accesses', status ?? 'all'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (filters: { limit?: number }) =>
      [...queryKeys.notifications.all, 'list', filters] as const,
  },
  assistant: {
    all: ['assistant'] as const,
    chat: (scope: { orgId: string; userId: string }) =>
      [...queryKeys.assistant.all, 'chat', scope] as const,
  },
  subscriptions: {
    all: ['subscriptions'] as const,
    current: () => [...queryKeys.subscriptions.all, 'current'] as const,
    warnings: () => [...queryKeys.subscriptions.all, 'warnings'] as const,
  },
  businessTemplates: {
    all: ['business-templates'] as const,
    published: () => [...queryKeys.businessTemplates.all, 'published'] as const,
    detail: (id: string) =>
      [...queryKeys.businessTemplates.all, 'detail', id] as const,
  },
  configuration: {
    all: ['configuration'] as const,
    current: () => [...queryKeys.configuration.all, 'current'] as const,
    elements: (elementType?: string) =>
      [...queryKeys.configuration.all, 'elements', { elementType }] as const,
    detail: (elementType: string, elementKey: string) =>
      [
        ...queryKeys.configuration.all,
        'detail',
        elementType,
        elementKey,
      ] as const,
  },
  upgrades: {
    all: ['upgrades'] as const,
    list: (orgId: string) =>
      [...queryKeys.upgrades.all, 'list', orgId] as const,
    detail: (id: string) => [...queryKeys.upgrades.all, 'detail', id] as const,
  },
  productConfiguration: {
    all: ['product-configuration'] as const,
    fields: (productId: string) =>
      [...queryKeys.productConfiguration.all, 'fields', productId] as const,
    constraints: (productId: string) =>
      [
        ...queryKeys.productConfiguration.all,
        'constraints',
        productId,
      ] as const,
    specifications: {
      all: () =>
        [...queryKeys.productConfiguration.all, 'specifications'] as const,
      list: (filters: { productId?: string; status?: string }) =>
        [
          ...queryKeys.productConfiguration.specifications.all(),
          filters,
        ] as const,
      detail: (id: string) =>
        [...queryKeys.productConfiguration.specifications.all(), id] as const,
    },
    pricing: {
      all: () => [...queryKeys.productConfiguration.all, 'pricing'] as const,
      basis: (productId: string) =>
        [
          ...queryKeys.productConfiguration.pricing.all(),
          'basis',
          productId,
        ] as const,
      calculation: (
        productId: string,
        quantity: number,
        fieldValues: Record<string, unknown>,
      ) =>
        [
          ...queryKeys.productConfiguration.pricing.all(),
          'calculate',
          productId,
          quantity,
          fieldValues,
        ] as const,
      specificationPrice: (specificationId: string) =>
        [
          ...queryKeys.productConfiguration.pricing.all(),
          'spec-price',
          specificationId,
        ] as const,
      overrides: (specificationId: string) =>
        [
          ...queryKeys.productConfiguration.pricing.all(),
          'overrides',
          specificationId,
        ] as const,
    },
  },
  materials: {
    all: ['materials'] as const,
    list: () => [...queryKeys.materials.all, 'list'] as const,
  },
  fulfillment: {
    all: ['fulfillment'] as const,
    detail: (orderId: string) =>
      [...queryKeys.fulfillment.all, 'detail', orderId] as const,
  },
  admin: {
    all: ['admin'] as const,
    dashboard: () => [...queryKeys.admin.all, 'dashboard'] as const,
    organizations: (search?: string) =>
      [...queryKeys.admin.all, 'organizations', { search }] as const,
    plans: () => [...queryKeys.admin.all, 'plans'] as const,
    subscriptions: () => [...queryKeys.admin.all, 'subscriptions'] as const,
    audit: (options?: {
      limit?: number
      offset?: number
      action?: string
      organizationId?: string
    }) => [...queryKeys.admin.all, 'audit', options ?? {}] as const,
    migrations: () => [...queryKeys.admin.all, 'migrations'] as const,
    platformAdmins: () => [...queryKeys.admin.all, 'platform-admins'] as const,
    productionBottlenecks: (orgId: string, limit?: number) =>
      [...queryKeys.admin.all, 'bottlenecks', orgId, limit] as const,
  },
}
