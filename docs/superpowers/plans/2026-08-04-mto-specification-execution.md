# MTO Specification Execution and Production Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add validated uniform, matrix, and per-item specifications with reusable CSV import, immutable committed snapshots, and complete one-task-per-line-item production instructions.

**Architecture:** The specification feature owns a versioned draft/submission lifecycle and validates values against the copied product configuration from Delivery 1. A committed snapshot freezes the resolved configuration, display values, itemization data, and per-piece rows; production task spawning consumes that snapshot and stores a read-oriented instruction in task context without multiplying tasks by piece. CSV parsing/validation is a pure reusable service used by portal and internal admin entry points.

**Tech Stack:** TypeScript, Zod 4, TanStack Start server functions, Drizzle ORM/PostgreSQL, TanStack Query, TanStack Form, React Testing Library, use-intl, existing asset upload service, Vitest/Playwright through Bun scripts.

## Global Constraints

- This plan depends on Delivery 1: organization product templates expose validated field definitions, itemization mode, copied product configuration, production defaults, and BOM defaults.
- Supported itemization modes are exactly `uniform`, `matrix`, and `per_item`.
- Supported configured field types include `text`, `text_per_item`, `number_per_item`, `select`, `file`, and `matrix`; behavior branches on these types, never on product category.
- Uniform specifications contain one field-value object; matrix specifications contain structured quantity rows summing exactly to the line-item quantity; per-item specifications contain ordered rows with count exactly equal to quantity.
- Per-item aggregate breakdowns are derived from rows; an optional supplied matrix is accepted only when it equals the derived aggregate.
- Committed snapshots are immutable and retain enough copied source configuration to interpret historical values after product/template edits.
- The portal token is scoped to one order; authenticated internal operations resolve organization membership server-side.
- Every mutation validates at the server boundary, returns a discriminated result, and filters all organization rows by `orgId`.
- CSV is the required bulk workflow; XLSX and arbitrary formula execution are not part of this delivery.
- Keep existing order states, payment flow, portal timeline, file upload, and one-task-per-line-item spawning behavior unless a specification readiness guard explicitly extends it.
- Use localized Indonesian/English messages, accessible controls, `#/` imports, no `any`, no non-null assertions, and safe commands: `bun run test -- ...`, `bun run test:e2e -- ...`, `bun run typecheck`, `bun run check`, `bun run build`.

---

### Task 1: Define specification and CSV validation contracts

**Files:**
- Create: `src/features/specifications/types.ts`
- Create: `src/features/specifications/validation.ts`
- Create: `src/features/specifications/csv.ts`
- Test: `src/features/specifications/validation.test.ts`
- Test: `src/features/specifications/csv.test.ts`

**Interfaces:**
- `SpecificationStatus = 'draft' | 'submitted' | 'priced' | 'reviewable' | 'committed'`.
- `UniformSpecificationInput`, `MatrixSpecificationInput`, `PerItemSpecificationInput`, and `SpecificationInput` discriminated by `itemizationMode`.
- `SpecificationValidationResult = { ok: true; normalized: NormalizedSpecification } | { ok: false; errors: SpecificationError[] }`.
- `SpecificationError = { path: string; row?: number; column?: string; code: string; messageKey: string }`.
- `parseCsv(input: string): CsvParseResult` handles quoted values, escaped quotes, commas, CRLF/LF, and malformed quote detection.
- `buildCsvTemplate(fields: readonly TemplateFieldDefinition[]): string` emits stable field keys as headers in configured order.
- `validateCsvRows(rows, fields, quantity): SpecificationValidationResult` returns all row/column errors without accepting partial data.
- `aggregatePerItemRows(rows): MatrixAggregate[]` derives matrix/attribute totals from ordered rows.

- [ ] **Step 1: Write failing invariant tests**

