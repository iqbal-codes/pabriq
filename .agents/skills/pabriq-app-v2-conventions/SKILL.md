---
name: pabriq-app-v2-conventions
description: Code style, Biome rules, TypeScript strictness, named exports, import aliases (`#/`), naming conventions, error handling patterns, and file organization in the pabriq-app-v2 codebase. Use whenever the user adds or edits files, functions, types, or modules in pabriq-app-v2 to stay consistent with existing patterns.
---

# pabriq-app-v2 — Conventions

Cross-cutting coding conventions enforced by Biome, TypeScript, and project-level rules in this codebase.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the convention-specific details.

## Biome Configuration

Biome is the sole linter and formatter. From `biome.json`:

| Setting | Value |
|---|---|
| Indent | 2 spaces |
| Quotes | Single quotes |
| Semicolons | `asNeeded` (no semicolons) |
| Linter rules | `recommended` set |
| CSS | Tailwind directives enabled |
| Excluded | `node_modules`, `.agents`, `.output`, `dist`, `bun.lock`, `src/components/ui`, `src/routeTree.gen.ts` |

Run `bun run check` to lint + format-check, `bun run format` to auto-fix. `src/components/ui` is excluded because those are generated shadcn/ui primitives — never hand-edit them.

## TypeScript Strictness

From `tsconfig.json`:

| Flag | Value | Meaning |
|---|---|---|
| `strict` | `true` | All strict checks enabled |
| `verbatimModuleSyntax` | `true` | `import type` required for type-only bindings |
| `noUnusedLocals` | `true` | Unused variables are errors |
| `noUnusedParameters` | `true` | Unused parameters are errors |
| `noFallthroughCasesInSwitch` | `true` | No implicit fallthrough |
| `noUncheckedSideEffectImports` | `true` | Side-effect imports must resolve |
| `moduleResolution` | `bundler` | Bundler-style resolution |

TypeScript rules source: `docs/agents/rules/typescript.md`

## Import Conventions

### Internal imports: `#/` prefix

All authored imports MUST use the `#/` alias, which maps to `./src/*`:

```ts
import { db } from '#/db/index'
import { createProduct } from '#/features/products/model'
import type { Role } from '#/features/permissions/model'
import { cn } from '#/lib/utils'
```

The `@/*` alias also maps to `./src/*` but is reserved for shadcn/ui generated components (`components.json`). Use `#/` for all authored code.

### Type-only imports

`verbatimModuleSyntax` is enforced. Use `import type` for type-only bindings:

```ts
import type { PageAction } from './page-shell-types'
import type { Product } from '#/features/products/model'
```

Omit `import React` unless actually used — React 19 JSX transform is configured (`"jsx": "react-jsx"`).

### Dynamic imports for server boundaries

Server functions MUST dynamically import `auth` and `db` inside handlers, not at module level. This prevents bundling server-only code into client bundles:

```ts
export async function resolveOrgId(): Promise<string> {
  const [{ getRequestHeaders }, { auth }, { db }, { member }, { eq }] =
    await Promise.all([
      import('@tanstack/react-start/server'),
      import('#/lib/auth'),
      import('#/db/index'),
      import('#/db/schema'),
      import('drizzle-orm'),
    ])
  // ...
}
```

## Naming Conventions

| What | Convention | Example |
|---|---|---|
| Components | PascalCase filename, one per file | `PageHeader` in `page-header.tsx` |
| Functions | camelCase verb phrases | `createProduct`, `resolveOrgId`, `formatPhone` |
| Types / Interfaces | PascalCase | `OrgContextResult`, `SessionUser`, `ProductRow` |
| Boolean variables | `is*`, `has*`, `can*` prefix | `isActive`, `canManageProducts` |
| i18n keys | camelCase namespaced keys | `products.createSuccess`, `orders.approveConfirm` |
| Files | kebab-case | `page-header.tsx`, `auth-session.ts`, `query-keys.ts` |

## Export Style

Named exports everywhere. No default exports in authored code:

