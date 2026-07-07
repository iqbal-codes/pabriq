# pabriq-app-v2 — UI Pattern Catalog

> Read `../pabriq-app-v2-foundation/references/codebase-profile.md` first for shared stack and architecture context.
> This file expands the `pabriq-app-v2-ui` skill with reusable patterns and boilerplate preferences.

## How to use this catalog

- Prefer these existing patterns before creating new abstractions.
- Copy from the canonical examples listed here.
- If docs and source disagree, follow the drift note and verify in live source before editing.

## Patterns

### List page with DataTable
- **Use when**: Any entity list view with search, filters, pagination, sorting, or row actions.
- **Prefer**: `DataTable` from `#/components/app/data-table` + `useListPageState` + `PageContent`/`PageHeader`.
- **Canonical examples**:
  - `src/features/customers/pages/customers-list-page.tsx` — full DataTable with filters, row actions, ConfirmDialog for delete.
- **Do**:
  - Use `useListPageState()` from `#/components/app/data-table` for standard pagination/sorting/search URL state.
  - Use `createDataTableLabels(dt)` to generate i18n-aware labels from the `dataTable` namespace.
  - Pass `tableId` for localStorage column visibility persistence.
  - Provide `emptyIcon`, `emptyTitle`, `emptyDescription`, `emptyAction` for the empty state.
  - Provide `noResultsTitle`, `noResultsDescription`, `noResultsAction` for filtered-empty state.
- **Avoid**:
  - Building raw `<table>` markup or wrapping TanStack Table manually.
  - Duplicating pagination/sorting state management — `useListPageState` handles it.

### Page shell (PageHeader + PageContent)
- **Use when**: Any workspace page (list, create, edit, detail).
- **Prefer**: `PageHeader` + `PageContent` from `#/components/app/page-shell/`.
- **Canonical examples**:
  - `src/components/app/page-shell/page-header.tsx` — header with back link, title, description, actions.
  - `src/components/app/page-shell/page-content.tsx` — centered content wrapper (max-w-6xl).
  - `src/components/app/page-shell/page-actions.tsx` — primary + secondary action buttons.
- **Do**:
  - Define `breadcrumb`, `pageTitle`, `primaryAction` in route `beforeLoad` for mobile header integration.
  - Use `PageHeader` for desktop heading with optional `backAction`, `primaryAction`, `secondaryActions`.
  - Use `mobileVisible` prop on detail pages where actions must be accessible on mobile.
  - Wrap page body in `<PageContent>`.
