# Coding Standards

The reviewer agent loads this during code review via @.sandcastle/CODING_STANDARDS.md
so these standards are enforced without costing tokens during implementation.

## TypeScript & Style

- MUST use `verbatimModuleSyntax` imports; use `import type` for type-only bindings
- MUST use `#/` prefix for all internal imports
- MUST NOT use `any` in authored source (exceptions: `routeTree.gen.ts`, `as SQL` in Drizzle, route context casts, catch `err: unknown`)
- MUST NOT use non-null assertions (`!`)
- MUST prefer explicit return type annotations on exported functions
- Use `as const` for fixed tuples/lists and literal types
- Use discriminated unions for state machines and API response types
- Booleans: prefix with `is*`, `has*`, `can*` (e.g. `isActive`, `canManageProducts`)
- Functions: verb phrases (`getOrder`, `createCustomer`), not nouns
- Components: PascalCase filenames, one component per file, default export
- Types/interfaces: PascalCase
- Biome for lint + format (single quotes, no semicolons)

## Architecture

- Feature module blueprint: `src/features/<name>/model.ts` (logic + DB) + `server.ts` (createServerFn) + `hooks.ts` (TanStack Query hooks)
- MUST use `createServerFn` for all internal API — never raw `fetch`
- MUST use `.inputValidator()` — type-only pass-through for GET, Zod schema for mutations
- MUST resolve org from session (membership lookup), never trust client-provided `orgId`
- MUST dynamically import `auth` and `db` inside handler — not at module level
- MUST narrow `db.select()` to specific columns
- Server functions MUST re-verify org membership even when caller passes `ctx.org.id`

## Data Layer

- MUST import `db` from `#/db/index` only
- MUST use Drizzle query builder — never raw SQL except in RLS helpers
- MUST filter every business table query by `orgId` — resolved from session, not client
- MUST add `orgId` FK to every new business table
- MUST use `crypto.randomUUID()` for new record IDs
- MUST run DB changes through Drizzle migrations — never direct schema changes
- MUST NOT use `LIKE '%term%'` without a `pg_trgm` GIN index (enforce min 3 chars)
- MUST NOT loop DB queries when batch operations work (`inArray`, batch insert, transaction)
- ID type: text/uuid. Timestamps: `timestamp({ withTimezone: true }).defaultNow().notNull()`

## UI Components

- MUST use shadcn/ui primitives — never raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>`
- MUST use `useAppForm` from `#/components/app/form` for ALL forms
- MUST use nuqs (`useQueryState`, `parseAsString`) for URL search params — never `useSearchParams`
- MUST use lucide-react for icons — never emoji or other icon libraries
- MUST use `PageContent` and `PageHeader` from `#/components/app/page-shell` for workspace pages
- MUST use `DataTable` from `#/components/app/data-table` for ALL table/list UIs
- MUST use `Button asChild` when wrapping a `Link` in a `Button`

## Forms

- MUST use the app/form field components (`TextField`, `NumberField`, `SelectField`, etc.) inside `form.AppField`
- MUST NOT build forms from scratch using shadcn/ui `Input`, `Label`, `Field` primitives

## i18n

- MUST use `useTranslations()` for every user-facing text in JSX
- MUST use `getTranslations()` for text computed outside JSX (`beforeLoad`, loader)
- MUST define every key in the `Messages` type in `src/messages/en.ts` before using it
- MUST provide both `en` and `id` values for every key
- Namespace keys MUST use camelCase
- MUST wrap test components using `useTranslations` in `IntlProvider` with test messages

## Auth & Security

- MUST use `getCurrentSession` from `#/lib/auth-session` for session checks in route guards
- MUST use `authClient` from `#/lib/auth-client` for client-side auth
- MUST NOT cache or store session client-side outside Better Auth's management
- MUST sanitize `redirect` search param in auth routes (prevent open redirect)
- MUST use permission guards from `#/features/permissions/model` for role-based UI/logic gates
- Validate input at every server boundary (`.inputValidator()` with Zod for mutations)
- Use discriminated union return types: `{ ok: true, data: T } | { ok: false, error: string }`

## Testing

### Core Principle

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't break unless behavior changed.

### Good Tests

Integration-style tests that exercise real code paths through public APIs. They describe _what_ the system does, not _how_.

- Test behavior users/callers care about
- Use the public API only
- Survive internal refactors
- One logical assertion per test

### Bad Tests (Red Flags)

- Mocking internal collaborators (your own classes/modules)
- Testing private methods
- Asserting on call counts/order of internal calls
- Test breaks when refactoring without behavior change
- Test name describes HOW not WHAT

### Mocking

Mock at **system boundaries** only:

- External APIs (payment, email, etc.)
- Time/randomness
- File system or databases when a real instance isn't practical

**Never mock your own classes/modules or internal collaborators.** If something is hard to test without mocking internals, redesign the interface.

### TDD Workflow: Vertical Slices

Do NOT write all tests first, then all implementation. That produces tests that verify _imagined_ behavior and are insensitive to real changes.

Correct approach — one test, one implementation, repeat:

```
RED → GREEN: test1 → impl1
RED → GREEN: test2 → impl2
RED → GREEN: test3 → impl3
```

Each test responds to what you learned from the previous cycle. Never refactor while RED — get to GREEN first.

### Verification Pipeline

```bash
bun run check       # Biome: format + lint
bun run typecheck   # tsc --noEmit
bun run test        # vitest run --passWithNoTests
bun run build       # vite build (for route/server changes)
```

### Project-specific Rules

- MUST run `bun run check && bun run typecheck && bun run test` before committing
- MUST run `bun run build` for changes touching server functions, routes, or imports
- MUST use Vitest + @testing-library/react — NOT Jest
- MUST co-locate test files next to the file they test: `file.test.ts` tests `file.ts`
- MUST wrap components using `useTranslations` in `IntlProvider` with test messages
- MUST NOT use snapshot tests for full pages

## Interface Design

### Deep Modules

Prefer deep modules: small interface, deep implementation. A few methods with simple params hiding complex logic behind them.

Avoid shallow modules: large interface with many methods that just pass through to thin implementation. Ask: can I reduce the number of methods? Can I simplify the parameters? Can I hide more complexity inside?

### Design for Testability

1. **Accept dependencies, don't create them** — pass external dependencies in rather than constructing them internally
2. **Return results, don't produce side effects** — a function that returns a value is easier to test than one that mutates state
3. **Small surface area** — fewer methods = fewer tests needed, fewer params = simpler test setup
4. For test overrides, use dependency injection / config layers — never `@internal` properties
