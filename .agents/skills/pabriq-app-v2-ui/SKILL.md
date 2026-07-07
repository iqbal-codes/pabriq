---
name: pabriq-app-v2-ui
description: How UI work is done in the pabriq-app-v2 codebase: components live in src/components/ (ui/ for shadcn primitives, app/ for reusable app-level pieces), feature pages in src/features/*/pages/, and routes in src/routes/. Forms use TanStack Form with a custom useAppForm/withForm hook and Zod validation; data tables use TanStack Table wrapped in a reusable DataTable component; pages follow a PageContent/PageHeader shell pattern. Styling is Tailwind CSS v4 with a cn() utility. Use whenever the user adds or edits components, pages, forms, tables, or frontend logic in pabriq-app-v2, even if they don't say "UI".
---

# pabriq-app-v2 — UI

UI layer for a manufacturing SaaS (TanStack Start SSR + React 19). All user-facing code: components, pages, forms, data tables, sidebar, routing, styling, and i18n.

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for the stack, architecture, and tooling context. This skill adds the UI-specific details.

## Where things live

- **shadcn/ui primitives** (57 components, never hand-edited): `src/components/ui/`
- **App-level reusable components**: `src/components/app/` — `page-shell/`, `form/`, `data-table/`, `asset-upload/`, `global-modal/`
- **Feature pages**: `src/features/*/pages/` (e.g. `src/features/customers/pages/customers-list-page.tsx`)
- **Feature components**: `src/features/*/components/` (e.g. `src/features/orders/components/order-detail-section.tsx`)
- **Routes**: `src/routes/_org/` for authenticated workspace routes; `src/routes/` for auth and public routes
- **Shared hooks**: `src/hooks/` (e.g. `use-global-overlay.ts` for URL-driven overlay state)
- **i18n translations**: `src/messages/en.ts`, `src/messages/id.ts`, `src/messages/types.ts`
- **Styling config**: `src/styles.css` (Tailwind v4 + oklch theme tokens)
- **PWA**: `public/manifest.json` (installable PWA), `src/sw.ts` (Serwist service worker) — see `pabriq-app-v2-infra` for full PWA architecture

## Proven preferences / reusable patterns

- **PageShell**: `PageHeader` + `PageContent` from `src/components/app/page-shell/` — use for every workspace page.
- **useAppForm**: Custom TanStack Form wrapper from `src/components/app/form/form-context.tsx` — use for all forms.
- **FormSheet**: Slide-out drawer wrapper from `src/components/app/form/form-sheet.tsx` — use for all creation/editing forms.
- **DataTable**: Wrapped TanStack Table from `src/components/app/data-table/` — use for all list/table UIs.
- **Global overlay**: URL-driven dialog/sheet system from `src/hooks/use-global-overlay.ts` + `src/components/app/global-modal/` — use for cross-page modals.
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

### Mobile-responsive PageHeader

`PageHeader` accepts `mobileVisible` (default `false`) to show the header bar on mobile screens. Without it, the header is desktop-only (`hidden md:flex`). Use it on detail pages where actions must be accessible on mobile.

> from `src/features/orders/pages/view-order-page.tsx`
```tsx
<PageHeader
  title={<span className="flex items-center gap-2">{order.orderNumber}<OrderStatusBadge status={order.status} /></span>}
  backAction={{ label: ct('back'), href: '/orders' }}
  primaryAction={primaryAction}
  secondaryActions={secondaryActions}
  mobileVisible
/>
```
Why: List pages hide the header on mobile (the mobile header reads from route context). Detail pages need `mobileVisible` so action buttons are reachable on small screens.

### List page with DataTable

Feature pages compose `PageContent` → `PageHeader` → `DataTable` with `useListPageState` for URL-synced pagination/sorting/search.

> from `src/features/customers/pages/customers-list-page.tsx`
```tsx
return (
  <PageContent>
    <PageHeader title={t('title')} description={t('listDescription')}
      primaryAction={{ label: t('createCustomer'), href: '/customers/new' }} />
    <DataTable columns={columns} data={rows} isRefetching={isFetching}
      isLoading={rows.length === 0 && isFetching} labels={labels}
      page={page} perPage={perPage} sort={sort} tableId="customers"
      totalRows={totalRows} filters={filtersConfig}
      toolbarStart={<DataTableSearch ... />} />
  </PageContent>
)
```
Why: `DataTable` handles loading/empty/error/refetching states, mobile cards, column visibility, and filter panels — don't build from scratch.

### Form sheet pattern (create / edit)

Creation and editing forms use `FormSheet` — a shared wrapper around shadcn `Sheet` with header + scrollable content. Feature components compose `FormSheet` + `useAppForm` + `FormActions`.

> from `src/components/app/form/form-sheet.tsx`
```typescript
export function FormSheet({ open, onOpenChange, title, description, children, className }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn('w-full sm:max-w-xl flex flex-col gap-0 p-0', className)}>
        <SheetHeader className="px-5 pt-5 pb-3 border-b pr-12">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SheetContent>
    </Sheet>
  )
}
```

Feature variants (e.g. `customer-form-sheet.tsx`, `order-form-sheet.tsx`, `product-form-sheet.tsx`) handle modes, validators, and mutations — always wrapping with `FormSheet`.

> from `src/features/customers/components/customer-form-sheet.tsx`
```tsx
function CustomerFormSheetInner({ mode, onOpenChange, onSaved, customer }) {
  const form = useAppForm({
    defaultValues: { name: customer?.name ?? '', email: customer?.email ?? '' },
    validators: { onChange: customerFormSchema, onSubmit: customerFormSchema },
    onSubmit: async ({ value }) => {
      const result = mode.type === 'edit'
        ? await updateCustomer.mutateAsync({ ...value, id: customer.id })
        : await createCustomer.mutateAsync(value)
      if (result.ok) { toast.success(t('saved')); onSaved() }
    }
  })
  return (
    <FormSheet open={true} onOpenChange={onOpenChange} title={title}>
      <FormRoot form={form} className="flex min-h-0 flex-1 flex-col space-y-0">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <CustomerFormFields form={form} />
        </div>
        <FormActions align="stacked" className="border-t bg-background px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{ct('cancel')}</Button>
          <form.AppForm><form.SubmitButton>{submitLabel}</form.SubmitButton></form.AppForm>
        </FormActions>
      </FormRoot>
    </FormSheet>
  )
}
```
Why: Slide-out sheets keep search/filter states on the list page intact. `align="stacked"` ensures buttons are full-width on mobile, row-aligned on desktop.

### Global overlay system (modals + sheets)

Cross-page dialogs and sheets use a URL-driven overlay system. State lives in URL search params (`?modal=invite-member&modalId=xyz`) via `nuqs`, rendered by a centralized container in the `_org.tsx` layout.

**Hooks** (`src/hooks/use-global-overlay.ts`):
```typescript
export function useGlobalModal() {
  const [modal, setModal] = useQueryState('modal', parseAsString)
  const [modalId, setModalId] = useQueryState('modalId', parseAsString)
  const openModal = async (name: string, id?: string) => { ... }
  const closeModal = async () => { ... }
  return { modal, modalId, openModal, closeModal, isOpen: !!modal }
}
// useGlobalSheet — same pattern for sheets
```

**Registry** (`src/components/app/global-modal/global-modal-registry.tsx`) maps string keys to lazy-loaded components:
```typescript
export const GLOBAL_MODALS = {
  'invite-member': InviteMemberDialogWrapper,
  'payment-method-form': PaymentMethodFormDialogWrapper,
  'record-payment': RecordPaymentDialogWrapper,
  'stage-form': StageFormWrapper,
  'task-detail': TaskDetailModalWrapper,
  'review-task': ReviewModalWrapper,
} as const
```

**Container** (`src/components/app/global-modal/global-modal-container.tsx`) reads URL state, resolves the component, and renders it with `<Suspense>`.

Why: URL-driven overlays survive page navigation, enable deep-linking to open modals, and keep overlay state out of component trees. To add a new overlay, register it in `GLOBAL_MODALS` and call `openModal('your-key')` from any component.

### Form field components

Field components wrap shadcn primitives with validation, labels, and error display. Registered in `src/components/app/form/form-context.tsx` via `createFormHook`.

Available fields: `TextField`, `EmailField`, `PasswordField`, `TextareaField`, `NumberField`, `PhoneField`, `SelectField`, `ComboboxField`, `AddressField`, `AreaSearchField`, `PhotoUploadField`, `FileUploadField`, `PortalFileUploadField`, `RadioCardField`, `RadioGroupField`, `DateField`, `CheckboxGroupField`.

```typescript
const { useAppForm, withForm } = createFormHook({
  fieldComponents: {
    TextField, EmailField, PasswordField, TextareaField, SelectField,
    NumberField, PhoneField, ComboboxField, AddressField, AreaSearchField,
    PhotoUploadField, FileUploadField, PortalFileUploadField, DateField,
    RadioCardField, RadioGroupField, CheckboxGroupField,
  },
  formComponents: { SubmitButton, FormError },
  fieldContext, formContext,
})
```
Why: `createFormHook` gives you `form.AppField` with typed field components — never build forms from raw `useState` + `<input>`.

### DateField (calendar picker)

`DateField` is a full calendar picker supporting single dates and date ranges, with optional preset shortcuts and year/month dropdown navigation.

> from `src/components/app/form/date-field.tsx`
```typescript
export type DateFieldProps = FieldProps & {
  mode?: 'single' | 'range'
  enableDropdowns?: boolean
  presets?: boolean | Array<{ label: string; value: Date | DateRange }>
  valueFormat?: 'string' | 'date'
  calendarProps?: Omit<React.ComponentProps<typeof Calendar>, 'mode' | 'selected' | 'onSelect' | 'captionLayout' | 'disabled'>
}
```

Usage in forms:
```tsx
<form.AppField name="deadline">
  {(field) => <field.DateField label={t('deadline')} mode="single" enableDropdowns presets />}
</form.AppField>
```

- `mode="single"` (default) — pick one date; `mode="range"` — pick a start/end range.
- `enableDropdowns` (default `true`) — shows year/month select dropdowns in the calendar header.
- `presets={true}` — built-in presets (Today, Tomorrow, Next Week, etc.); `presets={[...]}` — custom preset array.
- `valueFormat="string"` (default) — stores as `"YYYY-MM-DD"` string; `valueFormat="date"` — stores as `Date` object.

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

### Extracted page sections

Complex detail pages extract domain sections into standalone components for readability and reuse. Each section owns its own i18n, data formatting, and layout.

> from `src/features/orders/pages/view-order-page.tsx`
```tsx
<PageContent className="max-w-3xl">
  <PageHeader ... mobileVisible />
  <div className="max-w-3xl space-y-6">
    <RejectedReasonBanner reason={order.rejectReason ?? null} />
    <OrderDetailSection order={order} customerName={customerName} ... />
    <OrderLineItemsCard lineItems={lineItems} orgId={ctx.org.id} ... />
    <OrderInvoicesSection orderInvoices={orderInvoices} invoicePayments={invoicePayments} />
    <OrderFlowTimeline orderId={order.id} ... />
  </div>
</PageContent>
```

Key extracted components in the orders feature:
- **`OrderDetailSection`** (`src/features/orders/components/order-detail-section.tsx`) — customer info, shipping, payment summary, invoiced/remaining amounts.
- **`OrderLineItemsCard`** (`src/features/orders/components/order-line-items-card.tsx`) — line items with deadline, production stage badge via `getReadyForProductionLabel`, asset files, timeline link, quantity adjustment.
- **`OrderInvoicesSection`** (`src/features/orders/components/order-invoices-section.tsx`) — invoice list with expand/collapse, inline payment info, DP/settlement badges, print action.

### `getReadyForProductionLabel` utility

Used in `OrderLineItemsCard` and portal components to display production-ready status with the first stage name.

> from `src/features/production/ready-for-production-label.ts`
```typescript
export function getReadyForProductionLabel({
  firstProductionStageName, readyForProduction, readyForProductionWithStage,
}: { ... }): string {
  if (!firstProductionStageName) return readyForProduction
  return readyForProductionWithStage({ stage: firstProductionStageName })
}
```

### `fieldValidator` helper

> from `src/components/app/form/form-utils.ts`
```typescript
export function fieldValidator(schema: z.ZodTypeAny) { ... }
```
Use `fieldValidator` to wrap Zod schemas for individual field validation. Also exported: `getSchemaForPath` for resolving sub-schemas from a root Zod object by field path, `isFieldRequired` for checking if a field is required.

## Commands

| Command | Notes |
|---|---|
| `bun run dev` | Dev server on port 3001 (Sentry instrumented) |
| `bun run dev:infisical` | Dev with Infisical secrets |
| `bun run dev:agent` | Dev with Infisical Machine Identity (for agents) |
| `bun run build` | Vite build + copy instrument.server.mjs |
| `bun run check` | Biome lint + format check |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | Vitest via load-env-test (staging DB) |
| `bun run test src/features/customers/pages/customers-list-page.test.tsx` | Single test file |
| `bun run test:e2e` | Playwright E2E tests |
| `bun run format` | Biome format --write |

**Pre-commit pipeline**: `bun run check && bun run typecheck && bun run test`.

## Conventions observed

- Components: one per file, PascalCase filenames, named exports only.
- shadcn/ui primitives (`src/components/ui/`) are generated — never hand-edit.
- Imports: `#/` prefix for all internal imports; `import type` for type-only bindings.
- All icons from `lucide-react` — no other icon libraries.
- `Button asChild` when wrapping a `Link` (e.g. `<Button asChild><Link to="...">...</Link></Button>`).
- `useState` only for local UI state (toggle, modal open, submission error) — never for form field values.
- `cn()` utility from `src/lib/utils` for conditional class merging.
- Dark mode via `.dark` class on `<html>`, oklch color tokens in `src/styles.css`.
- App is installable as a PWA (standalone mode) — see `pabriq-app-v2-infra`.

## Anti-patterns to avoid

- No raw HTML form elements (`<input>`, `<select>`, `<textarea>`, `<button>`, `<table>`, `<dialog>`, `<label>`) — use shadcn/ui components.
- No `react-hook-form` or raw `useState` for form state — use `useAppForm`.
- No `useSearchParams` from React Router — use `nuqs`.
- No `window.confirm` — use `ConfirmDialog`.
- No hardcoded English strings in JSX — use `useTranslations()`.
- No `console.log` on user-facing pages.
- No emoji or non-Lucide icon libraries.
- No inline Zod schemas — use shared schemas from `#/lib/validation-schemas`.
- No full-page form routes — use `FormSheet` slide-out panels for create/edit.
- No manual overlay state management — use the global overlay system (`useGlobalModal`/`useGlobalSheet`).

## Gaps / verify

- `docs/agents/boilerplate/components.md` documents `PageActions` accepting `PageAction` with `label` as raw strings, but source shows labels passed as i18n keys from the route. Verify `PageActions` rendering — it appears to render labels directly without translation.
- `orgFilter` from `src/lib/rls.ts` is documented in the profile but unused in practice — source filters by `eq(table.orgId, orgId)` directly. Don't adopt `orgFilter`.
- The `@/*` alias exists alongside `#/` for shadcn/ui compatibility. Convention is `#/` for all authored code.
