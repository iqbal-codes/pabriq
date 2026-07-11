---
name: pabriq-app-ui
description: "Compose React UI pages, forms, data tables, URL overlays, and responsive layouts for Pabriq. Use when building new pages, adding forms with validation, creating list views with data tables, wiring global modals/sheets via URL state, or adapting components for mobile."
---

# Pabriq App UI Composition

Build UI by composing the established app-layer primitives from `src/components/app/` on top of the `src/components/ui/` shadcn base. Every page assembles a shell, localization, and content from these building blocks — never from raw UI primitives alone.

## Scope and ownership

Covers: page composition (shell, header, content, breadcrumbs), form wiring (TanStack Form + Zod + field registry), data table list views (TanStack Table + nuqs URL state), URL-driven overlays (global modal/sheet), responsive dual-view (desktop table + mobile card), and localized states (empty, error, loading, skeleton).

Excludes: domain state transitions, server-function internals, database schemas, workflow orchestration, and upload state-machine internals (these live in their respective feature modules).

## Shared conventions

These rules apply to every branch below. Each is classified.

- **(Observed)** Design tokens: navy/teal oklch, `radius: 0`, Inter Variable font, `text-xs`, `h-8` inputs/buttons. Tailwind v4 + shadcn. Dark mode via `.dark` class. Source: `src/styles.css`.
- **(Observed)** Localization: `use-intl` with `en` + `id` locales, default `'id'`. Call `useTranslations('sectionKey')` at component top; never hardcode user-facing strings. DataTable labels use the `createDataTableLabels` factory from `src/components/app/data-table/create-data-table-labels.ts`. Source: `src/messages/index.ts`.
- **(Observed)** Responsive breakpoint: `md:` (768px). Use `useIsMobile()` from `#/hooks/use-mobile` for JS-side branching. Desktop renders tables; mobile renders card lists. Source: `src/components/app/data-table/data-table-mobile-view.tsx`.
- **(Observed)** Accessibility: `aria-label` on icon-only buttons; `role="alert"` on errors; `aria-invalid` via `data-invalid` attribute on form fields; `aria-busy` + `aria-live="polite"` on route transitions; `role="group"` / `role="status"` on status containers; keyboard navigation on kanban cards. Source: `src/components/app/route-pending-overlay.tsx`, `src/components/app/form/text-input-field-shell.tsx`.
- **(Observed)** Observable state: loading → skeleton, error → retry alert, empty → `EmptyState`, data → table/cards. Every list page and form sheet must handle all four. Source: `src/components/app/data-table/data-table-state-render.tsx`.

## Branches

### 1. Pages — Shell and layout

Compose every page from `PageHeader` + `PageContent`. Add `PageActions` (primary + secondary) when the page has actions. Use `EmptyState` when data is absent.

```tsx
import { PageContent } from '#/components/app/page-shell/page-content'
import { PageHeader } from '#/components/app/page-shell/page-header'
```

`PageHeader` props: `title`, `description?`, `backAction?`, `primaryAction?`, `secondaryActions?`, `mobileVisible?`. Actions use `PageAction` type from `src/components/app/page-shell/page-shell-types.ts` — `label`, `href?`, `onClick?`, `icon?`, `isLoading?`, `disabled?`.

`PageContent` wraps `<main>` with `max-w-6xl`, responsive padding, and `space-y-6`.

Completion criterion: every page renders `PageHeader` with translated title, `PageContent` wrapping children, and all four data states (loading/error/empty/data) handled.

### 2. Forms — Validation and field composition

When creating or changing a form, read [`references/forms.md`](references/forms.md) before choosing components or validation flow. The reference covers `useAppForm`, Zod schema wiring, field registry, layout primitives, and the ordered construction recipe.

### 3. Data tables — List views with filtering

When creating or changing a list view with a data table, read [`references/data-tables.md`](references/data-tables.md) before choosing columns, filters, or URL state wiring. The reference covers `useListPageState`, `DataTable`, column definitions, filter definitions, and the ordered construction recipe.

### 4. URL overlays — Global modals and sheets

Overlays (modals and sheets) are URL-driven via `nuqs` query parameters. Two hooks power them:

- `useGlobalModal()` — `openModal(name, id?)`, `closeModal()`, `modal`, `modalId`, `isOpen`. Params: `?modal=<name>&modalId=<id>`.
- `useGlobalSheet()` — same API, params: `?sheet=<name>&sheetId=<id>`.

Source: `src/hooks/use-global-overlay.ts`.

To register a new overlay:
1. Add a lazy-loaded wrapper to `GLOBAL_MODALS` in `src/components/app/global-modal/global-modal-registry.tsx`.
2. Wrapper receives `{ open, onOpenChange, id }` (`GlobalOverlayProps`).
3. `GlobalModalContainer` (`src/components/app/global-modal/global-modal-container.tsx`) renders it with exit-animation preservation.

Open from any page component:

```tsx
const { openModal } = useGlobalModal()
openModal('stageForm', stageId)
```

**(Observed)** Existing overlays: `inviteMember`, `paymentMethodForm`, `recordPayment`, `stageForm`, `taskDetailModal`, `reviewModal`.

Completion criterion: new overlay registered in `GLOBAL_MODALS`, lazy-loaded, receives `open`/`onOpenChange`/`id`, and opens via URL query params.

### 5. Localized responsive states

Every page or list view must handle four observable states:

| State | Desktop | Mobile |
|-------|---------|--------|
| Loading | `<DataTableDesktopSkeleton>` or `<Spinner>` | `<DataTableMobileSkeleton>` |
| Error | `FormError` with retry button | Same |
| Empty | `EmptyState` with icon + action | Same |
| Data | `<DataTable>` with columns | `<DataTableMobileView>` with card roles |

Skeletons: `src/components/app/data-table/data-table-skeleton.tsx`. Empty state: `src/components/app/page-shell/empty-state.tsx`. Error display: `src/components/app/form/form-error.tsx` (Alert destructive + AlertCircle icon).

**(Observed)** Mobile cards use `mobileRole` on column meta (`title`, `description`, `badge`, `meta`). Source: `src/components/app/data-table/data-table-mobile-card.tsx`.

Completion criterion: all four states render correctly on both desktop and mobile; no state is missing for any branch.

<!-- CODEBASE-SKILL-FORGE:HUMAN:START -->
<!-- Add intentional project policy here. Sync preserves this region byte-for-byte. -->
<!-- CODEBASE-SKILL-FORGE:HUMAN:END -->
