# Implementation Plan: Fix React Doctor Issues (67/100 → target 85+)

## Goal
Fix 457 React Doctor issues across 144 files in the pabriq-app-v2 project, raising the score from 67/100 to 85+ by addressing dead code, performance bottlenecks, React 19 migration gaps, hydration mismatches, and architectural debt.

---

## Execution Strategy

Tasks are ordered by **file groups** to avoid concurrent workers editing the same file. Each batch touches disjoint file sets and can run in parallel workers. After each batch, a reviewer checks the work before the next batch begins.

---

## Batch 0: Safe Setup Tasks (no code changes needed)

### Task 0.1 — Pin exact versions in package.json
- **File:** `package.json`
- **Changes:** 
  - Update `better-auth` from `^1.5.3` to `^1.5.5` (latest)
  - Update `drizzle-orm` from `^0.45.1` to `^0.45.2` (**critical: SQL injection fix**)
  - Update `@tanstack/react-form` from `latest` to explicit `^1.2.0`
  - Update `@tanstack/react-query` from `latest` to explicit `^1.2.0`
  - Update `@tanstack/react-router` from `latest` to explicit `^1.2.0`
  - Update `@tanstack/react-start` from `latest` to explicit `^1.2.0`
- **Acceptance:** `bun install` succeeds, `bun run check` passes

### Task 0.2 — Add React Compiler config (optional but recommended)
- **File:** `app.config.ts`
- **Changes:** Add `babel.plugins: [['babel-plugin-react-compiler', {}]]` if TanStack Start supports it, or add note. If not supported, skip.
- **Acceptance:** Build succeeds or skipped

---

## Batch 1: Mechanical Find-Replace Fixes (0 conflicts, all disjoint files)

### Task 1.1 — `w-N h-N` → `size-N` (54 occurrences)
- **Affected files (54 locations):**
  - `src/features/invoices/pages/invoice-detail-page.tsx` — lines 394, 469, 481, 489, 514, 523
  - `src/features/invoices/pages/create-invoice-page.tsx` — lines 226, 238, 386, 402
  - `src/features/invoices/pages/invoice-list-page.tsx` — line 143
  - `src/features/orders/pages/view-order-page.tsx` — lines 387, 427
  - `src/features/orders/pages/create-order-page.tsx` — lines 165, 172
  - `src/features/portal/components/payment-section.tsx` — lines 38, 60, 150, 152, 166
  - `src/features/portal/components/order-timeline.tsx` — line 92
  - `src/features/portal/components/shipping-address-card.tsx` — line 17
  - `src/features/portal/components/customer-info-card.tsx` — line 41
  - `src/features/portal/pages/progress-view.tsx` — lines 121, 138
  - `src/features/portal/pages/pending-view.tsx` — lines 24, 37
  - `src/features/portal/pages/rejected-view.tsx` — line 25
  - `src/features/members/pages/members-page.tsx` — lines 127, 168, 277, 310
  - `src/features/members/pages/accept-invitation-page.tsx` — lines 108, 117
  - `src/features/products/components/product-form-fields.tsx` — lines 121, 162
  - `src/features/invoices/components/create-invoice-modal.tsx` — lines 160, 171
  - `src/features/production/components/stage-form.tsx` — line 231
  - `src/components/nav-user.tsx` — lines 50, 71
  - `src/components/ui/navigation-menu.tsx` — line 153
  - `src/components/ui/menubar.tsx` — line 238
  - `src/components/ui/chart.tsx` — line 314
  - `src/components/app/asset-image.tsx` — line 57
  - `src/components/app/asset-upload/file-list-upload.tsx` — line 153
  - `src/components/app/asset-upload/asset-upload-dropzone.tsx` — lines 22, 24, 27, 29, 70, 75, 130
  - `src/components/customized/breadcrumb/breadcrumb-05.tsx` — line 17
- **Changes:** Each `w-X h-X` where X is same value → `size-X`
- **Pattern:** `w-(\d+) h-(\1)` → `size-$1`
- **Acceptance:** All 54 occurrences replaced, build passes

