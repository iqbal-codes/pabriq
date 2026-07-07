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
- **getReadyForProductionLabel**: From `src/features/production/ready-for-production-label.ts` — produces a localized "Ready for Production" label with the first production stage name. Used in activity timeline, modal wrappers, line-item cards, and portal components.
- **Deadline badge**: Filled-background urgency badges on Kanban cards — use the multi-tier color system (see Kanban deadline badges pattern below).

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

**Registry** (`src/components/app/global-modal/global-modal-registry.tsx`) maps string keys to lazy-loaded wrapper components:
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

**Wrapper pattern**: Each registry entry is a smart wrapper that resolves data dependencies (route context, query hooks, mutations) and passes clean props to the presentation component. This keeps presentation components pure and testable.

> from `src/components/app/global-modal/global-modal-registry.tsx`
```typescript
function TaskDetailModalWrapper({ open, onOpenChange, id }: GlobalOverlayProps) {
  const { openModal } = useGlobalModal()
  const ctx = useRouteContext({ from: '/_org' }) as { org: { id: string } }
  const canApprove = canApproveProductionTask('owner' as Role)
  if (!id) return null
  return (
    <TaskDetailModal
      open={open} onOpenChange={onOpenChange}
      taskId={id} orgId={ctx.org.id}
      canApprove={canApprove}
      onReview={(taskId) => openModal('review-task', taskId)}
    />
  )
}
```
Why: URL-driven overlays survive page navigation, enable deep-linking to open modals, and keep overlay state out of component trees. To add a new overlay, register it in `GLOBAL_MODALS` with a kebab-case key, create a wrapper that resolves data deps, and call `openModal('your-key')` from any component.

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

**Production activity i18n**: Activity descriptions in `src/features/production/components/activity-row.tsx` use the `production` namespace for activity-type keys (`activityAdvancementRequested`, `activityApproved`, `activityRejected`) and the `portal` namespace for timeline transition labels (`timelineTransition`, `timelineQueue`, `timelineQueued`, `timelineReadyForProduction`, `timelineReadyForProductionWithStage`, `timelineCompleted`). This is the established convention — production UI components pull from both `production` and `portal` namespaces.

### Kanban deadline badge styling

Kanban cards use filled-background badges with a multi-tier urgency color system (not text colors). The badge sits in the top-right of the card alongside priority indicators.

> from `src/features/production/components/kanban-task-card.tsx`
```typescript
function getDeadlineClasses(daysFromNow: number, showDeadlineOutcome: boolean): string {
  if (showDeadlineOutcome) {
    if (daysFromNow > 0) return 'bg-success text-white border-transparent'
    if (daysFromNow === 0) return 'bg-brand-accent text-white border-transparent'
    return 'bg-destructive text-white border-transparent'
  }
  // Overdue
  if (daysFromNow < 0) {
    return 'bg-destructive text-white border-transparent font-semibold animate-pulse'
  }
  // Today
  if (daysFromNow === 0) {
    return 'bg-destructive text-white border-transparent font-medium'
  }
  // Near deadline: 1-2 days
  if (daysFromNow <= 2) {
    return 'bg-orange-600 dark:bg-orange-500 text-white border-transparent'
  }
  // Mid deadline: 3-5 days
  if (daysFromNow <= 5) {
    return 'bg-amber-500 text-white border-transparent'
  }
  // Long time: > 5 days
  return 'bg-success text-white border-transparent'
}
```
Why: Filled backgrounds with white text provide high contrast and immediate urgency recognition. The tiers: destructive+pulse = overdue, destructive = today, orange = 1-2 days, amber = 3-5 days, success = 5+ days.

Card priority is indicated with a `variant="destructive"` badge and a subtle red background tint: `bg-red-50/70 border-red-200 dark:bg-red-950/20 dark:border-red-900/60`.

The pending-approval badge (`variant="warning"`) is positioned in the bottom row alongside quantity, not in the top badge row.

