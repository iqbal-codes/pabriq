# Issue #78: Make invoice and payment ownership enforceable

## Problem
Payment operations lack proper ownership verification, amount validation, and relationship checks. Cross-tenant data leakage is possible.

## Changes

### 1. `createPayment` — ownership + amount validation
**File:** `src/features/invoices/model.ts:762`
- Verify invoice belongs to caller's org (query with `orgId` filter, throw if not found)
- Validate amount: `Number.isFinite(amount)`, `amount > 0`, `amount <= remaining balance`
- Validate `proofAssetId` exists in the same org if provided
- Validate `method` is one of the allowed values

### 2. `confirmPayment` — relationship validation
**File:** `src/features/invoices/model.ts:795`
- Already verifies payment belongs to org ✓
- Add: verify payment amount is finite and positive (defensive)

### 3. Portal `submitPaymentProofFn` — invoice↔order ownership
**File:** `src/features/portal/server.ts:172`
- After resolving `orgId` from token, verify the invoice belongs to an order that matches the portal token's order
- Query: `invoice.orderId` matches the order resolved from token

### 4. `getAssetSignedUrl` — inline access org check
**File:** `src/features/assets/server.ts:269`
- For non-attachment (inline) mode: also verify the asset belongs to the org
- Currently only attachment mode checks `eq(assets.orgId, orgId)`

### 5. Tests
**File:** `src/features/invoices/model.test.ts` (new)
- Test `createPayment` rejects when invoice not in org
- Test `createPayment` rejects non-finite amount
- Test `createPayment` rejects non-positive amount
- Test `createPayment` rejects amount exceeding remaining balance

## Verification
1. `bun run test -- src/features/invoices/model.test.ts`
2. `bun run test -- src/features/assets/server.test.ts`
3. `bunx @biomejs/biome check src/`