### Task 1.2 — `px-N py-N` → `p-N` (3 occurrences)
- **Affected files:**
  - `src/components/app/form/area-search-field.tsx` — line 117
  - `src/features/portal/pages/progress-view.tsx` — line 99
  - `src/features/portal/pages/draft-view.tsx` — line 107
- **Changes:** `px-X py-X` → `p-X` when both values match
- **Acceptance:** All 3 occurrences replaced, build passes

### Task 1.3 — `[...array].sort()` → `array.toSorted()` (1 occurrence)
- **File:** `src/features/pricing/engine.ts` — line 61
- **Changes:** 
  ```ts
  // Before:
  const sorted = [...input.breakpoints].sort((a, b) => a.minQuantity - b.minQuantity)
  // After:
  const sorted = input.breakpoints.toSorted((a, b) => a.minQuantity - b.minQuantity)
  ```
- **Acceptance:** Build passes

### Task 1.4 — Em dash in JSX text (1 occurrence)
- **File:** `src/features/orders/pages/view-order-page.tsx` — line 407
- **Changes:** Replace `—` (em dash) with `:` or `,` depending on context
- **Acceptance:** Build passes

### Task 1.5 — No array index as key (4 occurrences)
- **Affected files:**
  - `src/components/ui/slider.tsx` — line 53 (but unused file, skip)
  - `src/features/invoices/pages/create-invoice-page.tsx` — line 360
  - `src/features/products/pages/view-product-page.tsx` — line 144
  - `src/features/products/components/product-form-fields.tsx` — line 132
- **Changes:** Replace `key={index}` with stable `key={item.id}` or similar unique field
- **Acceptance:** Build passes

### Task 1.6 — `.filter().map()` → single pass (10 occurrences)
- **Affected files + changes:**

  **a) `src/components/app/form/file-upload-field.tsx` — line 133-136**
  ```ts
  // Before:
  return [...assetIds].reverse()
    .map((assetId) => assetsById.get(assetId))
    .filter((asset): asset is AssetMetadata => asset !== undefined)
  // After:
  const result: AssetMetadata[] = []
  for (let i = assetIds.length - 1; i >= 0; i--) {
    const asset = assetsById.get(assetIds[i])
    if (asset) result.push(asset)
  }
  return result
  ```

  **b) `src/components/app/avatar-photo.tsx` — line 14**
  → Use `.flatMap()` to transform and filter in a single pass

  **c) `src/components/ui/chart.tsx` — lines 83, 198-200, 297-299**
  Each `.filter().map()` is in a different render path. Use `.reduce()` or pre-compute in a `useMemo`.

  **d) `src/features/orders/components/order-form-fields.tsx` — line 72**
  **e) `src/components/app/data-table/data-table-mobile-card.tsx` — line 84**
  **f) `src/features/portal/components/order-timeline.tsx` — lines 84-87, 100-102**
  → Combine `.filter().flatMap()` or `.filter().map()` into single `.reduce()` or single `.flatMap()`

  **g) `.sandcastle/main.ts` — line 190** (dead code, skip)
- **Acceptance:** All changed files build, functionality preserved

### Task 1.7 — `.map().filter(Boolean)` → `.flatMap()` (1 occurrence)
- **File:** `src/components/app/avatar-photo.tsx` — line 14
- **Changes:** Combine into single `.flatMap()` pass
- **Acceptance:** Build passes

### Task 1.8 — Property access hoisting (1 occurrence)
- **File:** `src/features/portal/model.ts` — line 752
- **Changes:** Hoist `task.context.productName` into `const { productName } = task.context` at top of loop
- **Acceptance:** Build passes

### Task 1.9 — `no-many-boolean-props` — DataTable (1 component)
- **File:** `src/components/app/data-table/data-table.tsx` — line 99+
- **Changes:** Reduce 4+ boolean props. This is a refactor. For now, accept this warning and defer to Task 6.1.
- **Acceptance:** Deferred to architecture batch

