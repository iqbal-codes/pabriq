---
name: pabriq-app-v2-foundation
description: Architectural playbook for the pabriq-app-v2 full-stack codebase. Triggers when working on high-level architecture, creating new feature modules, registering routes, handling global state, or configuring the TanStack Start framework.
---

# pabriq-app-v2 — Foundation

pabriq-app-v2 is a full-stack meta-framework monolith built on TanStack Start (React 19, Vite, and file-based router) with auth, database, i18n, and a reusable component system pre-configured.

> Read `./references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the architectural playbooks and high-level routing/feature patterns.

## Where things live

- **Routes**: `src/routes/` defines the file-based route tree (managed by TanStack Router).
- **Features**: `src/features/` holds domain modules (e.g. `products`, `orders`, `production`, `invoices`).
- **Database Schema**: `src/db/schema.ts` is the single source of truth for all database tables and indexes.
- **Better Auth Integration**: `src/lib/auth.ts` configures roles, organizations, and permissions.
- **AI Agents**: `src/mastra/` houses the Mastra agent configurations, custom tools, and agent workflows.

---

## Architectural Conventions & Workflows

### 1. Feature Module Structure
Every feature follows a strict separation of concerns to isolate UI, server logic, and caching:

```
src/features/<feature-name>/
├── model.ts       # Pure business logic + types + DB queries
├── server.ts      # createServerFn definitions (invokes model.ts, handles auth & validation)
├── hooks.ts       # TanStack Query query/mutation React hooks wrapping server functions
├── components/    # Reusable UI components for this feature (optional)
└── pages/         # Page components that map to routes (optional)
```

Example pattern:
> from `src/features/products/hooks.ts`
```typescript
export function useProductsList(filters: ListProductsParams) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => listProductsFn({ data: filters }),
    placeholderData: keepPreviousData,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<CreateProductInput, 'orgId'>) =>
      createProductFn({ data: input }),
    onSuccess: () => {
      return invalidateMutationQueries(queryClient, [
        { queryKey: queryKeys.products.lists() },
      ])
    },
  })
}
```

### 2. File-Based Routing
File-based routes live in `src/routes/`. Subdirectories represent paths, and `_org.tsx` acts as the authenticated layout wrapper.

Example pattern:
> from `src/routes/_org.tsx`
```typescript
export const Route = createFileRoute('/_org')({
  beforeLoad: async ({ location }) => {
    const result = await resolveOrgContext()

    if (!result.ok) {
      if (result.reason === 'unauthenticated') {
        throw redirect({
          to: '/sign-in',
          search: { redirect: location.href },
        })
      }
      throw redirect({ to: '/onboarding' })
    }

    if (result.role === 'member' && location.pathname === '/') {
      throw redirect({ to: '/operator' })
    }

    return {
      session: result.session,
      org: result.org,
      role: result.role,
    }
  },
  component: OrgLayout,
})
```

---

## Commands

Verbatim high-level commands for running, testing, and managing the project:
- **Run dev server**: `bun run dev` (runs at port 3001)
- **Production build**: `bun run build`
- **Lint & format checks**: `bun run check`
- **Run vitest tests**: `bun run test`
- **Run Playwright E2E tests**: `bun run test:e2e`

---

## Conventions Observed

- **Internal Imports**: Always import using the `#/` alias rather than `@/` or relative pathing (e.g. `import { db } from '#/db/index'`).
- **Query Keys**: Centralized in `src/lib/query-keys.ts` using structured factories to prevent invalidation bugs.
- **Route Preloading**: Default preloading is set to `'intent'` in `src/router.tsx` to prefetch bundle segments before mouse clicks.

---

## Anti-patterns to Avoid

- **No Local env Sourcing**: Never run test commands by manually sourcing local environment files. Always run them through `bun run test` to load `load-env-test` safely.
- **No Direct DB Calls in Components**: Do not import `db` or run raw Drizzle queries inside routes or components. Always route them through server functions (`createServerFn`) inside `server.ts`.