```ts
// Components — named export
export function PageHeader({ title, ... }: PageHeaderProps) { ... }

// Server functions — named export
export const getCurrentSession = createServerFn({ method: 'GET' }).handler(...)
export async function resolveOrgId(): Promise<string> { ... }

// Types — named export
export type OrgContextResult = { ... }
```

## Error Handling

Use discriminated unions for fallible operations, not exceptions:

> from `src/lib/auth-session.ts`

```ts
export type OrgContextResult =
  | {
      ok: true
      session: AuthSession
      org: OrgInfo
      role: Role
    }
  | {
      ok: false
      reason: 'unauthenticated'
    }
  | {
      ok: false
      reason: 'no-org'
      session: AuthSession
    }
```

Convention: `{ ok: true, data: T } | { ok: false, error: string }` for API responses. Validate input at every server boundary with `.inputValidator()` and Zod schemas for mutations. Never swallow errors — surface them with meaningful messages.

## File Organization

### Feature module blueprint

Every feature lives in `src/features/<name>/` with this structure:

- `model.ts` — Pure logic + DB queries (Drizzle). Types, functions, no server imports.
- `server.ts` — `createServerFn` wrappers with org resolution. Calls into `model.ts`.
- `hooks.ts` — TanStack Query hooks that call server functions.

### Component structure

- shadcn/ui primitives in `src/components/ui/` (generated, never hand-edited).
- App-level reusable components in `src/components/app/`.
- One component per file, PascalCase filename.

### Co-located tests

Test files sit next to the file they test with `.test.ts` / `.test.tsx` extension:

```
src/lib/auth-session.ts          → (tests in feature model tests)
src/features/products/model.ts   → src/features/products/model.test.ts
src/components/app/form/form.tsx → src/components/app/form/form.test.tsx
```

## Allowed Exceptions

These are the only acceptable deviations from the strict rules above:

- `any` in `src/routeTree.gen.ts` — autogenerated, not authored.
- `as SQL` in Drizzle query building when ORM type inference doesn't narrow unions.
- Route context casts (`Record<string, unknown>`) in TanStack Router route decoration.
- `catch (err: unknown)` at external boundaries — but MUST narrow before use.
- `as T` in Drizzle return-row casting where DDL guarantees the shape.

## Verification Pipeline

```bash
bun run check       # Biome: format + lint
bun run typecheck   # tsc --noEmit
bun run test        # vitest run --passWithNoTests
bun run build       # vite build (for route/server changes)
```

All four MUST pass before commit. Run `bun run build` when changes touch server functions, routes, or imports — build catches errors `tsc` may miss.

## Commands

- Lint + format check: `bun run check`
- Auto-format: `bun run format`
- Typecheck: `bun run typecheck`
- Tests: `bun run test`
- E2E tests: `bun run test:e2e`
- Full pre-commit: `bun run check && bun run typecheck && bun run test`

## Anti-patterns to avoid

- **No default exports** — the codebase uses named exports everywhere. Source confirms this; some docs say "default export" for components but actual code contradicts it.
- **No `any` in authored code** — exceptions listed above are narrow and documented.
- **No non-null assertions (`!`)** — use type narrowing or optional chaining instead.
- **No `useSearchParams`** — use nuqs (`useQueryState`) for URL state.
- **No raw `fetch` for internal APIs** — use `createServerFn`.
- **No hand-editing `src/components/ui/`** — these are generated shadcn/ui primitives.
- **No module-level `auth`/`db` imports in server functions** — dynamic import inside handlers only.
- **No `// biome-ignore` to silence type errors** — fix the type instead.

## Gaps / verify

- `AGENTS.md` §6 and `.sandcastle/CODING_STANDARDS.md` both say "Components: default export" but actual source files (`page-header.tsx`, `status-badge.tsx`, `confirm-dialog.tsx`) all use named exports. The named export pattern is the observed convention; the docs are stale on this point.
- The `@/*` alias coexists with `#/` for shadcn/ui compatibility. Both map to `./src/*`. Convention is `#/` for all authored code; verify any new file uses the correct alias.
- `orgFilter` from `src/lib/rls.ts` is documented but the codebase uses `eq(table.orgId, orgId)` directly. Verify whether `orgFilter` should be adopted or deprecated.