### Task 1.10 — Vague button label "Submit" → named action (1 occurrence)
- **File:** `src/components/app/form/form.test.tsx` — line 207
- **Changes:** Replace `"Submit"` button label with `"Save"` or specific action name
- **Acceptance:** Tests pass

---

## Batch 2: Performance Fixes — Sequential Await & Loop Optimizations

These all touch `server.ts` files in feature modules (disjoint files, run in parallel).

### Task 2.1 — `server-sequential-independent-await` in invoices (up to 8 occurrences)
- **File:** `src/features/invoices/server.ts` — lines 89, 97, 105, 143, 313, 321, 346
- **Changes:** Wrap independent awaits in `Promise.all([])`
- **Acceptance:** All invoice server functions work correctly, no regressions

### Task 2.2 — `server-sequential-independent-await` in products (4 occurrences)
- **File:** `src/features/products/server.ts` — lines 118, 133, 160, 184, 198
- **Changes:** Wrap independent awaits in `Promise.all([])`
- **Acceptance:** All product server functions work correctly

### Task 2.3 — `server-sequential-independent-await` in production (8 occurrences)
- **File:** `src/features/production/server.ts` — lines 53, 156, 230, 263, 279, 301, 314, 322, 339
- **Changes:** Wrap independent awaits in `Promise.all([])`
- **Acceptance:** All production server functions work correctly

### Task 2.4 — `server-sequential-independent-await` in members (5 occurrences)
- **File:** `src/features/members/server.ts` — lines 52, 82, 107, 135, 158
- **Changes:** Wrap independent awaits in `Promise.all([])`
- **Acceptance:** All members server functions work correctly

### Task 2.5 — `server-sequential-independent-await` in settings (3 occurrences)
- **File:** `src/features/settings/server.ts` — lines 38, 101, 133
- **Changes:** Wrap independent awaits in `Promise.all([])`
- **Acceptance:** All settings server functions work correctly

### Task 2.6 — `server-sequential-independent-await` in portal (1 occurrence)
- **File:** `src/features/portal/server.ts` — line 157
- **Changes:** Wrap independent awaits in `Promise.all([])`
- **Acceptance:** Portal server function works correctly

### Task 2.7 — `server-sequential-independent-await` in orders (2 occurrences)
- **File:** `src/features/orders/server.ts` — lines 54, 73
- **Changes:** Wrap independent awaits in `Promise.all([])`
- **Acceptance:** Orders server function works correctly

### Task 2.8 — `async-parallel` on client side (12 occurrences)
- **Affected files:**
  - `src/routes/onboarding.tsx` — line 98
  - `src/features/assets/server.ts` — lines 105, 282
  - `src/features/products/server.ts` — lines 159, 183
  - `src/features/auth/org.ts` — line 77
  - `src/features/settings/server.ts` — line 151
  - `src/features/orders/server.ts` — lines 97, 215
  - `src/components/nav-user.tsx` — line 86
  - `src/components/app/asset-upload/r2-adapter.ts` — line 64
  - `src/components/app/asset-upload/r2-portal-adapter.ts` — line 63
  - `src/features/invoices/model.test.ts` — line 233
  - `src/features/assets/model.ts` — line 191
  - `src/features/production/model.test.ts` — line 144
- **Changes:** Combine sequential awaits into `Promise.all()`
- **Acceptance:** All changed files build and pass tests

### Task 2.9 — `async-await-in-loop` (9 occurrences)
- **Affected files:**
  - `.sandcastle/main.ts` — lines 73 (dead code, skip)
  - `src/features/auth/org.ts` — line 77
  - `src/features/orders/model.ts` — lines 358, 468, 503
  - `src/features/production/spawner.ts` — lines 37, 99
  - `src/features/production/model.ts` — line 176
  - `src/features/portal/pages/draft-view.tsx` — line 77
- **Changes:** Collect promises into array and use `await Promise.all(items.map(...))`
- **Acceptance:** All changed files build and pass tests