- **Avoid**:
  - Building page layout from scratch with raw `<div>` + `<h1>`.
  - Putting `PageHeader` inside `PageContent` (they're siblings).
  - Using `mobileVisible` on list pages (the mobile header reads from route context automatically).

### Mobile-responsive PageHeader
- **Use when**: Detail pages where header actions (approve, edit, delete) must be reachable on mobile.
- **Prefer**: `<PageHeader ... mobileVisible />` — renders header as `flex` on all breakpoints instead of `hidden md:flex`.
- **Canonical examples**:
  - `src/features/orders/pages/view-order-page.tsx:233-245` — order detail with `mobileVisible`, back link, primary + secondary actions.
- **Do**:
  - Set `mobileVisible` when the page is a detail/edit view with actionable header buttons.
  - Omit `mobileVisible` (default `false`) for list pages where the mobile header is handled by route context.
- **Avoid**:
  - Using `mobileVisible` on every page — list pages get their mobile header from `beforeLoad` metadata.

### Form creation with useAppForm
- **Use when**: Any form (create, edit, settings, onboarding).
- **Prefer**: `useAppForm` from `#/components/app/form` with `FormRoot`, `FormSection`, `FormGrid`, `FormActions`.
- **Canonical examples**:
  - `src/features/customers/components/customer-form-sheet.tsx` — form component inside a sheet with validators and mutations.
  - `src/components/app/form/form-context.tsx` — hook definition with all registered field components.
- **Do**:
  - Pass `validators: { onChange: schema, onSubmit: schema }` for Zod schema validation.
  - Wrap in `<FormRoot form={form}>` for form context.
  - Use `form.AppField` for each field with a render function: `{(field) => <field.TextField ... />}`.
  - Use `form.SubmitButton` for auto-disable during submission.
  - Use `FormActions` with `align="stacked"` inside sheets.
- **Avoid**:
  - `react-hook-form` or raw `useState` for form state.
  - Building forms from raw `<input>`, `<label>`, `<button>` elements.
  - Inline Zod schemas — use shared schemas from `#/lib/validation-schemas`.

### FormSheet slide-out panel (create / edit)
- **Use when**: Creating or editing entities from list/table views.
- **Prefer**: `FormSheet` from `#/components/app/form/form-sheet.tsx` wrapping the feature's form sheet component.
- **Canonical examples**:
  - `src/features/customers/components/customer-form-sheet.tsx` — handles create/edit modes, loading query, and save mutator.
  - `src/features/products/components/product-form-sheet.tsx` — product form variant.
  - `src/features/orders/components/order-form-sheet.tsx` — order form variant with array fields.
  - `src/routes/_org/customers/new.tsx` — route mounting list page with sheet type `create`.
  - `src/routes/_org/customers/$id/edit.tsx` — route mounting list page with sheet type `edit`.
- **Do**:
  - Model modes with discriminated union: `{ type: 'create' } | { type: 'edit'; id: string }`.
  - Control sheet visibility by mounting conditioned on the `sheet` parameter of the page component.
  - Use `navigate({ to: '/entities' })` on close or saved callbacks to return to the parent list.
  - Place `FormActions` at the bottom with `align="stacked"` and `border-t` separator.
- **Avoid**:
  - Routing to dedicated full pages for simple create/edit forms.
  - Overwriting search, filter, and pagination URL states when opening creation forms.

### Global overlay system (modals + sheets)
- **Use when**: Cross-page dialogs or sheets that must survive navigation and support deep-linking.
- **Prefer**: `useGlobalModal()` / `useGlobalSheet()` from `#/hooks/use-global-overlay` + registry in `#/components/app/global-modal/global-modal-registry.tsx`.
- **Canonical examples**:
  - `src/components/app/global-modal/global-modal-container.tsx` — centralized container mounted in `_org.tsx`.
  - `src/components/app/global-modal/global-modal-registry.tsx` — `GLOBAL_MODALS` registry mapping string keys to lazy-loaded wrapper components.
  - `src/hooks/use-global-overlay.ts` — `useGlobalModal()` and `useGlobalSheet()` hooks.
- **Do**:
  - Register new overlays in `GLOBAL_MODALS` with a kebab-case key and a wrapper component that resolves data dependencies.
  - Each wrapper uses `useRouteContext({ from: '/_org' })` for org-scoped data and query hooks for business data.
  - Call `openModal('invite-member')` or `openSheet('task-detail', taskId)` from any component.
  - The container renders the active overlay with `<Suspense>` and handles close via URL state.
  - Use `ModalComponentWrapper` pattern: accept `{ open, onOpenChange, id }` props, resolve data deps internally.
- **Avoid**:
  - Managing modal/sheet open state with `useState` in parent components for cross-page overlays.
  - Passing overlay components as children — use the registry pattern instead.
  - Directly mutating URL search params for overlay state — use the hooks.
  - Hardcoding org ID in wrapper components — always resolve from route context.

### DateField (calendar picker)
- **Use when**: Date selection in forms (single date or date range).
- **Prefer**: `DateField` from `#/components/app/form/date-field.tsx` via `form.AppField`.
- **Canonical examples**:
  - `src/components/app/form/date-field.tsx` — full implementation with calendar, presets, dropdowns.
  - `src/components/app/form/date-field.test.tsx` — test patterns.
- **Do**:
  - Use `mode="single"` (default) for one date, `mode="range"` for start/end range.
  - Use `enableDropdowns` (default `true`) for year/month navigation dropdowns.
  - Use `presets={true}` for built-in shortcuts or `presets={[{ label: 'Next Friday', value: nextFriday }]}` for custom.
  - Use `valueFormat="string"` (default) for `"YYYY-MM-DD"` strings or `valueFormat="date"` for `Date` objects.
  - Use `calendarProps` to pass through Calendar component props (e.g. `numberOfMonths`).
- **Avoid**:
  - Building custom date pickers with raw `<input type="date">`.
  - Using `valueFormat="date"` unless the backend or downstream logic specifically needs `Date` objects.

### Array fields (dynamic lists)
- **Use when**: Forms with repeatable field groups (line items, addresses, tags).
- **Prefer**: `form.AppField` with `mode="array"` and indexed field names.
- **Canonical examples**:
  - `src/routes/_org/orders/new.tsx` — order line items with product, quantity, price fields.
  - `docs/agents/boilerplate/form-system.md` — array field pattern documentation.
- **Do**:
  - Use `itemsField.pushValue(defaultItem)` to add new items.
  - Use `itemsField.removeValue(index)` to remove items.
  - Reference sub-fields with indexed names: `items[${i}].fieldName`.
- **Avoid**:
  - Managing array state with `useState` and manual spread operations.
  - Using `field.value.map()` without a stable `key`.

### withForm (reusable field groups)
- **Use when**: Extracting repeated field groups into reusable components shared across forms.
- **Prefer**: `withForm` from `#/components/app/form`.
- **Canonical examples**:
  - `docs/agents/boilerplate/form-system.md` — `withForm` pattern documentation.
- **Do**:
  - Define `defaultValues` and a `render` function that uses `form.AppField`.
  - Pass the form instance from the parent via props.
- **Avoid**:
  - Duplicating field layouts across multiple form pages.

### URL search params with nuqs
- **Use when**: Any page needs search, filter, pagination, or sort state in the URL.
- **Prefer**: `useQueryState` from `nuqs` with `parseAsString`, `parseAsInteger`, etc.
- **Canonical examples**:
  - `src/routes/_org/customers/index.tsx` — route with `validateSearch` + `useQueryState` for status filter.
  - `src/features/customers/pages/customers-list-page.tsx` — `useListPageState()` for standard list params.
- **Do**:
  - Use `useListPageState()` from `#/components/app/data-table` for list pages with standard pagination/sort/search.
  - Use `useQueryState('key', parseAsString.withDefault(''))` for custom filter params.
- **Avoid**:
  - `useSearchParams` from React Router.
  - Manual `window.location.search` parsing.
  - `useState` for state that should be URL-persisted.

### Route metadata via beforeLoad
- **Use when**: Any `_org` route needs breadcrumbs, page title, or header actions.
- **Prefer**: `beforeLoad` returning `{ breadcrumb, pageTitle, primaryAction?, parentBreadcrumbs? }`.
- **Canonical examples**:
  - `src/routes/_org/customers/index.tsx` — list route with breadcrumb + primary action.
  - `src/routes/_org/orders/new.tsx` — create route with parent breadcrumb.
- **Do**:
  - Use i18n keys (not raw strings) for `breadcrumb` and `pageTitle`.
  - Add `parentBreadcrumbs` for nested routes.
- **Avoid**:
  - Hardcoded English strings in `breadcrumb` or `pageTitle`.
  - Setting page title outside `beforeLoad`.

### ConfirmDialog for destructive actions
- **Use when**: Delete, archive, or any destructive action requiring user confirmation.
- **Prefer**: `ConfirmDialog` from `#/components/confirm-dialog`.
- **Canonical examples**:
  - `src/features/customers/pages/customers-list-page.tsx:262-270` — delete confirmation with `variant="destructive"`.
- **Do**:
  - Control with `open`/`onOpenChange` state.
  - Use `variant="destructive"` for delete actions.
  - Provide i18n keys for `title`, `description`, `confirmLabel`.
- **Avoid**:
  - `window.confirm()` or `window.alert()`.
  - Building custom modal for simple confirmations.

### StatusBadge for entity status
- **Use when**: Displaying entity status (active, pending, completed, etc.).
- **Prefer**: `StatusBadge` from `#/components/status-badge`.
- **Canonical examples**:
  - `src/features/customers/pages/customers-list-page.tsx` — status column in DataTable.
- **Do**:
  - Pass the status string — `StatusBadge` handles variant mapping and i18n via `useTranslations('status')`.
- **Avoid**:
  - Custom status styling or inline badge logic.

### DataTable filters
- **Use when**: List pages need structured filtering beyond search (status chips, date ranges, combobox).
- **Prefer**: `DataTableFiltersConfig` with typed `FilterDefinition` entries.
- **Canonical examples**:
  - `src/features/customers/pages/customers-list-page.tsx:98-116` — radio-chips filter with onApply/onClear.
- **Do**:
  - Define `definitions` array with `id`, `label`, `type` (`radio-chips`, `combobox-single`, `combobox-multi`, `date-range`).
  - Wire `values` and `onApply`/`onClear` to `useQueryState` or `useListPageState`.
  - Use `hasActiveFilters` + `onClearFilters` props on `DataTable` for the clear-all button.
- **Avoid**:
  - Building custom filter UI outside the DataTable filter system.

### Extracted page sections (detail pages)
- **Use when**: Complex detail pages with multiple domain sections (order details, line items, invoices, timeline).
- **Prefer**: Extract each section into a standalone component under `src/features/*/components/`.
- **Canonical examples**:
  - `src/features/orders/components/order-detail-section.tsx` — customer info, shipping, payment summary.
  - `src/features/orders/components/order-line-items-card.tsx` — line items with deadlines, production stage, assets.
  - `src/features/orders/components/order-invoices-section.tsx` — invoice list with expand/collapse, payment info.
- **Do**:
  - Each section owns its own i18n namespaces, data formatting, and layout.
  - Pass only the data the section needs — no leaking parent state.
  - Use `className` prop for layout overrides from the parent.
  - Compose sections in the page with `space-y-6` gap.
- **Avoid**:
  - Monolithic detail pages that render everything inline.
  - Passing entire parent component state as props to sections.

### `getReadyForProductionLabel` for production stage display
- **Use when**: Displaying "Ready for Production" with the first production stage name in any timeline, modal, or line-item context.
- **Prefer**: `getReadyForProductionLabel` from `#/features/production/ready-for-production-label`.
- **Canonical examples**:
  - `src/features/production/components/activity-row.tsx` — timeline stage-transition descriptions when task completes last pre-production stage.
  - `src/components/app/global-modal/global-modal-registry.tsx` — review-modal next-stage label for pre-production tasks.
  - `src/features/orders/components/order-line-items-card.tsx` — production stage badge in line item rows.
  - `src/features/portal/components/line-item-task-card.tsx` — portal line-item display.
- **Do**:
  - Pass `firstProductionStageName` (look up from active stages where `s.active && s.board === 'production'`), `readyForProduction` (i18n key value), and `readyForProductionWithStage` (i18n key with `{stage}` placeholder).
  - When `firstProductionStageName` is undefined, falls back to `readyForProduction`.
  - Use the `portal` namespace keys `timelineReadyForProduction` and `timelineReadyForProductionWithStage` for production-board labels.
- **Avoid**:
  - Hardcoding stage name logic in component render — use the utility.
  - Duplicating the fallback logic across components.

### Deadline badge urgency colors (filled backgrounds)
- **Use when**: Displaying deadline urgency on kanban cards or task badges.
- **Prefer**: Filled-background badges with `bg-* text-white border-transparent` — not text-only color variants.
- **Canonical examples**:
  - `src/features/production/components/kanban-task-card.tsx` — `getDeadlineClasses()` function with multi-tier urgency system.
  - `src/features/production/components/kanban-task-card.test.tsx` — tests asserting `bg-success`, `bg-brand-accent`, `bg-destructive` classes.
- **Do**:
  - Use the multi-tier urgency system for deadline badges:
    - Overdue (`daysFromNow < 0`): `bg-destructive text-white border-transparent font-semibold animate-pulse`
    - Today (`daysFromNow === 0`): `bg-destructive text-white border-transparent font-medium`
    - Near deadline (1-2 days): `bg-orange-600 dark:bg-orange-500 text-white border-transparent`
    - Mid deadline (3-5 days): `bg-amber-500 text-white border-transparent`
    - Long time (5+ days): `bg-success text-white border-transparent`
  - For outcome mode (`showDeadlineOutcome`): `bg-success` (early), `bg-brand-accent` (on time), `bg-destructive` (late).
  - Place deadline badge in the top-right card area alongside priority badge.
  - Use `variant="destructive"` for priority badges, `variant="warning"` for pending-approval badges.
- **Avoid**:
  - `text-success`, `text-destructive`, `text-brand-accent` on badge text — use filled backgrounds.
  - Putting deadline badges in the bottom row — they belong in the top badge row.
  - Using `border-current` on deadline badges — use `border-transparent`.

### Production activity timeline i18n
- **Use when**: Building activity/timeline descriptions that reference stage transitions, board transitions, or review actions.
- **Prefer**: Use `production` namespace for activity-type labels and `portal` namespace for timeline transition templates.
- **Canonical examples**:
  - `src/features/production/components/activity-row.tsx` — the canonical implementation of activity description rendering.
- **Do**:
  - Use `production` namespace keys for activity type labels: `activityAdvancementRequested`, `activityApproved`, `activityRejected`.
  - Use `portal` namespace keys for timeline formatting: `timelineTransition` (`{from} Completed -> {to}`), `timelineQueue`, `timelineQueued`, `timelineReadyForProduction`, `timelineReadyForProductionWithStage`, `timelineCompleted`.
  - Format `from` labels using `fromName ?? pt('timelineQueue')` as the default.
  - For board transitions, derive the board label from `data.fromBoard` — map `'pre_production'` to `pt('timelineReadyForProduction')`.
  - Use `getReadyForProductionLabel` when a stage-transition completes the last pre-production stage (`data.readyForProduction` flag).
- **Avoid**:
  - Hardcoded English strings for any activity description.
  - Using only the `production` namespace for timeline transition templates — the `portal` namespace owns those keys.
  - Duplicating the "Ready for Production" label logic — use `getReadyForProductionLabel`.

### i18n in tests
- **Use when**: Any test rendering a component that uses `useTranslations()`.
- **Prefer**: Wrap in `IntlProvider` with test messages object.
- **Canonical examples**:
  - `src/components/status-badge.test.tsx:25` — test wrapping pattern.
  - `src/components/confirm-dialog.test.tsx:15` — minimal test messages.
  - `src/features/production/components/review-modal.test.tsx` — production + portal namespace test messages.
  - `src/features/production/components/task-detail-modal.test.tsx` — portal timeline namespace test messages.
- **Do**:
  - Include all namespaces the component tree uses (e.g. `status`, `common`, `customers`, `production`, `portal`).
  - Use `StatusBadge` → always include `status` namespace in test messages.
  - When testing components that render `ActivityRow` or timeline elements, include the `portal` namespace in test messages.
- **Avoid**:
  - Forgetting nested component namespaces — `StatusBadge` inside a page needs `status` messages even if the test only targets the page.