```ts
it('requires matrix quantities to equal the ordered quantity', () => {
  const result = validateSpecification({
    itemizationMode: 'matrix',
    quantity: 3,
    values: { rows: [{ dimensions: { size: 'M', color: 'Black' }, quantity: 2 }] },
    fields: matrixFields,
  })
  expect(result).toMatchObject({ ok: false })
  expect(result.errors.map((error) => error.code)).toContain('quantity_mismatch')
})

it('derives per-item aggregates and rejects a conflicting supplied matrix', () => {
  const result = validateSpecification({
    itemizationMode: 'per_item', quantity: 2,
    values: { items: [{ size: 'M', color: 'Black' }, { size: 'M', color: 'White' }],
      matrix: [{ dimensions: { size: 'M', color: 'Black' }, quantity: 2 }] },
    fields: perItemFields,
  })
  expect(result).toMatchObject({ ok: false })
  expect(result.errors.map((error) => error.code)).toContain('aggregate_mismatch')
})

it('parses quoted comma-containing values and reports malformed quotes', () => {
  expect(parseCsv('name,note\nAlice,"red, blue"').rows[0]).toEqual(['Alice', 'red, blue'])
  expect(parseCsv('name\n"unterminated').errors[0]?.code).toBe('malformed_csv')
})
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `bun run test -- src/features/specifications/validation.test.ts src/features/specifications/csv.test.ts`
Expected: FAIL because the contracts and implementations do not exist.

- [ ] **Step 3: Implement schema-driven normalization**

Validate required values, text, number coercion/rejection, allowed select options, file asset ids, matrix dimensions, and per-item row counts. Return every error with a stable machine code and translated message key; do not stop at the first invalid row. Keep normalized values typed and preserve row order.

- [ ] **Step 4: Implement the standards-compliant CSV parser**

Scan characters once, treating commas/newlines inside quoted cells as data and doubled quotes as escaped quotes. Reject inconsistent column counts, missing headers, duplicate headers, unknown headers, and missing required headers. Keep headers as stable field keys; labels are presentation-only.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `bun run test -- src/features/specifications/validation.test.ts src/features/specifications/csv.test.ts`
Expected: PASS for valid/invalid uniform, matrix, per-item, CSV, quantity, and aggregation cases.

- [ ] **Step 6: Commit the pure domain seam**

```bash
git add src/features/specifications/types.ts src/features/specifications/validation.ts src/features/specifications/csv.ts src/features/specifications/*.test.ts
git commit -m "feat: validate configurable order specifications"
```

### Task 2: Persist drafts, submissions, and immutable snapshots

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0034_mto_specifications.sql`
- Modify: `drizzle/meta/_journal.json` and generated snapshot metadata
- Create: `src/features/specifications/model.ts`
- Test: `src/features/specifications/model.test.ts`

**Interfaces:**
- `Specification` includes `id`, `orgId`, `orderId`, `lineItemId`, `productId`, `status`, `version`, `draftValues`, `submittedAt`, `committedAt`, `createdAt`, and `updatedAt`.
- `SpecificationSnapshot` includes `id`, `orgId`, `specificationId`, `lineItemId`, `version`, `itemizationMode`, `sourceProductConfiguration`, `resolvedValues`, `matrixValues`, `items`, `aggregateValues`, and `createdAt`.
- Produces `getSpecificationForLineItem`, `saveSpecificationDraft`, `submitSpecification`, `commitSpecificationSnapshot`, `getSpecificationSnapshot`, and `listSpecificationVersions`.

- [ ] **Step 1: Add DB integration tests for lifecycle and immutability**

```ts
it('saves a draft, submits valid values, and commits one immutable snapshot', async () => {
  const draft = await saveSpecificationDraft({ orgId: org1Id, lineItemId, input: validPerItemInput })
  expect(draft.status).toBe('draft')
  const submitted = await submitSpecification({ orgId: org1Id, specificationId: draft.id })
  expect(submitted.status).toBe('submitted')
  const snapshot = await commitSpecificationSnapshot({ orgId: org1Id, specificationId: draft.id })
  expect(snapshot.items).toHaveLength(lineItemQuantity)
  await expect(updateCommittedSpecification(draft.id, org1Id, otherInput)).rejects.toThrow('immutable')
})

it('cannot read or mutate another organization or another order through a token-scoped line item', async () => {
  await expect(getSpecificationForLineItem({ orgId: org2Id, lineItemId: org1LineItemId })).resolves.toBeNull()
})
```

- [ ] **Step 2: Run the integration tests and verify they fail**

Run: `bun run test -- src/features/specifications/model.test.ts`
Expected: FAIL because schema tables and model functions do not exist.

- [ ] **Step 3: Add schema and migration**

Add organization-scoped `specifications` keyed to `orders`, `order_line_items`, and `products`, with a unique active specification per line item and version/status fields. Add append-only `specification_snapshots` with a unique `(specification_id, version)` and JSON columns for source configuration, resolved values, matrix/aggregate values, and ordered items. Use restrictive or set-null foreign-key behavior that preserves historical snapshots when active templates/products are archived.

- [ ] **Step 4: Implement model transactions**

`saveSpecificationDraft` validates against the line item’s copied product configuration and stores normalized draft data. `submitSpecification` revalidates from the database, checks the line-item quantity, and transitions only draft/submitted-compatible states. `commitSpecificationSnapshot` runs in a transaction, locks the specification/line item, creates the next immutable version, and marks the specification committed. Never update or delete a committed snapshot.

- [ ] **Step 5: Run the integration tests and verify they pass**

Run: `bun run test -- src/features/specifications/model.test.ts`
Expected: PASS for lifecycle transitions, immutable history, quantity invariants, and organization isolation.

- [ ] **Step 6: Commit persistence**

```bash
git add src/db/schema.ts drizzle/0034_mto_specifications.sql drizzle/meta src/features/specifications/model.ts src/features/specifications/model.test.ts
git commit -m "feat: persist specification drafts and snapshots"
```

### Task 3: Add validated authenticated and token-scoped server functions

**Files:**
- Create: `src/features/specifications/server.ts`
- Create: `src/features/specifications/hooks.ts`
- Modify: `src/lib/query-keys.ts`
- Test: `src/features/specifications/server.test.ts`

**Interfaces:**
- Authenticated functions: `getSpecificationFn`, `saveSpecificationDraftFn`, `submitSpecificationFn`, `commitSpecificationFn`, `getSpecificationSnapshotFn`, and `listSpecificationVersionsFn`.
- Portal functions: `getPortalSpecificationFn`, `savePortalSpecificationDraftFn`, `submitPortalSpecificationFn` with `{ token, lineItemId, ... }` input and order-token scope enforcement.
- Hooks: `useSpecification`, `usePortalSpecification`, `useSaveSpecificationDraft`, `useSubmitSpecification`, `useCommitSpecification`, and `useSpecificationVersions`.

- [ ] **Step 1: Write server authorization tests**

```ts
it('rejects a portal request when lineItemId is not in the token order', async () => {
  const result = await savePortalSpecificationFn({ data: { token, lineItemId: otherOrderLineItemId, input } })
  expect(result).toEqual({ ok: false, error: 'notFound' })
})

it('resolves the authenticated organization instead of accepting orgId', async () => {
  const result = await commitSpecificationFn({ data: { orgId: 'untrusted', specificationId } })
  expect(result.ok).toBe(false)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun run test -- src/features/specifications/server.test.ts`
Expected: FAIL because server functions and hooks are absent.

- [ ] **Step 3: Implement server validation and scope resolution**

Use Zod input schemas. Authenticated reads/mutations call `resolveOrgId()` before model access; portal calls resolve `orgId` from the token and then verifies the order and line item together. Return typed errors such as `notFound`, `invalidSpecification`, `alreadyCommitted`, and `unauthorized` without leaking other-order data.

- [ ] **Step 4: Wire query keys and invalidation**

Add `queryKeys.specifications` for line-item details, portal details, snapshots, and versions. Draft saves invalidate the detail; submission/commit invalidate detail, snapshots, orders, production, and portal data where the existing query key factories expose those views.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `bun run test -- src/features/specifications/server.test.ts && bun run typecheck`
Expected: PASS and no TypeScript errors.

- [ ] **Step 6: Commit the server seam**

```bash
git add src/features/specifications/server.ts src/features/specifications/hooks.ts src/lib/query-keys.ts src/features/specifications/server.test.ts
git commit -m "feat: expose scoped specification operations"
```

### Task 4: Build the reusable CSV preview and specification form

**Files:**
- Create: `src/features/specifications/components/specification-fields.tsx`
- Create: `src/features/specifications/components/csv-specification-input.tsx`
- Create: `src/features/specifications/components/specification-preview.tsx`
- Create: `src/features/specifications/components/specification-form.tsx`
- Test: `src/features/specifications/components/csv-specification-input.test.tsx`
- Test: `src/features/specifications/components/specification-form.test.tsx`
- Modify: `src/messages/types.ts`, `src/messages/en.ts`, `src/messages/id.ts`

**Interfaces:**
- `CsvSpecificationInputProps` accepts `fields`, `quantity`, `value`, and `onChange`; it emits `SpecificationValidationResult` and never submits invalid rows.
- `SpecificationForm` accepts `configuration`, `quantity`, `initialValue`, `onSaveDraft`, and `onSubmit`.

- [ ] **Step 1: Write failing UI behavior tests**

```tsx
it('shows row and column errors and disables submit until valid', async () => {
  render(<CsvSpecificationInput fields={fields} quantity={2} value={null} onChange={vi.fn()} />)
  await user.upload(screen.getByLabelText('specifications.csvFile'), csvFile('name,number\nA,nope'))
  expect(await screen.findByText(/row 2/i)).toBeVisible()
  expect(screen.getByRole('button', { name: 'specifications.submit' })).toBeDisabled()
})

it('renders a valid preview and enables submission', async () => {
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText('specifications.csvFile'), csvFile('name,number\nA,7\nB,8'))
  expect(await screen.findByText('A')).toBeVisible()
  expect(await screen.findByText('B')).toBeVisible()
  expect(screen.getByRole('button', { name: 'specifications.submit' })).toBeEnabled()
})
```

- [ ] **Step 2: Run the component tests and verify they fail**

Run: `bun run test -- src/features/specifications/components/csv-specification-input.test.tsx src/features/specifications/components/specification-form.test.tsx`
Expected: FAIL because components and messages do not exist.

- [ ] **Step 3: Implement the reusable input and preview**

Offer a translated template-download button, file input, parse/validate path, scrollable preview table, accessible error list with row/column, and disabled submit while errors exist. Use stable field keys in generated CSV and friendly labels in the preview. Render uniform text/select/file fields, matrix quantity controls, and per-item CSV/table entry from the same form contract.

- [ ] **Step 4: Add localized copy**

Add all labels, parser errors, quantity errors, empty states, save-draft status, submit status, and preview headings to both message files and `Messages` typing. Keep validation message keys separate from English text so `id` remains the primary operating locale.

- [ ] **Step 5: Run component tests and verify they pass**

Run: `bun run test -- src/features/specifications/components/csv-specification-input.test.tsx src/features/specifications/components/specification-form.test.tsx`
Expected: PASS for error-bearing preview, template download, disabled submit, and valid normalized values.

- [ ] **Step 6: Commit the reusable UI**

```bash
git add src/features/specifications/components src/messages/types.ts src/messages/en.ts src/messages/id.ts
 git commit -m "feat: add reusable specification CSV preview"
```

### Task 5: Integrate the form into the customer portal and internal review

**Files:**
- Modify: `src/features/portal/model.ts`
- Modify: `src/features/portal/server.ts`, `src/features/portal/hooks.ts`
- Modify: `src/features/portal/pages/draft-view.tsx`, `src/features/portal/pages/pending-view.tsx`
- Modify: `src/features/orders/pages/view-order-page.tsx`
- Create: `src/features/specifications/components/specification-summary.tsx`
- Test: `src/features/portal/pages/draft-view.test.tsx`, `src/features/portal/pages/pending-view.test.tsx`, `src/features/orders/pages/view-order-page.test.tsx`

**Interfaces:**
- `PortalOrder.lineItems[]` includes `specificationStatus`, `specificationId`, `itemizationMode`, `resolvedValues`, `matrixValues`, and `items` when the token is authorized to see them.
- `SpecificationSummary` renders resolved display labels, matrix totals, per-item aggregates, ordered rows, and linked artwork without editing committed data.

- [ ] **Step 1: Add portal/admin tests**

```tsx
it('saves an incomplete draft without moving the order to pending', async () => {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'specifications.saveDraft' }))
  expect(await screen.findByText('specifications.draftSaved')).toBeVisible()
  expect(mockSubmitSpecification).not.toHaveBeenCalled()
})

it('does not offer submit while the specification preview has validation errors', async () => {
  render(<SpecificationForm configuration={configuration} quantity={2} initialValue={invalidInput} onSaveDraft={mockSaveDraft} onSubmit={mockSubmitSpecification} />)
  expect(screen.getByRole('alert')).toHaveTextContent('specifications.invalidNumber')
  expect(screen.getByRole('button', { name: 'specifications.submit' })).toBeDisabled()
})

it('shows committed values in pending-order review', async () => {
  render(<PendingView order={committedOrder} token="token" />)
  expect(screen.getByText('M / Black: 2')).toBeVisible()
  expect(screen.getByText('Alice')).toBeVisible()
  expect(screen.getByRole('link', { name: 'artwork.svg' })).toBeVisible()
})
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `bun run test -- src/features/portal/pages/draft-view.test.tsx src/features/portal/pages/pending-view.test.tsx src/features/orders/pages/view-order-page.test.tsx`
Expected: FAIL because portal/order payloads do not include specification data.

- [ ] **Step 3: Extend portal reads and mutations without changing token semantics**

Join specifications through the order’s organization and line item ids; never query by token alone after resolving the order. Save drafts for draft orders only; submit transitions the specification and preserves the existing confirm flow. Keep address, payment proof, attachment, timeline, and contact actions unchanged.

- [ ] **Step 4: Add the internal review summary**

Show specification status and normalized values in pending-order review. Make committed data read-only. Keep all actions role-scoped by existing order permissions and localized.

- [ ] **Step 5: Run the focused tests and verify they pass**

Run: `bun run test -- src/features/portal/pages/draft-view.test.tsx src/features/portal/pages/pending-view.test.tsx src/features/orders/pages/view-order-page.test.tsx`
Expected: PASS and existing portal/order tests remain green.

- [ ] **Step 6: Commit portal and admin integration**

```bash
git add src/features/portal src/features/orders/pages/view-order-page.tsx src/features/specifications/components/specification-summary.tsx
git commit -m "feat: capture specifications in portal and review"
```

### Task 6: Snapshot complete production instructions and specification readiness

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/features/production/model.ts`
- Modify: `src/features/production/task-spawn-helpers.ts`, `src/features/production/spawner.ts`
- Modify: `src/features/production/server.ts`
- Test: `src/features/production/model.test.ts`, `src/features/production/task-spawn-helpers.test.ts`

**Interfaces:**
- `ProductionTask.context` adds `specificationId`, `snapshotId`, `itemizationMode`, `resolvedValues`, `matrixValues`, `items`, and `specificationStatus`.
- Produces `buildProductionInstruction(snapshot, lineItem): ProductionInstruction`.
- Task spawning remains idempotent by `lineItemId` and refuses to create a production task unless the line item has a committed snapshot.

- [ ] **Step 1: Add task-context and readiness tests**

```ts
it('creates one task per line item with the full committed snapshot', async () => {
  await spawnQueuedPreProductionTasksForOrder(db, { orderId, orgId, allowedStatuses: ['approved'] })
  const tasks = await listTasksForOrder(orderId, orgId)
  expect(tasks).toHaveLength(1)
  expect(tasks[0].context).toMatchObject({ snapshotId, itemizationMode: 'per_item', items: perItemRows })
})

it('does not duplicate the task when approval/task spawning is retried', async () => {
  await spawnQueuedPreProductionTasksForOrder(db, input)
  await spawnQueuedPreProductionTasksForOrder(db, input)
  expect(await countTasksForLineItem(lineItemId, orgId)).toBe(1)
})
```

- [ ] **Step 2: Run the production tests and verify they fail**

Run: `bun run test -- src/features/production/model.test.ts src/features/production/task-spawn-helpers.test.ts`
Expected: FAIL because task context has no snapshot contract and spawning does not guard committed specifications.

- [ ] **Step 3: Extend task context and spawner reads**
Load the committed snapshot through the same `orgId`, order id, line item id, and product id. Build a serializable instruction containing resolved display values, matrix aggregates, ordered per-item rows, source snapshot id/version, and asset ids. Keep `priority`, task numbering, activity logging, board assignment, and line-item idempotency unchanged.

- [ ] **Step 4: Add the specification readiness guard**

When an approved order has a missing, invalid, or uncommitted specification, return the existing typed mutation error with a translated/displayable reason and do not create a task. Existing non-configurable legacy products receive a uniform committed compatibility snapshot through an explicit migration/helper, not a silent task-context fallback.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `bun run test -- src/features/production/model.test.ts src/features/production/task-spawn-helpers.test.ts && bun run typecheck`
Expected: PASS for complete instruction, one-task-per-line-item, stale-template immunity, and readiness guard.

- [ ] **Step 6: Commit production integration**

```bash
git add src/db/schema.ts src/features/production src/features/specifications
 git commit -m "feat: snapshot production instructions from specifications"
```

### Task 7: Verify the complete specification delivery

**Files:**
- Modify: `src/features/specifications`, `src/features/portal`, `src/features/orders/pages/view-order-page.tsx`, and `src/features/production` only for fixture/payload updates required by the preceding tasks.
- Test: all specification, portal, order, production, and CSV tests touched above
- Test: `e2e/specification-portal.spec.ts`

**Interfaces:**
- No new API; this task proves the portal-to-task contract end to end.

- [ ] **Step 1: Add the browser flow**

Create an E2E scenario that signs in as the seeded organization, opens a tokenized draft order, downloads the CSV template, uploads a quoted/comma-containing file, sees a row error, corrects it, submits, and verifies the internal review/task surface shows the committed rows. Use existing `e2e/helpers/auth.ts`; do not truncate tables in E2E.

- [ ] **Step 2: Run focused unit, integration, component, and E2E checks**

```bash
bun run test -- src/features/specifications src/features/portal src/features/orders/pages/view-order-page.test.tsx src/features/production/model.test.ts
bun run test:e2e -- e2e/specification-portal.spec.ts
```

Expected: PASS with no skipped specification behavior.

- [ ] **Step 3: Run typecheck, check, and build**

```bash
bun run typecheck
bun run check
bun run build
```

Expected: PASS. Existing auth, order, portal, invoice, shipping, production, and timeline tests remain green.

- [ ] **Step 4: Commit final verification changes**

```bash
git add src e2e drizzle
 git commit -m "test: verify specification execution delivery"
```