### Task 2.10 — `array.includes()` in loop → Set (5 occurrences)
- **Affected files:**
  - `src/features/assets/server.test.ts` — lines 17, 32, 47
  - `src/features/auth/org.ts` — line 97
  - `src/features/permissions/model.test.ts` — line 21
- **Changes:** Convert array to `Set` before loop for O(1) lookups
- **Acceptance:** Tests pass

### Task 2.11 — `array.find()` in loop → Map (4 occurrences)
- **File:** `src/features/portal/model.ts` — lines 745, 778, 819
- **File:** `src/features/portal/pages/draft-view.tsx` — line 72
- **Changes:** Build a `Map` once before the loop
- **Acceptance:** Portal views work correctly

---

## Batch 3: React 19 Migration

### Task 3.1 — `useContext` → `use()` from React (9 occurrences)
- **Affected files:**
  - `src/components/ui/carousel.tsx` — line 36 (**unused file, skip**)
  - `src/components/ui/form.tsx` — lines 44, 45 (**unused file, skip**)
  - `src/components/ui/sidebar.tsx` — line 46
  - `src/components/ui/toggle-group.tsx` — line 59 (**unused file, skip**)
  - `src/components/ui/chart.tsx` — line 31
  - `src/components/ui/input-otp.tsx` — line 46 (**unused file, skip**)
  - `src/components/app/form/form-layout.tsx` — line 1
  - `src/components/app/data-table/data-table-context.tsx` — line 4
- **Changes:** 
  - Replace `import { useContext } from 'react'` with `import { use } from 'react'`
  - Replace `useContext(ContextName)` with `use(ContextName)`
  - Note: `use()` works inside branches and conditionals in React 19
- **Acceptance:** Build passes, all context consumers work correctly

### Task 3.2 — `forwardRef` migration (look for remaining forwardRef usages)
- **Affected files:** Search for `forwardRef` in src/
- **Changes:** Replace `forwardRef` with direct `ref` prop on function components
- **Acceptance:** Build passes

---

## Batch 4: Hydration Fixes

### Task 4.1 — `new Date()` in JSX → client-only rendering (15 occurrences)
- **Affected files:**
  - `src/features/invoices/pages/invoice-detail-page.tsx` — lines 457 (4x)
  - `src/features/production/pages/archived-tasks-page.tsx` — line 86
  - `src/features/portal/components/order-timeline.tsx` — lines 129-130 (4x)
  - `src/features/members/pages/members-page.tsx` — line 196
  - `src/features/portal/pages/progress-view.tsx` — lines 141
  - `src/features/production/components/stage-form.tsx` — lines 159
  - `src/features/portal/components/payment-section.tsx` — line 45
- **Changes:**
  ```tsx
  // Before:
  <div>{new Date().toLocaleDateString()}</div>
  // After:
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => { setNow(new Date()) }, [])
  // ... render: {now?.toLocaleDateString()}
  ```
- **Alternative pattern (simpler):** Use `suppressHydrationWarning` on the parent element if the value is cosmetic (e.g. "Generated just now")
- **Acceptance:** Builds pass, no hydration mismatch warnings in console

### Task 4.2 — `useEffect(setState, [])` flash → `useSyncExternalStore` (1 occurrence)
- **File:** `src/features/portal/components/payment-section.tsx` — line 27
- **Changes:**
  ```tsx
  // Before:
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  // After:
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  ```
- **Acceptance:** Build passes, no flicker on hydration

---

## Batch 5: Mutation Cache Invalidation & Dynamic Imports

### Task 5.1 — `query-mutation-missing-invalidation` in production hooks (8 occurrences)
- **File:** `src/features/production/hooks.ts` — lines 41, 57, 73, 84, 99 (and more)
- **File:** `src/features/portal/hooks.ts` — lines 89, 101
- **File:** `src/features/members/pages/accept-invitation-page.tsx` — line 49
- **Changes:** Add `onSuccess: () => queryClient.invalidateQueries({ queryKey: [...] })` to each `useMutation` that lacks cache invalidation
- **Acceptance:** Mutations invalidate stale cache, tests pass

