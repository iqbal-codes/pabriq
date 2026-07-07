---
name: pabriq-app-v2-ui
description: How UI work is done in the pabriq-app-v2 codebase: components live in src/components/ (ui/ for shadcn primitives, app/ for reusable app-level pieces), feature pages in src/features/*/pages/, and routes in src/routes/. Forms use TanStack Form with a custom useAppForm/withForm hook and Zod validation; data tables use TanStack Table wrapped in a reusable DataTable component; pages follow a PageContent/PageHeader shell pattern. Styling is Tailwind CSS v4 with a cn() utility. Use whenever the user adds or edits components, pages, forms, tables, or frontend logic in pabriq-app-v2, even if they don't say "UI".
---

# pabriq-app-v2 — UI

UI layer for a manufacturing SaaS (TanStack Start SSR + React 19). All user-facing code: components, pages, forms, data tables, sidebar, routing, styling, and i18n.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the UI-specific details.

## Where things live

- **shadcn/ui primitives** (57 components, never hand-edited): `src/components/ui/`
- **App-level reusable components**: `src/components/app/` — `page-shell/`, `form/`, `data-table/`, `asset-upload/`
- **Feature pages**: `src/features/*/pages/` (e.g. `src/features/customers/pages/customers-list-page.tsx`)
- **Routes**: `src/routes/_org/` for authenticated workspace routes; `src/routes/` for auth and public routes
- **Shared hooks**: `src/hooks/`
- **i18n translations**: `src/messages/en.ts`, `src/messages/id.ts`, `src/messages/types.ts`
- **Styling config**: `src/styles.css` (Tailwind v4 + oklch theme tokens)
- **PWA**: `public/manifest.json` (installable PWA), `src/routes/__root.tsx` (manifest link + SW registration), `src/sw.ts` (Serwist service worker) — see `pabriq-app-v2-infra` for full PWA architecture

## Proven preferences / reusable patterns

- **PageShell**: `PageHeader` + `PageContent` from `src/components/app/page-shell/` — use for every workspace page.
- **useAppForm**: Custom TanStack Form wrapper from `src/components/app/form/form-context.tsx` — use for all forms.
- **FormSheet**: Slide-out drawer wrapper from `src/components/app/form/form-sheet.tsx` — use for all creation/editing forms.
- **DataTable**: Wrapped TanStack Table from `src/components/app/data-table/` — use for all list/table UIs.
- **ConfirmDialog**: From `src/components/confirm-dialog.tsx` — destructive action confirmation, never `window.confirm`.
- **StatusBadge**: From `src/components/status-badge.tsx` — entity status display with i18n.
- **withForm**: Reusable field group composition from `src/components/app/form/`.
- **FormActions (align="stacked")**: Stacked buttons that stretch to full-width on mobile and align-end row on desktop.

Full pattern catalog: `references/ui-patterns.md`.

## How we do UI here

### Page shell pattern

Every workspace page uses `PageContent` + `PageHeader`. Route files define breadcrumbs and page metadata in `beforeLoad`.

> from `src/routes/_org/customers/index.tsx`
```typescript
export const Route = createFileRoute('/_org/customers/')({
  beforeLoad: () => ({
    breadcrumb: 'customers',
    pageTitle: 'customers',
    primaryAction: { label: 'createCustomer', href: '/customers/new' },
  }),
  component: CustomersListPage,
})
```
Why: `beforeLoad` metadata drives the sidebar breadcrumbs, mobile header title, and primary action button — no manual wiring needed.

### List page with DataTable

Feature pages compose `PageContent` → `PageHeader` → `DataTable` with `useListPageState` for URL-synced pagination/sorting/search.

> from `src/features/customers/pages/customers-list-page.tsx`
```tsx
return (
  <PageContent>
    <PageHeader
      title={t('title')}
      description={t('listDescription')}
      primaryAction={{ label: t('createCustomer'), href: '/customers/new' }}
    />
    <DataTable
      columns={columns}
      data={rows}
      isRefetching={isFetching}
      isLoading={rows.length === 0 && isFetching}
      labels={labels}
      page={page}
      perPage={perPage}
      sort={sort}
      tableId="customers"
      totalRows={totalRows}
      filters={filtersConfig}
      toolbarStart={<DataTableSearch ... />}
    />
  </PageContent>
)
```
Why: `DataTable` handles loading/empty/error/refetching states, mobile cards, column visibility, and filter panels — don't build from scratch.

### Form sheet pattern (create / edit)

Creation and editing forms use `FormSheet` and slide out from the right, keeping the parent list page in context. Forms are validated with Zod, and form actions are placed in `FormActions` at the bottom with `align="stacked"`.

> from `src/features/customers/components/customer-form-sheet.tsx`
```tsx
function CustomerFormSheetInner({ mode, onOpenChange, onSaved, customer }) {
  const t = useTranslations('customers')
  const form = useAppForm({
    defaultValues: { name: customer?.name ?? '', email: customer?.email ?? '' },
    validators: { onChange: customerFormSchema, onSubmit: customerFormSchema },
    onSubmit: async ({ value }) => {
      const result = mode.type === 'edit' 
        ? await updateCustomer.mutateAsync({ ...value, id: customer.id })
        : await createCustomer.mutateAsync(value)
      if (result.ok) {
        toast.success(t('saved'))
        onSaved()
      }
    }
  })

  return (
    <FormSheet open={true} onOpenChange={onOpenChange} title={title}>
      <FormRoot form={form} className="flex min-h-0 flex-1 flex-col space-y-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <CustomerFormFields form={form} />
        </div>
        <FormActions align="stacked" className="border-t bg-background px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {ct('cancel')}
          </Button>
          <form.AppForm>
            <form.SubmitButton>{submitLabel}</form.SubmitButton>
          </form.AppForm>
        </FormActions>
      </FormRoot>
    </FormSheet>
  )
}
```
Why: Slide-out sheets keep search and filter states on the list page intact and make the application feel fast and SPA-like. The `align="stacked"` ensures buttons are full-width and easily tappable on mobile while converting to row buttons on desktop.
### Form field components

Field components wrap shadcn primitives with validation, labels, and error display. Available fields: `TextField`, `EmailField`, `PasswordField`, `TextareaField`, `NumberField`, `PhoneField`, `SelectField`, `ComboboxField`, `AddressField`, `AreaSearchField`, `PhotoUploadField`, `FileUploadField`, `RadioCardField`, `RadioGroupField`, `DateField`, `CheckboxGroupField`.

> from `src/components/app/form/form-context.tsx`
```typescript
export const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField, EmailField, PasswordField, TextareaField, SelectField,
    NumberField, PhoneField, ComboboxField, AddressField, AreaSearchField,
    PhotoUploadField, FileUploadField, DateField, RadioCardField,
    RadioGroupField, CheckboxGroupField,
  },
  formComponents: { SubmitButton, FormError },
  fieldContext, formContext,
})
```
Why: `createFormHook` from TanStack Form gives you `form.AppField` with typed field components — never build forms from raw `useState` + `<input>`.

### Array fields (dynamic lists)

Dynamic lists use `form.AppField` with `mode="array"` and indexed names. Reference: `src/routes/_org/orders/new.tsx`.

```tsx
<form.AppField name="items" mode="array">
  {(itemsField) => (
    <div>
      {itemsField.state.value.map((_, i) => (
        <div key={i}>
          <form.AppField name={`items[${i}].productId`}>
            {(field) => <field.SelectField label="Product" options={...} />}
          </form.AppField>
          <button onClick={() => itemsField.removeValue(i)}>Remove</button>
        </div>
      ))}
      <button onClick={() => itemsField.pushValue({ productId: '', quantity: '1' })}>Add</button>
    </div>
  )}
