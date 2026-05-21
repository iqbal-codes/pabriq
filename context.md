# Code Context

## Files Retrieved

### Database Schema
1. `src/db/schema.ts` (lines 147-170) - Products table schema with `productionDays` field
2. `src/db/schema.ts` (lines 202-225) - Orders table schema (no deadline field)

### Order Model
3. `src/features/orders/model.ts` (lines 1-750) - Order types, createDraftOrder, updateDraftOrder, approveOrder, etc.

### Order Server Functions
4. `src/features/orders/server.ts` (lines 1-310) - Server functions for order CRUD operations

### Order UI Components
5. `src/features/orders/components/order-form-fields.tsx` (lines 1-250) - Order form UI component
6. `src/features/orders/pages/create-order-page.tsx` (lines 1-150) - Create order page
7. `src/features/orders/pages/edit-order-page.tsx` (lines 1-100) - Edit order page
8. `src/features/orders/pages/orders-list-page.tsx` (lines 1-400) - Orders list with dueDate display

### Order Hooks
9. `src/features/orders/hooks.ts` (lines 1-130) - React Query hooks for orders

### Product Model
10. `src/features/products/model.ts` (lines 1-250) - Product types with `productionDays`

### Production/Portal
11. `src/features/production/spawner.ts` (lines 1-150) - Task spawning for approved orders
12. `src/features/portal/model.ts` (lines 1-300) - Portal model with productionDays usage

---

## Key Code

### Order Schema (`src/db/schema.ts` lines 202-225)
```typescript
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  customerId: text('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('draft'),
  notes: text('notes'),
  total: real('total').notNull().default(0),
  orderNumber: text('order_number'),
  orderToken: text('order_token').unique(),
  validUntil: timestamp('valid_until'),  // <-- Only date-like field, for quote validity
  shippingAddress: json('shipping_address'),
  approvedAt: timestamp('approved_at'),
  approvedBy: text('approved_by'),
  rejectedAt: timestamp('rejected_at'),
  rejectedBy: text('rejected_by'),
  rejectReason: text('reject_reason'),
  courier: text('courier'),
  trackingNumber: text('tracking_number'),
  shippedAt: timestamp('shipped_at'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```
**Note:** NO `deadline` field on orders table.

### Product Schema (`src/db/schema.ts` lines 147-170)
```typescript
export const products = pgTable('products', {
  // ... other fields ...
  productionDays: integer('production_days').notNull().default(1),  // <-- EXISTS
  // ... other fields ...
})
```

### Order Model Type (`src/features/orders/model.ts`)
```typescript
export type Order = {
  id: string
  orgId: string
  customerId: string | null
  status: string
  notes: string | null
  total: number
  orderNumber: string | null
  orderToken: string | null
  validUntil: Date | null
  // ... other fields ...
  // NO deadline field
}

export type CreateDraftOrderInput = {
  customerId: string | null
  notes?: string
  lineItems: LineItemInput[]
}
```

### createDraftOrder function (`src/features/orders/model.ts` lines 438-512)
```typescript
export async function createDraftOrder(
  orgId: string,
  input: CreateDraftOrderInput,
): Promise<CreateDraftOrderResult> {
  // ... validation ...
  
  const orderTotal = items.reduce((sum, i) => sum + i.total, 0)
  const orderNumber = await generateOrderNumber(orgId)
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)  // 7 days from now

  await db.insert(ordersTable).values({
    id: orderId,
    orgId,
    customerId,
    status: 'draft',
    notes: input.notes ?? null,
    total: orderTotal,
    orderNumber,
    validUntil,  // <-- Only "deadline-like" field, used for quote validity
    createdAt: now,
    updatedAt: now,
  })
  
  // NO deadline calculation based on productionDays
}
```