### Task 5.2 — Prefer dynamic import for heavy libraries (5 occurrences)
- **Affected files:**
  - `src/components/ui/chart.tsx` — imports `recharts` (lines 2-3)
  - `src/features/documents/server.tsx` — imports `@react-pdf/renderer` (line 1)
  - `src/features/documents/templates/invoice.tsx` — same
  - `src/features/documents/templates/quotation.tsx` — same
- **Changes:**
  - For `chart.tsx`: Wrap the chart component in `React.lazy(() => import('./ChartHeavy'))` or dynamic import at usage site
  - For PDF templates: Already dynamically imported via `await import()` in server functions — **react-doctor false positive for server.tsx**. Verify and add comment.
  - For invoice.tsx/quotation.tsx: These are rendered server-side via `@react-pdf/renderer`, so dynamic import doesn't help. **Add comment suppression**.
- **Acceptance:** Bundle split verified, no regressions

---

## Batch 6: Architecture — Giant Components & Dead Code

### Task 6.1 — Break down DataTable (866 lines → ~600 lines)
- **File:** `src/components/app/data-table/data-table.tsx`
- **Changes:**
  1. Extract mobile accumulation logic into `useDataTableAccumulation` hook
  2. Extract the table rendering into `DataTableDesktopView` sub-component
  3. Extract mobile card list into `DataTableMobileView` sub-component
  4. Extract loading skeletons into `DataTableSkeleton` sub-component
- **New files:**
  - `src/components/app/data-table/use-data-table-accumulation.ts` — hook for mobile data accumulation logic
  - `src/components/app/data-table/data-table-desktop-view.tsx` — desktop table rendering
  - `src/components/app/data-table/data-table-mobile-view.tsx` — mobile card list
  - `src/components/app/data-table/data-table-skeleton.tsx` — skeleton states
- **Acceptance:** DataTable works identically, all tests pass, component < 300 lines

### Task 6.2 — Break down InvoiceDetailPage (304 lines)
- **File:** `src/features/invoices/pages/invoice-detail-page.tsx`
- **Changes:** Extract sections:
  - Invoice header (status, dates, amounts)
  - Customer info card
  - Invoice items table
  - Payment timeline
  - Action buttons
- **Acceptance:** Page works identically, each extracted component < 150 lines

### Task 6.3 — Break down ViewOrderPage
- **File:** `src/features/orders/pages/view-order-page.tsx`
- **Changes:** Same pattern — extract order header, items, timeline, actions
- **Acceptance:** Page works identically

### Task 6.4 — Break down MembersPage
- **File:** `src/features/members/pages/members-page.tsx`
- **Changes:** Extract member list, invitations, filters into sub-components
- **Acceptance:** Page works identically

### Task 6.5 — Remove dead code (30+ unused UI component files)
- **Files to delete** (all confirmed unused by knip):
  - `src/components/ui/accordion.tsx`
  - `src/components/ui/aspect-ratio.tsx`
  - `src/components/ui/button-group.tsx`
  - `src/components/ui/carousel.tsx`
  - `src/components/ui/collapsible.tsx`
  - `src/components/ui/combobox.tsx`
  - `src/components/ui/context-menu.tsx`
  - `src/components/ui/direction.tsx`
  - `src/components/ui/empty.tsx`
  - `src/components/ui/form.tsx`
  - `src/components/ui/hover-card.tsx`
  - `src/components/ui/input-otp.tsx`
  - `src/components/ui/item.tsx`
  - `src/components/ui/kbd.tsx`
  - `src/components/ui/menubar.tsx`
  - `src/components/ui/navigation-menu.tsx`
  - `src/components/ui/pagination.tsx`
  - `src/components/ui/resizable.tsx`
  - `src/components/ui/scroll-area.tsx`
  - `src/components/ui/slider.tsx`
  - `src/components/ui/toggle-group.tsx`
  - `src/components/ui/toggle.tsx`
  - `src/lib/rls.ts`
  - `src/lib/subdomain.ts`
  - `src/components/nav-main.tsx`
  - `src/components/team-switcher.tsx`
  - `src/features/org/server.ts`
  - `src/components/customized/breadcrumb/breadcrumb-05.tsx`
  - `src/components/app/form/portal-file-upload-field.tsx`
  - `src/components/app/page-shell/index.ts`
  - `drizzle/relations.ts`
  - `drizzle/schema.ts`
  - `test-schema.ts`
  - `check-db.mjs`
  - `.sandcastle/main.ts`