</form.AppField>
```

### URL search params (nuqs)

All URL search state uses `nuqs` (`useQueryState`, `parseAsString`, etc.) — never raw `useSearchParams` or `window.location.search`. The `useListPageState` hook from `src/components/app/data-table/` handles standard list pagination/sorting/search.

### i18n in components

Every user-visible string uses `useTranslations('namespace')` in JSX or `getTranslations()` outside JSX. Keys are camelCase in `src/messages/en.ts` (source of truth for the `Messages` type) and `src/messages/id.ts`.

```tsx
const t = useTranslations('customers')
const dt = useTranslations('dataTable')
const st = useTranslations('status')
```
Why: Multiple namespaces per component is normal — `status`, `dataTable`, `common` are reused across features.

## Commands

- Dev server: `bun run dev`
- Typecheck: `bun run typecheck`
- Lint + format check: `bun run check`
- Run all tests: `bun run test`
- Run single test file: `bun run test src/features/customers/pages/customers-list-page.test.tsx`

## Conventions observed

- Components: one per file, PascalCase filenames, named exports only.
- shadcn/ui primitives (`src/components/ui/`) are generated — never hand-edit.
- Imports: `#/` prefix for all internal imports; `import type` for type-only bindings.
- All icons from `lucide-react` — no other icon libraries.
- `Button asChild` when wrapping a `Link` (e.g. `<Button asChild><Link to="...">...</Link></Button>`).
- `useState` only for local UI state (toggle, modal open, submission error) — never for form field values.
- `cn()` utility from `src/lib/utils` for conditional class merging.
- Dark mode via `.dark` class on `<html>`, oklch color tokens in `src/styles.css`.
- App is installable as a PWA (standalone mode) — `public/manifest.json` defines name, icons, display mode. Root route links the manifest and registers the service worker.

## Anti-patterns to avoid

- No raw HTML form elements (`<input>`, `<select>`, `<textarea>`, `<button>`, `<table>`, `<dialog>`, `<label>`) — use shadcn/ui components.
- No `react-hook-form` or raw `useState` for form state — use `useAppForm`.
- No `useSearchParams` from React Router — use `nuqs`.
- No `window.confirm` — use `ConfirmDialog`.
- No hardcoded English strings in JSX — use `useTranslations()`.
- No `console.log` on user-facing pages.
- No emoji or non-Lucide icon libraries.

## Gaps / verify

- `docs/agents/boilerplate/components.md` documents `PageActions` accepting `PageAction` with `label` as raw strings, but source shows labels passed as i18n keys from the route. Verify `PageActions` rendering — it appears to render labels directly without translation.
- `orgFilter` from `src/lib/rls.ts` is documented in the profile but unused in practice — source filters by `eq(table.orgId, orgId)` directly. Don't adopt `orgFilter`.
- The `@/*` alias exists alongside `#/` for shadcn/ui compatibility. Convention is `#/` for all authored code.
