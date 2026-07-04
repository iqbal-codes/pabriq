---
name: pabriq-app-v2-ui
description: >
  How UI work is done in the pabriq-app-v2 codebase: components live in src/components/ (ui/ for
  shadcn primitives, app/ for reusable app-level pieces), feature pages in src/features/*/pages/,
  and routes in src/routes/. Forms use TanStack Form with a custom useAppForm/withForm hook and
  Zod validation; data tables use TanStack Table wrapped in a reusable DataTable component; pages
  follow a PageContent/PageHeader shell pattern. Styling is Tailwind CSS v4 with a cn() utility.
  Use whenever the user adds or edits components, pages, forms, tables, or frontend logic in
  pabriq-app-v2, even if they don't say "UI".
---

# pabriq-app-v2 — UI / UX

This domain covers the frontend layer of pabriq-app-v2: components, pages, forms, data tables,
routing, and client-side state. The stack is React 19 via TanStack Start with TanStack Router,
TanStack Query, TanStack Form, and Tailwind CSS v4.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the full stack,
> architecture, and tooling context. This skill adds the UI-specific details.

## Where things live

- **Shadcn/ui primitives**: `src/components/ui/` — button, input, dialog, sidebar, table, etc.
- **Reusable app components**: `src/components/app/` — page-shell/, data-table/, form/, asset-file, etc.
- **Shared standalone components**: `src/components/` (root) — confirm-dialog.tsx, status-badge.tsx, nav-user.tsx
- **Feature pages**: `src/features/<feature>/pages/` — one file per page (e.g. create-product-page.tsx)
- **Feature components**: `src/features/<feature>/components/` — feature-specific UI pieces
- **Routes**: `src/routes/` — file-based routing via TanStack Router (e.g. `_org.tsx`, `__root.tsx`)
- **Shared hooks**: `src/hooks/` — use-mobile.ts and other cross-cutting hooks
- **Validation schemas**: `src/lib/validation-schemas.ts` — Zod schemas for form validation
- **i18n messages**: `src/messages/en.ts`, `src/messages/id.ts` — translation strings

## How we do UI here

### Form pattern — TanStack Form with custom hook

Forms use TanStack Form's `createFormHook` to produce a typed `useAppForm` hook. Each page
instantiates the form with `defaultValues`, Zod validators, and an `onSubmit` handler, then
renders via `FormRoot` → `form.AppField` → `<field.Component>`.

> from `src/features/products/pages/create-product-page.tsx`
```tsx
const form = useAppForm({
  defaultValues: { name: '', description: '', basePrice: undefined as number | undefined },
  validators: { onChange: productFormSchema, onSubmit: productFormSchema },
  onSubmit: async ({ value, formApi }) => {
    if (!formApi.state.isValid) return
    const result = await createProduct.mutateAsync(value)
    if (result.ok) { toast.success(t('created')); navigate({ to: '/products' }) }
  },
})
```

Why: Centralizes form state, validation, and submission. The `useAppForm` hook is defined in
`src/components/app/form/form-context.tsx` and bundles all custom field components.

### Field shell pattern — reusable field wrappers

Text-based fields are thin wrappers around `TextInputFieldShell`, which provides label, error
display, and field context wiring. Each specific field (TextField, EmailField, PasswordField)
simply passes its own `<Input>` render function.

> from `src/components/app/form/text-field.tsx`
```tsx
export function TextField(props: FieldProps) {
  return (
    <TextInputFieldShell {...props}>
      {(inputProps) => <Input {...inputProps} />}
    </TextInputFieldShell>
  )
}
```

Why: Eliminates repetitive label/error/layout boilerplate. The shell (`text-input-field-shell.tsx`)
uses `useFieldContext<string>()` from TanStack Form to bind value, onChange, and onBlur.

### Data table pattern — TanStack Table with server pagination

The `DataTable<TData>` component wraps TanStack Table with built-in pagination, search, filters,
empty/error states, and responsive mobile cards. Pages define column definitions and pass
server-side page/perPage/sort state plus callbacks.

> from `src/components/app/data-table/data-table.tsx`
```tsx
type DataTableProps<TData> = {
  columns: AppColumnDef<TData>[]
  data: TData[]
  isLoading?: boolean
  labels: DataTableLabels
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  page: number
  perPage: number
  totalRows: number
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: TData) => void
  rowActions?: (row: TData) => React.ReactNode
}
```

Why: Every list page shares the same table infrastructure. Column defs stay local to the feature;
pagination/filter/sort wiring is handled by `useListPageState` from the data-table barrel.

### Page shell pattern — consistent page structure

Every page follows `PageContent` → `PageHeader` → body. `PageContent` sets max-width and padding;
`PageHeader` renders title, description, back/primary/secondary actions.

> from `src/components/app/page-shell/page-header.tsx`
```tsx
export function PageHeader({ title, description, backAction, primaryAction, secondaryActions, className }: PageHeaderProps) {
  return (
    <div className={cn('hidden md:flex md:items-center md:justify-between mb-6', className)}>
      <div className="flex min-w-0 items-start gap-2">
        {backAction?.href ? (
          <Button variant="ghost" size="icon-sm" asChild>
            <Link to={backAction.href} aria-label={backAction.label}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        ) : null}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
      </div>
      <PageActions primaryAction={primaryAction} secondaryActions={secondaryActions} />
    </div>
  )
}
```

Why: Enforces visual consistency across all pages. The `PageAction` type standardizes
{ label, href?, onClick?, isLoading? } so every page header has the same interaction model.

## Commands

- Dev server: `bun run dev`
- Build: `bun run build`
- Typecheck: `bun run typecheck`
- Lint/format check: `bun run check`
- Format write: `bun run format`

## Conventions observed

- Components are PascalCase, one per file, co-located with their test (`*.test.tsx`) when tested.
- Barrel `index.ts` files re-export public APIs from feature and shared component directories.
- Forms always use `useAppForm` from `#/components/app/form` — never raw `useForm`.
- All text content goes through `useTranslations('feature')` from `use-intl` — no hardcoded strings.
- Styling uses the `cn()` utility (`clsx` + `twMerge`) from `#/lib/utils` — never raw template strings.
- Imports use the `#/` prefix mapping to `./src/` (configured in package.json `imports`).
- Server mutations return discriminated unions `{ ok: true, data: T } | { ok: false, error: string }`.
- Toast notifications use `sonner` — `toast.success()` for success, `toast.error()` for errors.
- URL state (search params, pagination) managed via `nuqs` — `useQueryState` / `parseAsString`.

## Anti-patterns to avoid

- No raw `<form>` elements — always use `FormRoot` from the form module which handles submit prevention and context.
- No direct `fetch()` calls — server state goes through TanStack Query hooks in `src/features/<name>/hooks.ts`.
- No inline styles or CSS modules — Tailwind utility classes only, composed via `cn()`.
- No default exports — the codebase uses named exports everywhere.
- No `useEffect` for data fetching — use TanStack Query `useQuery` / `useMutation` instead.
- No hardcoded English strings in components — all user-facing text uses `useTranslations`.

## Gaps / verify

- Form field components are extensive (16+ field types); the barrel export in `src/components/app/form/index.ts` is the canonical list. New fields should follow the `TextInputFieldShell` pattern.
- The data-table module has ~25 files; the public API is the barrel at `src/components/app/data-table/index.ts`. Internal hooks like `use-data-table-accumulation` are implementation details.
- Route guard logic lives in `src/routes/-route-guards.test.tsx` and `src/routes/_org.tsx` `beforeLoad`. Verify the guard pattern before adding new protected routes.