- **Changes:** Delete each file and remove any remaining imports from `index.ts` barrel files
- **Acceptance:** Build passes, no dangling import errors

### Task 6.6 — Remove unused exports (143 items)
- **Affected files** (partial list — run `knip` to get current list):
  - `src/messages/index.ts` — `isValidLocale`
  - `src/lib/validation-schemas.ts`
  - `src/features/admin/model.ts`
  - `src/features/address/model.ts`
  - `src/features/assets/model.ts`
  - `src/features/orders/hooks.ts`
  - `src/features/portal/hooks.ts`
  - `src/features/invoices/hooks.ts`
  - `src/features/settings/server.ts`
  - `src/features/documents/server.tsx`
  - `src/components/app/data-table/data-table-utils.ts`
  - `src/components/app/form/form-context.tsx`
  - `src/components/app/form/form-layout.tsx`
  - `src/components/app/form/index.ts`
  - `src/components/ui/card.tsx`
  - `src/components/ui/sidebar.tsx`
  - `src/components/ui/tabs.tsx`
  - `src/components/ui/badge.tsx`
  - `src/components/ui/avatar.tsx`
  - `src/components/ui/dropdown-menu.tsx`
  - `src/components/ui/table.tsx`
  - `src/components/ui/command.tsx`
  - `src/components/ui/field.tsx`
  - `src/components/ui/breadcrumb.tsx`
  - `src/components/ui/dialog.tsx`
  - `src/components/ui/sheet.tsx`
  - `src/components/ui/native-select.tsx`
  - `src/components/ui/drawer.tsx`
  - `src/components/ui/calendar.tsx`
  - `src/components/ui/popover.tsx`
  - `src/components/ui/radio-group.tsx`
  - `src/components/ui/select.tsx`
  - `src/lib/i18n.ts`
- **Changes:** Remove `export` keyword from unused exports. Keep if used in `.spec.ts`/`.test.ts` files.
- **Acceptance:** Build passes, no type errors

### Task 6.7 — Remove unused types (52 items)
- **Affected files:**
  - `src/features/admin/model.ts`
  - `src/features/address/model.ts`
  - `src/features/assets/model.ts`
  - `src/features/assets/upload-machine.ts`
  - `src/features/orders/model.ts`
  - `src/features/invoices/model.ts`
  - `src/features/pricing/engine.ts`
  - `src/features/portal/model.ts`
  - `src/components/app/data-table/data-table-utils.ts`
  - `src/components/app/form/index.ts`
  - `src/lib/i18n.ts`
  - `src/features/documents/types.ts`
  - `src/components/app/asset-upload/types.ts`
  - `src/components/app/form/form-fields.tsx`
  - `src/components/app/asset-upload/index.ts`
- **Changes:** Remove unused type declarations or prefix with `_` pattern if intentionally exported for documentation
- **Acceptance:** Build passes, no type errors

---

## Files to Modify (complete list)