### Review modal as slide-in panel

The `ReviewModal` (`src/features/production/components/review-modal.tsx`) is a Dialog-based slide-in panel that shows task review details with approve/reject actions. It uses the `production` namespace for its own labels (`reviewAdvancement`, `reviewTaskLabel`, `reviewStageLabel`, `fulfilledRequirements`, `reviewNotes`, `commentPlaceholder`, `close`, `approve`, `reject`).

The wrapper in the global modal registry resolves stage names, requirements, and the "next stage" label (which uses `getReadyForProductionLabel` when the task is at the end of pre-production). All user-facing strings are i18n — no hardcoded English.

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

Used across multiple components to display a localized "Ready for Production" label with the first production stage name.

> from `src/features/production/ready-for-production-label.ts`
```typescript
export function getReadyForProductionLabel({
  firstProductionStageName, readyForProduction, readyForProductionWithStage,
}: {
  firstProductionStageName: string | undefined
  readyForProduction: string
  readyForProductionWithStage: (values: { stage: string }) => string
}): string {
  if (!firstProductionStageName) return readyForProduction
  return readyForProductionWithStage({ stage: firstProductionStageName })
}
```

Canonical usage sites:
- `src/features/production/components/activity-row.tsx` — timeline stage-transition descriptions
- `src/components/app/global-modal/global-modal-registry.tsx` — review-modal next-stage label
- `src/features/orders/components/order-line-items-card.tsx` — line-item production stage badge
- `src/features/portal/components/line-item-task-card.tsx` — portal line-item display

### `fieldValidator` helper

…
[See pattern catalog for full detail]

## Commands

- Run this domain's tests: `bun run test src/features` (Vitest via happy-dom)
- Dev server: `bun run dev`
- Typecheck: `bun run typecheck`
- Lint/format check: `bun run check`
- E2E tests: `bun run test:e2e`

## Conventions observed

- Components are PascalCase, one per file, co-located with `.test.tsx` when tested.
- Every user-visible string uses i18n — no hardcoded English in production components.
- Multiple i18n namespaces per component is normal (`production`, `portal`, `common`, `status`).
- `cn()` utility for conditional Tailwind classes; never raw template literals for class merging.
- shadcn/ui primitives in `src/components/ui/` are never hand-edited; always generate via CLI.
- Forms always go through `useAppForm` + `FormRoot` — never raw `useState`.
- Global overlays use the URL-driven registry pattern — never `useState` for cross-page modals.
- Deadlines and urgency use filled-background badges (`bg-* text-white border-transparent`), not text-only variants.
- The `@/*` alias exists alongside `#/` for shadcn/ui compatibility. Convention is `#/` for all authored code.

## Anti-patterns to avoid

- No default exports — the repo uses named exports everywhere.
- Never hardcode English strings in production components — use `useTranslations()`.
- Never use `useState` for cross-page modal/sheet state — use the global overlay system.
- Never build forms from raw `<input>` + `<label>` — use `useAppForm` + field components.
- Never hand-edit shadcn/ui primitives in `src/components/ui/`.
- Never use text-color-only deadline/urgency badges — use filled backgrounds for contrast.

## Gaps / verify

- `src/styles.css` defines the oklch theme tokens; the exact token values for `bg-success`, `bg-destructive`, `bg-brand-accent`, `bg-warning`, `bg-orange-600`, `bg-amber-500` should be verified against `src/styles.css` before adding new urgency tiers.
- `getReadyForProductionLabel` is also imported in `activity-row.tsx` and `global-modal-registry.tsx` — confirm the `portal` namespace keys (`timelineReadyForProduction`, `timelineReadyForProductionWithStage`) are the correct i18n source for production-board-related labels outside the portal feature.
- The `ReviewModal` is built as a shadcn `Dialog` with slide-in styling (not a `Sheet`); verify this is the intended pattern for review-type modals versus other overlay types.
