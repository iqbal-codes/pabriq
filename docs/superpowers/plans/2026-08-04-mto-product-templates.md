# MTO Product Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add platform-owned business templates and organization-owned product templates without breaking existing products, orders, pricing, or production.

**Architecture:** Keep business templates as platform-owned starter data and copy their validated configuration into organization-owned product templates during onboarding. Product templates own lifecycle and authorization; products store a source-template reference plus a copied sellable configuration so later template edits cannot rewrite existing products. Product-category text remains metadata; all runtime behavior branches on explicit configuration.

**Tech Stack:** TypeScript, TanStack Start server functions, Drizzle ORM/PostgreSQL, Zod 4, TanStack Query, TanStack Form, use-intl, Vitest through `bun run test`.

## Global Constraints

- Every organization-owned row has a non-null `orgId` referencing `organization.id` with cascade deletion.
- Every server mutation resolves organization membership from the authenticated session; never trust a client-supplied organization id.
- Roles remain `owner | admin | member`; template and product configuration mutations are owner/admin-only through `canManageProducts` or a new matching predicate.
- Existing products keep working with nullable template provenance and uniform itemization defaults until deliberately migrated.
- Product creation copies template configuration at creation time; later template edits do not mutate the product.
- Business templates are not organization records and are never directly sellable.
- Use `#/` imports, `import type`, no `any`, no non-null assertions, and localized English/Indonesian user-facing copy.
- Use `bun run test -- <target>`, never invoke Vitest directly; schema/server/routing changes also require `bun run typecheck`, `bun run check`, and `bun run build` at the delivery gate.

---

### Task 1: Define template configuration contracts

**Files:**
- Create: `src/features/product-templates/config.ts`
- Test: `src/features/product-templates/config.test.ts`

**Interfaces:**
- Produces `ItemizationMode = 'uniform' | 'matrix' | 'per_item'`.
- Produces `TemplateFieldDefinition`, `PricingDefaults`, `ProductionDefaults`, `WorkflowStageDefault`, `BomTemplateItem`, `ProductTemplateConfiguration`, and `BusinessTemplateConfiguration` types.
- Produces `validateProductTemplateConfiguration(input: unknown): ProductTemplateConfiguration` using Zod.

- [ ] **Step 1: Write the failing contract tests**

```ts
it('accepts explicit itemization and field types', () => {
  expect(validateProductTemplateConfiguration({
    itemizationMode: 'per_item',
    fields: [{ key: 'name', type: 'text_per_item', label: 'Name', required: true }],
    pricing: { basePrice: 0, productionDays: 1, minQuantity: 1 },
    production: { notes: null },
    workflowStages: [],
    bom: [],
  }).itemizationMode).toBe('per_item')
})

it('rejects unknown field types and malformed options', () => {
  expect(() => validateProductTemplateConfiguration({
    itemizationMode: 'uniform', fields: [{ key: 'x', type: 'industry_specific' }],
  })).toThrow()
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun run test -- src/features/product-templates/config.test.ts`
Expected: FAIL because the module and validator do not exist.

- [ ] **Step 3: Implement the smallest shared configuration schema**

Use field types `text`, `text_per_item`, `number_per_item`, `select`, `file`, and `matrix`; require unique non-empty keys and options only for `select`; reject negative pricing/quantity defaults and arbitrary formula strings. Keep BOM validation structural here; material existence is checked by the material feature later.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `bun run test -- src/features/product-templates/config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit the contract seam**

```bash
git add src/features/product-templates/config.ts src/features/product-templates/config.test.ts
git commit -m "feat: define product template configuration contract"
```

### Task 2: Persist business and organization product templates

**Files:**
- Modify: `src/db/schema.ts`
- Create: `drizzle/0032_mto_product_templates.sql`
- Modify: `drizzle/meta/_journal.json` and generated snapshot metadata
- Create: `src/features/product-templates/model.ts`
- Test: `src/features/product-templates/model.test.ts`

**Interfaces:**
- Produces `BusinessTemplate`, `ProductTemplate`, `listBusinessTemplates()`, `getProductTemplate()`, `listProductTemplates()`, `createProductTemplate()`, `updateProductTemplate()`, `duplicateProductTemplate()`, `archiveProductTemplate()`, `deleteProductTemplate()`, and `materializeBusinessTemplate()`.
- `materializeBusinessTemplate(orgId: string, businessTemplateId: string): Promise<ProductTemplate[]>` copies starter product types into the organization.

- [ ] **Step 1: Add integration tests for tenant isolation and lifecycle safety**

```ts
it('copies a business template into one organization and isolates reads', async () => {
  const copied = await materializeBusinessTemplate(org1Id, businessTemplateId)
  expect(copied).toHaveLength(1)
  expect(await listProductTemplates(org1Id)).toHaveLength(1)
  expect(await listProductTemplates(org2Id)).toEqual([])
})