| File | Batch | Changes |
|------|-------|---------|
| `package.json` | 0 | Pin exact versions, update drizzle-orm to 0.45.2 |
| `src/features/invoices/server.ts` | 2.1 | Promise.all() for independent awaits |
| `src/features/products/server.ts` | 2.2 | Promise.all() for independent awaits |
| `src/features/production/server.ts` | 2.3 | Promise.all() for independent awaits |
| `src/features/members/server.ts` | 2.4 | Promise.all() for independent awaits |
| `src/features/settings/server.ts` | 2.5 | Promise.all() for independent awaits |
| `src/features/portal/server.ts` | 2.6 | Promise.all() for independent awaits |
| `src/features/orders/server.ts` | 2.7 | Promise.all() for independent awaits |
| `src/features/assets/server.ts` | 2.8 | Promise.all() for independent awaits |
| `src/features/auth/org.ts` | 2.8, 2.9, 2.10 | Promise.all, loop -> Promise.all, array -> Set |
| `src/features/orders/model.ts` | 2.9 | loop -> Promise.all |
| `src/features/production/spawner.ts` | 2.9 | loop -> Promise.all |
| `src/features/production/model.ts` | 2.9 | loop -> Promise.all |
| `src/features/portal/model.ts` | 2.11, 1.8 | find -> Map, hoist property |
| `src/features/portal/pages/draft-view.tsx` | 2.9, 2.11 | loop -> Promise.all, find -> Map |
| `src/components/app/data-table/data-table.tsx` | 1.9, 6.1 | Boolean props, extract components |
| `src/components/app/data-table/data-table-context.tsx` | 3.1 | useContext -> use() |
| `src/components/ui/sidebar.tsx` | 3.1 | useContext -> use() |
| `src/components/ui/chart.tsx` | 1.6, 3.1, 5.2 | filter.map, useContext->use, dynamic import |
| `src/components/app/form/form-layout.tsx` | 3.1 | useContext -> use() |
| `src/features/production/hooks.ts` | 5.1 | Add query invalidation |
| `src/features/portal/hooks.ts` | 5.1 | Add query invalidation |
| `src/features/members/pages/accept-invitation-page.tsx` | 5.1 | Add query invalidation |
| `src/features/invoices/pages/invoice-detail-page.tsx` | 4.1, 6.2 | Date hydration, extract components |
| `src/features/orders/pages/view-order-page.tsx` | 1.4, 6.3 | Em dash, extract components |
| `src/features/members/pages/members-page.tsx` | 4.1, 6.4 | Date hydration, extract components |
| `src/features/portal/components/payment-section.tsx` | 4.1, 4.2 | Date hydration, useSyncExternalStore |
| `src/features/portal/components/order-timeline.tsx` | 1.6, 4.1 | filter.map combine, Date hydration |
| `src/features/pricing/engine.ts` | 1.3 | .sort() -> .toSorted() |
| `src/components/app/form/file-upload-field.tsx` | 1.6 | filter.map combine |
| `src/components/app/form/combobox-field.tsx` | (deferred) | Complex refactor |
| `src/components/app/avatar-photo.tsx` | 1.7 | .flatMap() |
| `src/routes/onboarding.tsx` | 2.8 | Promise.all |
| `src/components/nav-user.tsx` | 2.8 | Promise.all |
| `src/components/app/asset-upload/r2-adapter.ts` | 2.8 | Promise.all |
| `src/components/app/asset-upload/r2-portal-adapter.ts` | 2.8 | Promise.all |
| `src/features/documents/server.tsx` | 5.2 | Add suppression comment |
| `src/components/app/form/form.test.tsx` | 1.10 | Button label |
| `src/features/assets/server.test.ts` | 2.10 | Set lookup |
| `src/features/permissions/model.test.ts` | 2.10 | Set lookup |
| `src/features/invoices/model.test.ts` | 2.8 | Promise.all |
| `src/features/production/model.test.ts` | 2.8 | Promise.all |

## New Files

| File | Purpose |
|------|---------|
| `src/components/app/data-table/use-data-table-accumulation.ts` | Hook for mobile accumulation logic (extracted from DataTable) |
| `src/components/app/data-table/data-table-desktop-view.tsx` | Desktop table view sub-component |
| `src/components/app/data-table/data-table-mobile-view.tsx` | Mobile card list sub-component |
| `src/components/app/data-table/data-table-skeleton.tsx` | Skeleton loading states |

## Files to Delete (35 unused files)

See Task 6.5 for complete list — all shadcn boilerplate UI components + some feature leftovers.

---

## Dependencies (Execution Order)

