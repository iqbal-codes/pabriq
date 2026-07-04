---
name: pabriq-app-v2-conventions
description: Cross-cutting coding conventions in the pabriq-app-v2 codebase: import aliases (#/), feature module structure (model/server/hooks), error handling (discriminated unions), file naming (kebab-case files, PascalCase exports), and query key patterns. Use whenever adding or editing files, functions, types, or modules in pabriq-app-v2 to stay consistent with existing patterns.
---

# pabriq-app-v2 — Conventions

The cross-cutting coding conventions that apply across all domains in this codebase. This skill covers naming, imports, exports, module structure, and error handling — the patterns every contributor hits regardless of what they're building.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the conventions-specific details.

## Where things live

- Config files: `biome.json` (formatter/linter), `tsconfig.json` (TypeScript), `package.json` (import aliases, scripts)
- Feature modules: `src/features/<name>/` — each feature follows a consistent internal structure
- Shared utilities: `src/lib/` (auth, query keys, sorting, validation, etc.)
- Components: `src/components/app/` (app-level), `src/components/ui/` (shadcn primitives)

## How we do conventions here

### Import aliases: `#/` prefix maps to `./src/`

All internal imports use the `#/` prefix, configured in `package.json` `"imports"` and `"paths"` in `tsconfig.json`. Never use relative `../` chains for cross-module imports.

> from `src/features/customers/hooks.ts`
```ts
import { invalidateMutationQueries } from '#/lib/mutation-invalidation'
import { queryKeys } from '#/lib/query-keys'
import type { CustomerInput, ListCustomersParams } from './model'
```
Why: `#/` provides stable, absolute-ish paths that survive file moves; relative `./` only within the same feature directory.

### Feature module structure: model → server → hooks

Every feature follows the same three-layer convention:

- `model.ts` — pure domain logic, types, Drizzle queries. No framework coupling.
- `server.ts` — TanStack Start `createServerFn` wrappers. Resolves auth, delegates to model, returns discriminated unions.
- `hooks.ts` — React Query hooks (`useQuery`, `useMutation`) wrapping server functions. One hook per data operation.

> from `src/features/customers/server.ts`
```ts
export const createCustomerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: CustomerInput) => input)
  .handler(
    async ({ data }): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
      const orgId = await resolveOrgId()
      try {
        const id = await createCustomer({ ...data, orgId })
        return { ok: true, id }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
      }
    },
  )
```
Why: this layering keeps model logic testable without server context, and server functions thin.

### Error handling: discriminated union return types

Server functions never throw to the client. They return `{ ok: true, ...data } | { ok: false, error: string }`. The `ok` discriminant lets callers narrow safely.

> from `src/features/customers/server.ts`
```ts
async ({ data }): Promise<{ ok: true } | { ok: false; error: string }> => {
  const orgId = await resolveOrgId()
  try {
    await updateCustomer(data.id, orgId, data)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
```
Why: keeps error propagation explicit and consistent; callers pattern-match on `ok` instead of try/catch.

### Query key hierarchy: centralized factory

All query keys live in `src/lib/query-keys.ts` as a single exported object. Each domain has `all → lists() → list(filters)` and `all → details() → detail(id)` tiers, typed with `as const`.

> from `src/lib/query-keys.ts`
```ts
export const queryKeys = {
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: { orgId: string; search?: string }) =>
      [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
}
```
Why: one place to update when adding a new query shape; hierarchical keys enable precise cache invalidation.

## Naming conventions

- **Files**: kebab-case for everything — `status-badge.tsx`, `query-keys.ts`, `create-invoice-modal.tsx`
- **Components**: PascalCase function names — `StatusBadge`, `PageContent`, `ForbiddenPage`
- **Functions/variables**: camelCase — `listCustomers`, `createCustomerFn`, `resolveOrgId`
- **Types/interfaces**: PascalCase — `CustomerInput`, `ListOrdersParams`, `CreateDraftOrderResult`
- **Constants**: UPPER_SNAKE_CASE — `ORDER_CREATION_READINESS_TOTAL`

## Export style

- Named exports everywhere. No default exports in the codebase.
- Server functions use `export const` with `createServerFn` chaining.
- Types exported alongside their consumers (co-located in `model.ts`).

## Conventions observed

- Biome enforces: 2-space indentation, single quotes, semicolons only as needed (`biome.json`).
- TypeScript strict mode with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.
- Feature files are co-located: `model.test.ts` sits next to `model.ts`; component tests next to components.
- Route files in `src/routes/` follow TanStack Router's file-based convention with kebab-case names.

## Anti-patterns to avoid

- No `../` relative imports across feature boundaries — use `#/` aliases instead.
- No default exports — the codebase uses named exports everywhere.
- No throwing from server functions — always return `{ ok: false, error: string }`.
- No ad-hoc query keys — always go through `queryKeys` in `src/lib/query-keys.ts`.
- No framework imports in `model.ts` — keep it pure; server functions in `server.ts` handle auth and middleware.

## Gaps / verify

- Component file naming is overwhelmingly kebab-case, but `src/components/app/AuthForm.tsx` uses PascalCase — this appears to be an exception. Verify before adopting PascalCase for component filenames.
- The `src/components/ui/` directory (shadcn primitives) is excluded from Biome linting (`biome.json` excludes `!src/components/ui`). Conventions there are managed by the shadcn generator, not by this project's rules.
