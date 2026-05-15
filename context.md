# Code Context

## Files Retrieved

1. **`src/features/production/hooks.ts`** (lines 186-203) - Contains `useTaskByLineItemId` hook
2. **`src/features/production/server.ts`** (lines 295-320) - Contains `listTasksByOrderIdFn` server function
3. **`src/features/orders/pages/view-order-page.tsx`** (lines 360-410) - Contains `LineItemRow` component with badge rendering
4. **`drizzle/schema.ts`** (lines 557-596) - Contains `productionTasks` table definition

## Root Cause Analysis

**Problem**: Task status badges are not showing because of a schema-to-code mismatch.

### Issue 1: Missing `lineItemId` in Drizzle Schema

The `productionTasks` table schema (lines 557-596 in `drizzle/schema.ts`) does **NOT** define a `lineItemId` column:

```typescript
export const productionTasks = pgTable(
  'production_tasks',
  {
    id: text().primaryKey().notNull(),
    orgId: text('org_id').notNull(),
    orderId: text('order_id').notNull(),
    stageId: text('stage_id').notNull(),
    status: text().default('pending').notNull(),
    context: json().default({    // <-- Only has: productName, variantName, customerName, requirements
      productName: '',
      variantName: null,
      customerName: '',
      requirements: null,
    }),
    // ❌ lineItemId is missing from schema!
    ...
  },
)
```

The database has `lineItemId` as a separate column, but Drizzle doesn't know about it.

### Issue 2: Hook Filters Wrong Location

The hook in `hooks.ts` (lines 194-203) searches for `lineItemId` in the wrong place:

```typescript
export function useTaskByLineItemId(lineItemId: string, orderId: string) {
  const { data: allTasks } = useTasksForOrderInternal(orderId)
  
  if (!allTasks) return null
  
  // ❌ Looking in task.context for lineItemId
  const matchingTask = allTasks.find((bt) => {
    const ctx = bt.task.context as Record<string, unknown> | null
    return ctx?.lineItemId === lineItemId  // <-- context doesn't have lineItemId!
  })
  
  return matchingTask ?? null
}
```

The `context` JSON only contains `{productName, variantName, customerName, requirements}` - no `lineItemId`.

### Issue 3: Server Function Return Type Missing `lineItemId`

The `listTasksByOrderIdFn` in `server.ts` (lines 295-320) returns task data but `lineItemId` isn't included:

```typescript
return rows.map((t) => ({
  task: {
    ...t,  // <-- spread, but t doesn't have lineItemId per schema
    context: t.context as ...,
  },
  stage: t.stageId ? stageMap.get(t.stageId) ?? null : null,
}))
```

## Architecture

```
view-order-page.tsx (LineItemRow)
    └── useTaskByLineItemId(item.id, orderId)
            └── useTasksForOrderInternal(orderId)
                    └── listTasksByOrderIdFn({ orderId })
                            └── SELECT * FROM productionTasks WHERE orderId = ?

Badge condition: task && <Badge>{task.stage?.name ?? ...}</Badge>
                 ↓
                 task is always null because filter finds nothing
```

## Fixes Required

1. **Add `lineItemId` to Drizzle schema** (`drizzle/schema.ts`):
   ```typescript
   lineItemId: text('line_item_id'),
   ```

2. **Update server function** (`server.ts`) to include `lineItemId` in return type (already spread via `...t`, needs schema fix first).

3. **Update hook filter** (`hooks.ts` line 199-202) to use direct field:
   ```typescript
   const matchingTask = allTasks.find((bt) => bt.task.lineItemId === lineItemId)
   ```

## Start Here

1. **`drizzle/schema.ts`** - Add `lineItemId` column to `productionTasks` table, then run migration
2. **`src/features/production/server.ts`** - No code change needed if using `...t` spread
3. **`src/features/production/hooks.ts`** - Change filter from `ctx.lineItemId` to `bt.task.lineItemId`