```
Batch 0 (package.json) ── no deps
    │
Batch 1 (mechanical) ─── no deps, can start immediately
    │
Batch 2 (performance) ─── no deps (different files than batch 1 or 3)
    │
Batch 3 (React 19) ────── wait for Batch 1 & 2 to avoid conflicts (chart.tsx, sidebar.tsx, file-upload-field.tsx overlap)
    │
Batch 4 (hydration) ───── no deps on batch 3
    │
Batch 5 (mutations) ───── wait for Batch 2 (same file: production/hooks.ts)
    │
Batch 6 (architecture) ── wait for Batch 1-5 (touches many shared files)
```

**Simplified ordering for parallel workers:**
1. **Worker A:** Batch 0 + Batch 1 (all mechanical, no conflicts)
2. **Worker B:** Batch 2.1-2.7 (server.ts files, disjoint) + Batch 2.10-2.11 (test/model files)
3. **Worker C** (after A+B): Batch 2.8 + 2.9 (remaining performance) + Batch 3 (React 19)
4. **Worker D** (after C): Batch 4 (hydration) + Batch 5 (mutations)
5. **Worker E** (after D): Batch 6 (architecture — dead code removal + component extraction)

---

## Risks

| Risk | Mitigation |
|------|------------|
| **Sequential await → Promise.all breaks logic** if calls have implicit ordering dependencies | Before refactoring, verify each pair of awaits doesn't share state. The second await doesn't depend on first's result. If uncertain, keep sequential. |
| **Deleting 35 unused files breaks barrel imports** | Before deletion, grep for imports of each file in the codebase. Remove from barrel exports first, then delete. |
| **`useContext` → `use()` changes semantics** | `use()` is more flexible (works in branches), but requires React 19. Verify build works. |
| **`toSorted()` requires ES2023** | TypeScript 6.x targets ES2023+ by default. Verify `tsconfig.json` `target` setting. |
| **Drizzle ORM 0.45.1 → 0.45.2 breaks API** | Only fixes SQL injection — no breaking changes. Safe upgrade. |
| **Better Auth 1.5.3 → latest breaks API** | Check changelog for breaking changes between versions. |
| **Unused exports might be used in test files** | knip doesn't check test files by default. Search `.test.ts`/`.spec.ts` for each export before removing. |
| **DataTable extraction (866 lines) is risky** | Write tests first (snapshot or integration), then extract, then verify tests pass. |
| **Hydration fix via `useEffect`+`useState` causes flash** | Use `useSyncExternalStore` where possible. For cosmetic dates, `suppressHydrationWarning` is acceptable. |
| **`suppressHydrationWarning` approach accepted** | Only for cosmetic date displays. For functional values (timers), use proper client-only rendering. |

---

## Verification Steps

1. **After each batch:** `bun run typecheck && bun run check`
2. **After Batch 2:** `bun run test` (performance refactors should not break tests)
3. **After Batch 6 (deletions):** `bun run build` (verifies no dangling imports across the whole bundle)
4. **Final:** `npx react-doctor@latest .` — target score 85+

---

## Worker Delegation Plan

```
┌─────────────────────────────────────────────────┐
│            Orchestrator (parent session)          │
├─────────────────────────────────────────────────┤
│                                                   │
│  Batch 1 ───→ Worker A (mechanical fixes)        │
│                 └──→ Reviewer A                   │
│                                                   │
│  Batch 2 ───→ Worker B (sequentials + loops)      │
│                 └──→ Reviewer B                   │
│                                                   │
│  (After A+B done)                                 │
│  Batch 3+4 ──→ Worker C (React 19 + hydration)   │
│                 └──→ Reviewer C                   │
│                                                   │
│  (After C done)                                   │
│  Batch 5+6.5 ─→ Worker D (mutations + dead code) │
│                   └──→ Reviewer D                 │
│                                                   │
│  (After D done)                                   │
│  Batch 6.1-6.4 → Worker E (giant components)      │
│                    └──→ Reviewer E                │
│                                                   │
│  Final → Reviewer F (full regression)             │
│                                                   │
└─────────────────────────────────────────────────┘
```
