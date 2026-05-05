---
name: testing
description: Test patterns and verification pipeline — Vitest, component tests (with IntlProvider), unit tests, route guard tests, DB integration tests, co-location rules, pre-commit verification. Use when writing tests, setting up test infrastructure, or before committing/pushing.
---

# Testing

## Non-Negotiables

- MUST run `bun run check && bun run typecheck && bun run test` before committing.
- MUST run `bun run build` for changes touching server functions, routes, or imports.
- MUST use Vitest + @testing-library/react — NOT Jest or other frameworks.
- MUST place test files next to the file they test (co-location): `file.test.ts` tests `file.ts`.
- MUST wrap components using `useTranslations` in `IntlProvider` with test messages.
- MUST NOT use snapshot tests for full pages.

## Infrastructure

- Vitest + happy-dom + @testing-library/react
- Globals enabled (`describe`, `it`, `expect`, `beforeEach`)
- Setup: `@testing-library/jest-dom/vitest` + `window.matchMedia` mock

## Pattern 1: Unit Tests (Pure Functions)

```typescript
it('allows owner to manage members', () => {
  expect(canManageMembers('owner')).toBe(true)
})
```

## Pattern 2: Component Tests (with i18n)

```typescript
function renderWithIntl(ui: React.ReactElement) {
  return render(
    <IntlProvider locale="en" messages={{ status: { active: 'Active' } }}>
      {ui}
    </IntlProvider>,
  )
}

it('renders status badge', () => {
  renderWithIntl(<StatusBadge status="active" />)
  expect(screen.getByText('Active')).toBeInTheDocument()
})
```

## Pattern 3: Route Guard Tests

```typescript
it('redirects unauthenticated users', async () => {
  await expect(
    Route.options.beforeLoad?.({ location: { href: '/protected' } } as any),
  ).rejects.toMatchObject({ to: '/sign-in' })
})
```

## Pattern 4: DB Integration Tests

Requires `DATABASE_URL` in `.env.test`. Test server functions end-to-end against real DB.

## TypeScript Rules

### Non-Negotiables
- MUST use `verbatimModuleSyntax` imports (no `import React` unless needed)
- MUST use `#/` prefix for all internal imports
- MUST NOT use `any` in authored source
- MUST NOT use non-null assertions (`!`)
- MUST prefer explicit return types on exported functions
- MUST use `type` imports for type-only bindings

### Allowed Exceptions
- `as any` in `src/routeTree.gen.ts` (generated)
- `Record<string, unknown>` in TanStack Router route context
- `as SQL` in Drizzle query building
- `catch (err: unknown)` at external boundaries (must narrow to Error/string)

## Verification Pipeline

```bash
bun run check       # Biome: format + lint
bun run typecheck   # tsc --noEmit
bun run test        # vitest run --passWithNoTests
bun run build       # vite build (for route/server changes)
```

## References

When you need deeper detail: [`references/testing.md`](references/testing.md) — test patterns with code examples, file placement.