### OrderLineItem Schema (`src/db/schema.ts` lines 227-243)
```typescript
export const orderLineItems = pgTable('order_line_items', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: real('unit_price').notNull(),
  total: real('total').notNull(),
  name: text('name'),  // Override product name
  notes: text('notes'),
  assetId: text('asset_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

### Product Model (`src/features/products/model.ts`)
```typescript
export type Product = {
  id: string
  orgId: string
  name: string
  description: string | null
  active: boolean
  priority: boolean
  productionNotes: string | null
  primaryImageAssetId: string | null
  basePrice: number
  productionDays: number  // <-- EXISTS
  minQuantity: number
  maxQuantity: number | null
  pricingMode: 'interpolated' | 'step'
  createdAt: Date
  updatedAt: Date
}

export type CreateProductInput = {
  orgId: string
  name: string
  productionDays?: number  // <-- Field exists
  // ... other fields ...
}
```

### Portal Model shows productionDays usage (`src/features/portal/model.ts`)
```typescript
export type PortalLineItem = {
  // ... other fields ...
  productionDays: number  // <-- Gets from product
}

// In getPortalOrder function:
const productDaysMap = new Map(
  productRows.map((p) => [p.id, p.productionDays])
)
// productionDays is used but only for display, not deadline calculation
```

---

## Architecture

### Order Creation Flow
```
User clicks "Create Order" 
  → /orders/new route 
  → CreateOrderPage component
  → form.handleSubmit()
  → useCreateDraftOrder().mutateAsync()
  → createDraftOrderFn (server function)
  → createDraftOrder() in model.ts
    → Validate customer
    → For each lineItem: validate product, compute pricing
    → Generate orderNumber
    → Set validUntil = now + 7 days
    → INSERT orders table
    → INSERT order_line_items
    → Return { order, lineItems }
```

### Order Edit Flow
```
User clicks "Edit" on order
  → /orders/$id/edit route
  → EditOrderPage component
  → useOrder() loads existing order
  → form.handleSubmit()
  → useUpdateDraftOrder().mutateAsync()
  → updateDraftOrderFn (server function)
  → updateDraftOrder() in model.ts
    → Validate order is 'draft'
    → Validate customer
    → Delete existing line items
    → Insert new line items with new pricing
    → UPDATE orders.total
    → Return { order, lineItems }
```

### Task Spawning Flow (on approval)
```
User approves order
  → approveOrderFn (server function)
  → approveOrder() in model.ts
  → spawnTasksForApprovedOrder() in spawner.ts
    → Get order + line items
    → For each line item, create a production task
    → NO deadline calculation happens here
```

---

## Start Here

1. **`src/features/orders/model.ts`** - Main order business logic. Look at `createDraftOrder()` (line 438) to add deadline calculation. Look at `Order` type (line 17) to add deadline field.

2. **`src/db/schema.ts`** - To add `deadline` column to `orders` table, add migration. Current schema at lines 202-225.

3. **`src/features/orders/components/order-form-fields.tsx`** - To add deadline field to UI. Currently only has customer, notes, and line items.

4. **`src/features/orders/pages/create-order-page.tsx`** - Entry point for order creation, integrates form and handles submission.

5. **`src/features/products/model.ts`** - To understand `productionDays` field. `createProduct()` at line 99 handles it.

6. **`src/features/production/spawner.ts`** - Where tasks are created. Could add deadline logic here if needed.

---

## Key Discovery: NO Deadline Calculation Logic

**There is NO existing deadline calculation based on `productionDays`.**

The flow is:
- `productionDays` exists on products (defaults to 1)
- It's displayed in product forms and detail pages
- It's used in the portal (progress view) for display purposes only
- It is NOT used anywhere to calculate a deadline for orders

**What's needed:**
1. Add `deadline` column to `orders` table (migration)
2. In `createDraftOrder()`: Calculate deadline based on max productionDays of line items
3. Optionally display deadline in order form and order detail pages

---

## No Existing Working Days Logic

Searched for: `workingDays`, `businessDays`, `addDays`, date calculation
- **No matches found** for working days / business days calculation
- `validUntil` in orders is calculated as `now + 7 days` (simple calendar days)
- No business day handling exists

---

## Supervisor coordination

If you need decisions on:
- Whether to use simple calendar days or business days for deadline calculation
- Whether deadline should be editable or auto-calculated
- How to handle orders with multiple products (max vs sum of productionDays)

Use `contact_supervisor` with `reason: "need_decision"`.