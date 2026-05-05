# Feature Module Blueprint

> **Rules:** [`../rules/server-functions.md`](../rules/server-functions.md) — createServerFn requirements, org resolution.

Every feature follows a consistent structure:

```
src/features/<name>/
├── model.ts       # Pure business logic + DB queries
├── server.ts      # createServerFn wrappers (org resolution)
├── hooks.ts       # TanStack Query hooks
├── components/    # (optional) Reusable form fields / UI
└── pages/         # (optional) Route-level page components
```

## model.ts

```typescript
import { db } from '#/db/index'
import { orgFilter } from '#/lib/rls'

export async function listItems(orgId: string) {
  return db.select().from(itemsTable).where(orgFilter('org_id'))
}
```

## server.ts

```typescript
export const listItemsFn = createServerFn({ method: 'GET' })
  .inputValidator((input: { orgId: string; search?: string }) => input)
  .handler(async ({ data }): Promise<Item[]> => {
    const orgId = await resolveOrgId() // from session
    return listItems(orgId)
  })
```

## hooks.ts

```typescript
import { queryKeys } from '#/lib/query-keys'

export function useItemsList(filters: ListFilters) {
  return useSuspenseQuery({
    queryKey: queryKeys.items.list(filters),
    queryFn: () => listItemsFn({ data: filters }),
  })
}

export function useCreateItem() {
  return useMutation({
    mutationFn: (input: CreateInput) => createItemFn({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.items.all }),
  })
}
```

## Query Key Factory (`src/lib/query-keys.ts`)

```typescript
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters) => [...queryKeys.products.lists(), filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id) => [...queryKeys.products.details(), id] as const,
    breakpoints: (productId) => [...queryKeys.products.all, 'breakpoints', productId] as const,
    pricing: (productId, quantity) => [...queryKeys.products.all, 'pricing', productId, quantity] as const,
  },
  customers: { all, lists(), list(filters), details(), detail(id) },
  orders: { all, lists(), list(filters), details(), detail(id) },
  assets: { all, signedUrl(assetId) },
  portal: { all, order(token) },
  address: { all, areas(query) },
}
```

## Route Context Pattern

```typescript
export const Route = createFileRoute('/_org/entity')({
  beforeLoad: () => ({
    breadcrumb: 'entityName',
    pageTitle: 'entityName',
    primaryAction: { label: 'createEntity', href: '/entity/new' },
    parentBreadcrumbs: [{ label: 'parent', href: '/parent' }],
  }),
})
```