it('archives referenced templates and rejects unsafe deletion', async () => {
  const template = await createProductTemplate({ orgId: org1Id, name: 'Tee', configuration })
  await expect(deleteProductTemplate(template.id, org1Id)).rejects.toThrow('referenced')
  expect((await archiveProductTemplate(template.id, org1Id)).status).toBe('archived')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test -- src/features/product-templates/model.test.ts`
Expected: FAIL because the tables and model functions do not exist.

- [ ] **Step 3: Add the schema and migration**

Add platform `business_templates` with slug, name, description, active flag, and JSON configuration; add org-scoped `product_templates` with nullable `businessTemplateId`, name, descriptive metadata, configuration JSON, status (`active | archived`), and timestamps. Add org/template indexes and foreign keys. Seed only deterministic platform starter data in the migration; do not create sellable products.

- [ ] **Step 4: Implement org-scoped model functions and transactions**

Every organization query must include `eq(table.orgId, orgId)`. Materialization inserts all copied templates in one transaction and is idempotent for an organization/business-template pair. Duplication deep-copies validated JSON and clears provenance only when explicitly requested by the model contract. Deletion checks products and snapshots/references before deleting; archive otherwise.

- [ ] **Step 5: Run the integration test to verify it passes**

Run: `bun run test -- src/features/product-templates/model.test.ts`
Expected: PASS with isolated fixtures and no cross-organization rows.

- [ ] **Step 6: Commit the persistence slice**

```bash
git add src/db/schema.ts drizzle/0032_mto_product_templates.sql drizzle/meta src/features/product-templates/model.ts src/features/product-templates/model.test.ts
git commit -m "feat: persist organization product templates"
```

### Task 3: Expose authorized template server functions and hooks

**Files:**
- Create: `src/features/product-templates/server.ts`
- Create: `src/features/product-templates/hooks.ts`
- Modify: `src/lib/query-keys.ts`
- Modify: `src/features/permissions/model.ts` to add `canManageProductTemplates(role: Role): boolean` if template permissions must differ; otherwise reuse `canManageProducts` and leave this file unchanged.
- Test: `src/features/product-templates/server.test.ts`

**Interfaces:**
- Produces `listBusinessTemplatesFn`, `listProductTemplatesFn`, `createProductTemplateFn`, `updateProductTemplateFn`, `duplicateProductTemplateFn`, `archiveProductTemplateFn`, `deleteProductTemplateFn`, and `materializeBusinessTemplateFn`.
- Hooks expose `useBusinessTemplates`, `useProductTemplates`, `useCreateProductTemplate`, `useUpdateProductTemplate`, `useDuplicateProductTemplate`, `useArchiveProductTemplate`, `useDeleteProductTemplate`, and `useMaterializeBusinessTemplate`.

- [ ] **Step 1: Write server-boundary tests**

```ts
it('ignores a client organization id and resolves the authenticated organization', async () => {
  const result = await createProductTemplateFn({ data: { orgId: 'attacker-org', name: 'x', configuration } })
  expect(result).toEqual({ ok: false, error: expect.any(String) })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `bun run test -- src/features/product-templates/server.test.ts`
Expected: FAIL because server functions and query keys do not exist.

- [ ] **Step 3: Implement validated server functions**

Use Zod input schemas at `.inputValidator`, resolve org with `resolveOrgId()` or an owner/admin resolver before model access, and return `{ ok: true } | { ok: false; error: string }` for mutations. Business-template listing is a GET read; materialization and lifecycle operations are POST mutations.

- [ ] **Step 4: Wire query keys and invalidation**

Use `queryKeys.productTemplates` with `all`, `lists`, `list`, `details`, `detail`, and `businessTemplates`. Every mutation invalidates the affected list/detail keys through `invalidateMutationQueries`.

- [ ] **Step 5: Run the focused test and typecheck**

Run: `bun run test -- src/features/product-templates/server.test.ts && bun run typecheck`
Expected: PASS and no TypeScript errors.

- [ ] **Step 6: Commit the API slice**

```bash
git add src/features/product-templates/server.ts src/features/product-templates/hooks.ts src/lib/query-keys.ts src/features/permissions/model.ts src/features/product-templates/server.test.ts
git commit -m "feat: expose product template operations"
```

### Task 4: Add onboarding business-model selection and materialization

**Files:**
- Modify: `src/routes/onboarding.tsx`
- Modify: `src/features/auth/org.ts`
- Modify: `src/messages/types.ts`, `src/messages/en.ts`, `src/messages/id.ts`
- Test: `e2e/onboarding.spec.ts`, `src/routes/-onboarding.test.tsx`

**Interfaces:**
- `createOrganization` accepts `{ name: string; businessTemplateId: string }` and materializes templates before returning `{ ok: true, orgId }`.
- Empty business-template results render an explicit translated unavailable state and prevent organization creation.

- [ ] **Step 1: Add the failing onboarding scenarios**

```ts
await expect(page.getByLabel(/business model/i)).toBeVisible()
await expect(page.getByRole('button', { name: /create organization/i })).toBeDisabled()
```

Also cover a successful selection and a no-options empty state. Use the existing `bun run test:e2e -- e2e/onboarding.spec.ts` command only.

- [ ] **Step 2: Implement the server-side creation transaction**

Validate the selected business-template id, verify it is active, create the organization/profile/membership using existing onboarding behavior, then call `materializeBusinessTemplate` in the same transaction or a transaction-compatible helper. Never silently continue without starter templates.

- [ ] **Step 3: Implement the localized selection UI**

Load available business templates with a query, render radio/select controls with labels and descriptions, keep submit disabled while loading/no selection/no options, and preserve existing logo upload behavior. Add Indonesian and English copy for label, empty, loading, and error states.

- [ ] **Step 4: Run targeted onboarding verification**

Run: `bun run test:e2e -- e2e/onboarding.spec.ts`
Expected: PASS for selection, empty state, and organization creation.

- [ ] **Step 5: Commit onboarding integration**

```bash
git add src/routes/onboarding.tsx src/features/auth/org.ts src/messages/types.ts src/messages/en.ts src/messages/id.ts e2e/onboarding.spec.ts
git commit -m "feat: materialize product templates during onboarding"
```

### Task 5: Create products from templates with copied configuration

**Files:**
- Modify: `src/db/schema.ts`
- Create: migration `drizzle/0033_mto_products_template_source.sql`
- Modify: `src/features/products/model.ts`, `src/features/products/server.ts`, `src/features/products/hooks.ts`
- Modify: `src/features/products/components/product-form-sheet.tsx`, `src/features/products/components/product-form-fields.tsx`, `src/features/products/pages/products-list-page.tsx`
- Modify: `src/lib/validation-schemas.ts`, `src/messages/types.ts`, `src/messages/en.ts`, `src/messages/id.ts`
- Test: `src/features/products/model.test.ts`, `src/features/products/components/product-form-sheet.test.tsx`

**Interfaces:**
- `CreateProductInput` requires `productTemplateId` for new products; `Product` exposes nullable `productTemplateId`, `itemizationMode`, and copied `configuration`.
- `createProduct` reads the selected active template under the same org, copies configuration and pricing defaults, and stores provenance.

- [ ] **Step 1: Add regression tests for copy-on-create and legacy compatibility**

```ts
const product = await createProduct({ orgId: org1Id, productTemplateId: template.id, name: 'Custom Tee' })
await updateProductTemplate({ orgId: org1Id, id: template.id, configuration: changedConfiguration })
expect((await getProduct(product.id, org1Id))?.configuration).toEqual(originalConfiguration)
expect(await createLegacyFixtureProduct(org1Id)).toMatchObject({ itemizationMode: 'uniform', productTemplateId: null })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test -- src/features/products/model.test.ts src/features/products/components/product-form-sheet.test.tsx`
Expected: FAIL because the product schema and form do not require a template.

- [ ] **Step 3: Add nullable source/copy columns and migration**

Add `productTemplateId`, `itemizationMode` defaulting to `uniform`, and copied configuration JSON to `products`; backfill every existing row to `itemizationMode = 'uniform'`, `productTemplateId = null`, and a null copied configuration so current products remain readable.

- [ ] **Step 4: Update model/server validation and persistence**

Resolve and validate the active template before insertion; copy pricing/production defaults only for omitted create fields; never read template data during later product updates. Reject archived or cross-org templates. Keep product list/get filters organization-scoped and soft-delete-aware.

- [ ] **Step 5: Update the product form and localization**

Load active templates, require a translated template selection on create, show source-template provenance on edit, and leave existing pricing/addon controls intact. Do not expose category-specific branches. Keep existing form state and URL sheet behavior.

- [ ] **Step 6: Run focused tests and commit**

Run: `bun run test -- src/features/products/model.test.ts src/features/products/components/product-form-sheet.test.tsx && bun run typecheck`
Expected: PASS.

```bash
git add src/db/schema.ts drizzle/0033_mto_products_template_source.sql src/features/products src/lib/validation-schemas.ts src/messages/types.ts src/messages/en.ts src/messages/id.ts
git commit -m "feat: create products from copied templates"
```

### Task 6: Add the organization template management page

**Files:**
- Create: `src/routes/_org/settings/product-templates/index.tsx`
- Create: `src/features/product-templates/pages/product-templates-page.tsx`
- Create: `src/features/product-templates/components/product-template-form.tsx`
- Create: `src/features/product-templates/components/product-template-card.tsx`
- Modify: settings navigation/breadcrumb message files as required by the existing settings route
- Test: `src/features/product-templates/pages/product-templates-page.test.tsx`, route guard test

**Interfaces:**
- The page consumes the hooks from Task 3 and exposes create/edit/duplicate/archive/delete/materialize actions.
- The route returns translated `{ breadcrumb, pageTitle }` and uses the existing `_org` authorization plus `canManageProducts` for finer access.

- [ ] **Step 1: Write the component and route guard tests**

```tsx
expect(screen.getByText('productTemplates.empty')).toBeDefined()
expect(screen.getByRole('button', { name: 'productTemplates.duplicate' })).toBeDefined()
```

Assert archived templates are absent from new-product selection, active templates show ownership/provenance, and unauthorized roles redirect to `/`.

- [ ] **Step 2: Implement the list/form using existing app primitives**

Use `PageHeader`, `PageContent`, `EmptyState`, `FormSheet`, `useAppForm`, translated copy, and responsive cards. Show active/archived status and a clear protected-delete error when references exist.

- [ ] **Step 3: Wire URL-driven edit/create overlays**

Use the established `globalOverlaySearchSchema`/nuqs pattern; do not introduce local `useSearchParams`. Add route metadata in `src/messages/types.ts` and both locale files.

- [ ] **Step 4: Run focused UI and route tests**

Run: `bun run test -- src/features/product-templates/pages/product-templates-page.test.tsx src/routes/_org/settings/-product-templates.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit the management UI**

```bash
git add src/routes/_org/settings/product-templates src/features/product-templates/pages src/features/product-templates/components src/messages
 git commit -m "feat: manage organization product templates"
```

### Task 7: Verify the complete product-template delivery

**Files:**
- Modify: affected test fixtures only
- Test: `src/features/product-templates/model.test.ts`, `src/features/product-templates/server.test.ts`, `src/features/products/model.test.ts`, `e2e/onboarding.spec.ts`

**Interfaces:**
- No new API; this task proves the cross-module contract from onboarding through product materialization and legacy reads.

- [ ] **Step 1: Run targeted feature tests**

```bash
bun run test -- src/features/product-templates src/features/products/model.test.ts src/features/products/components/product-form-sheet.test.tsx
bun run test:e2e -- e2e/onboarding.spec.ts
```

- [ ] **Step 2: Run schema/type/lint/build checks**

```bash
bun run typecheck
bun run check
bun run build
```

- [ ] **Step 3: Inspect migration metadata and verify no direct category branches were added**

Confirm the new migration is present in `drizzle/meta/_journal.json`; confirm product/template behavior references `itemizationMode`, field types, and lifecycle status rather than apparel/printing/tumbler category names.

- [ ] **Step 4: Commit verification adjustments**

```bash
git add src drizzle e2e
 git commit -m "test: verify product template delivery"
```
