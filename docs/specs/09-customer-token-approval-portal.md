# 09 - Customer Token Approval Portal

## Linked Issue

- GitHub #6: Slice 5 - Add secure customer order approval portal

## Goal

Allow external customers to review and confirm a scoped order through a secure token link without creating an account. The portal supports the full order lifecycle: draft confirmation, approval progress tracking, rejection handling, and order completion.

## Scope

- Admin generation of customer token links for draft orders.
- Confirmation modal after order creation showing the portal link.
- Public token route that does not require authentication.
- Customer review of order line items, totals, notes, and required information.
- Customer confirmation that moves the order to `pending` review.
- Full interactive draft portal: guest name/phone form, line item editing (name, notes, attachments), shipping address.
- Post-confirmation views for all order lifecycle states: approved, production, in_delivery, completed, rejected, cancelled.
- Expired, invalid, or unrelated token handling.

## Portal Views

The portal at `/order/$token` renders one of the following views based on `order.status`:

### DraftView

Single scrollable page with all interactive features.

**Sections (top to bottom):**

1. **Header** — "Konfirmasi Pesanan / Order Confirmation" heading.

2. **Line Items** — Read-only list with edit capability per item:
   - Product name (from catalog)
   - Quantity × unit price = line total
   - **Editable fields per line item:**
     - `name` — optional custom name override (text input)
     - `notes` — customization notes/spec (textarea)
     - `attachment` — file upload (multiple files per line item, `ownerType='order'`, `ownerId={lineItemId}`)
   - Upload uses portal upload pipeline (see Upload section below)
   - Asset display: thumbnail grid + filename + size, remove button per asset
   - Line item total

3. **Order Total** — Sum of all line items, right-aligned, large text.

4. **Shipping Address** (optional, collapsible section):
   - WNI toggle (Indonesian National / Foreign) — determines if area is required
   - Area search field with 500ms debounce, dropdown showing up to 20 area matches, "Area not found" on empty results. Disabled when WNI is false (WNA mode).
   - Street address textarea
   - If customer has a saved address on file, pre-fill it on page load
   - Customer can edit before confirming
   - Saving address: creates `addresses` record, links to `customers.addressId`, updates `orders.shippingAddress` JSONB

5. **Guest Information** (required):
   - Full name (required) — text input
   - Phone number (required) — tel input
   - Stored on the customer record on confirm

6. **Confirm Order Button**:
   - Validates: guest name filled, phone filled
   - On submit: calls `savePortalAddressFn` (if address changed), calls `confirmPortalOrderFn` → order transitions `draft` → `pending`
   - Shows `PendingView` after successful submission
   - Button shows loading state during submission

### PendingView

Full-page centered card:
- Green checkmark icon (CheckCircle2)
- "Pesanan Anda telah dikirim. Mohon tunggu persetujuan admin." / "Your order has been submitted. Please wait for admin approval."
- Order number if available

### ProgressView

For states: `approved`, `production`, `in_delivery`, `completed`, `cancelled`.

- Status badge with localized label
- Line items always visible (product name, qty × price, line total, notes)
- Attachments visible (read-only thumbnails)
- Order total
- For `completed`: "Pesanan selesai! Terima kasih ataspesanan Anda." / "Order completed! Thank you for your order."

### RejectedView

- Red X icon
- "Pesanan ditolak" / "Order Rejected"
- Rejection reason text (from `order.rejectReason`)
- "Hubungi Admin via WhatsApp" button (placeholder — uses existing i18n key `contactAdmin`)
- Order summary below

## Token Access Module

Treat customer token access as a deep module with a small interface.

- Validate token existence.
- Validate token-to-order scope.
- Return only customer-safe order data.
- Allow only token-safe actions.

Model functions in `src/features/portal/model.ts`:

| Function | Signature | Description |
|---|---|---|
| `generateOrderToken` | `(orderId: string) => Promise<string>` | Generates 32-char random token, stores in `orders.orderToken` |
| `getPortalOrder` | `(token: string) => PortalOrderResult` | Validates token, returns `PortalOrder` with customer-safe data |
| `confirmPortalOrder` | `(orderId: string) => PortalConfirmResult` | Validates `status === 'draft'`, sets `status = 'pending'` |
| `updatePortalLineItem` | `(itemId: string, input: UpdatePortalLineItemInput) => PortalConfirmResult` | Updates `name`, `notes`, `assetId` on a line item |
| `savePortalAddress` | `(orderId: string, address: ShippingAddress, isWni: boolean) => SavePortalAddressResult` | Creates address record, links to customer, updates order shippingAddress |
| `getPortalCustomerAddress` | `(customerId: string, orgId: string) => ShippingAddress \| null` | Returns customer's saved address for pre-filling |

`UpdatePortalLineItemInput`:
```typescript
{
  name?: string
  notes?: string
  assetId?: string | null
}
```

## Portal Upload Pipeline

The portal needs to support file uploads without authentication. A token-authenticated server function layer wraps the existing upload pipeline.

### Server Functions

| Function | Method | Input | Description |
|---|---|---|---|
| `portalGetUploadUrlFn` | POST | `{ fileName, fileType, fileSize, lineItemId }` | Validates token + lineItemId scope, returns R2 signed PUT URL |
| `portalFinalizeUploadFn` | POST | `{ assetId, lineItemId, originalFilename, mimeType, sizeBytes, checksumSha256?, storageKey }` | Validates token, inserts asset with `ownerType='order'`, `ownerId={lineItemId}`, `usage='attachment'` |

Both functions:
1. Validate the portal token from request headers or input
2. Resolve `orgId` from the order via the token lookup
3. Delegate to shared upload helpers extracted from `src/features/assets/server.ts`

### Shared Upload Helpers

Extract from `assets/server.ts` into `assets/model.ts` (plain async functions, testable without server boundary):

| Function | Description |
|---|---|
| `buildUploadUrl(orgId, ownerType, ownerId, assetId, ext)` | Generates signed R2 PUT URL for upload |
| `insertAsset(record)` | Inserts asset + original variant into DB |

### Asset Display Per Line Item

Line item attachments queried via `getAssetsForLineItem(lineItemId, orgId)` — existing function that queries `assets` table by `ownerType='order'` and `ownerId={lineItemId}`.

The `PortalLineItem` type gets an `assetIds: string[]` field populated by this query.

## Data Model Changes

### Drizzle Schema

`orderLineItems` Drizzle definition in `src/db/schema.ts` must add the missing `assetId` column:

```typescript
orderLineItems = pgTable('order_line_items', {
  // ... existing columns
  assetId: text('asset_id').references(() => assets.id, { onDelete: 'set null' }),
})
```

### PortalOrder Type Changes

`PortalLineItem` in `src/features/portal/model.ts`:
```typescript
export type PortalLineItem = {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  name: string | null
  notes: string | null
  assetIds: string[]       // NEW: query assets where ownerType='order', ownerId=lineItemId
  createdAt: Date
}
```

`getPortalOrder` SQL query joins `assets` for each line item to populate `assetIds`.

## Admin Confirmation Modal

Shown after successful draft order creation at `src/features/orders/pages/create-order-page.tsx`.

### Behavior

1. On successful `createDraftOrder` → order created with status `draft`
2. Navigate to order detail page BUT first show a confirmation modal before navigation
3. Modal content:
   - "Pesanan dibuat! / Order Created!" header
   - Order summary (customer name, total)
   - `[Generate Link]` button — calls `generateOrderTokenFn({ orderId })`, then shows the full portal URL in a styled input with a `[Copy Link]` button
   - Admin can dismiss the modal and go to order detail
4. Modal uses existing `AlertDialog` component

### Implementation

- Add local state `showConfirmationModal` defaulting to `true` after successful order creation
- `generateOrderTokenFn` called on modal open (or on "Generate Link" button click per user preference — Manual Generate in Modal)
- Copy uses `navigator.clipboard.writeText` + `toast.success(t('linkCopied'))`
- Portal URL format: `{window.location.origin}/order/{token}`

## i18n Coverage

All user-facing strings must use i18n keys. Verify all below are present in `src/messages/en.ts` and `src/messages/id.ts` under the `portal` namespace:

| Key | en | id |
|---|---|---|
| `title` | "Order Confirmation" | "Konfirmasi Pesanan" |
| `waitApproval` | "Your order has been submitted. Please wait for admin approval." | "Pesanan Anda telah dikirim. Mohon tunggu persetujuan admin." |
| `lineItems` | "Order Items" | "Item Pesanan" |
| `quantity` | "Qty" | "Jml" |
| `orderTotal` | "Order Total" | "Total Pesanan" |
| `submit` | "Confirm Order" | "Konfirmasi Pesanan" |
| `submitting` | "Submitting..." | "Mengirim..." |
| `guestName` | "Full Name" | "Nama Lengkap" |
| `guestPhone` | "Phone Number" | "Nomor Telepon" |
| `copyLink` | "Copy Link" | "Salin Tautan" |
| `linkCopied` | "Link copied!" | "Tautan berhasil disalin!" |
| `notFound` | "Order not found" | "Pesanan tidak ditemukan" |
| `required` | "This field is required" | "Kolom ini wajib diisi" |
| `areaRequired` | "Please select an area" | "Silakan pilih area" |
| `shippingAddress` | "Shipping Address" | "Alamat Pengiriman" |
| `itemName` | "Item Name" | "Nama Item" |
| `itemNamePlaceholder` | "Enter item name (optional override)" | "Masukkan nama item (opsional)" |
| `itemNotes` | "Notes / Specification" | "Catatan / Spesifikasi" |
| `itemNotesPlaceholder` | "Add notes or specifications for this item" | "Tambahkan catatan atau spesifikasi untuk item ini" |
| `attachment` | "Attachment" | "Lampiran" |
| `addAttachment` | "Add attachment" | "Tambah lampiran" |
| `orderSummary` | "Order Summary" | "Ringkasan Pesanan" |
| `statusDraft` | "Pending Confirmation" | "Menunggu Konfirmasi" |
| `statusPending` | "Awaiting Approval" | "Menunggu Persetujuan" |
| `statusApproved` | "Approved" | "Disetujui" |
| `statusProduction` | "In Production" | "Dalam Produksi" |
| `statusInDelivery` | "In Delivery" | "Dalam Pengiriman" |
| `statusCompleted` | "Completed" | "Selesai" |
| `statusCancelled` | "Cancelled" | "Dibatalkan" |
| `rejectedTitle` | "Order Rejected" | "Pesanan Ditolak" |
| `contactAdmin` | "Contact Admin via WhatsApp" | "Hubungi Admin via WhatsApp" |

## Route Changes

- `src/routes/order.$token.tsx` — Refactor to delegate to `PortalPage` component; keep route-level params parsing and auth-gate (token validation → 404)
- `src/features/orders/pages/create-order-page.tsx` — Add confirmation modal post-order-creation

## File Map

### Modify

| File | Changes |
|---|---|
| `src/db/schema.ts` | Add `assetId` column to `orderLineItems` |
| `src/features/portal/model.ts` | Add `assetIds` to `PortalLineItem`, update `getPortalOrder` query, add `getPortalCustomerAddress` |
| `src/features/portal/server.ts` | Add `portalGetUploadUrlFn`, `portalFinalizeUploadFn` |
| `src/features/portal/hooks.ts` | Add hooks for portal upload functions |
| `src/features/assets/server.ts` | Extract shared helpers (`buildUploadUrl`, `insertAsset`) |
| `src/features/orders/pages/create-order-page.tsx` | Add post-creation confirmation modal |
| `src/routes/order.$token.tsx` | Delegate to `PortalPage` component |
| `src/messages/en.ts` | Verify/add missing portal keys |
| `src/messages/id.ts` | Verify/add missing portal keys |

### Create

| File | Purpose |
|---|---|
| `src/features/portal/pages/portal-page.tsx` | Main portal page with all view components (DraftView, PendingView, ProgressView, RejectedView) |
| `src/components/app/asset-upload/r2-portal-adapter.ts` | Portal-specific R2 adapter using portal upload server functions instead of auth-based ones |

## Acceptance Criteria

- [ ] Admins can create a draft order and receive a portal link via the confirmation modal
- [ ] Customers open `/order/$token` without login and see their order
- [ ] Draft customers can: edit line item name/notes, upload attachments per line item, fill guest name/phone (required), fill shipping address (optional)
- [ ] Confirm button moves order `draft` → `pending`
- [ ] PendingView shown immediately after confirmation
- [ ] ProgressView shown for approved, production, in_delivery, completed states
- [ ] RejectedView shows rejection reason + contact admin button
- [ ] Cancelled shows generic status badge + line items
- [ ] Line items visible in all non-draft states
- [ ] Address pre-fills from customer's saved address on file
- [ ] Portal upload works without authentication via token-authenticated server functions
- [ ] All UI text uses i18n keys
- [ ] Tests cover token scope, invalid tokens, confirmation, line item updates, address save, and portal upload

## Dependency Order

1. Schema + types (`orderLineItems.assetId`, `PortalLineItem.assetIds`)
2. Portal model functions (`getPortalCustomerAddress`, update `getPortalOrder`)
3. Extract shared upload helpers from assets/server.ts
4. Portal upload server functions + hooks
5. `PortalPage` component with all views
6. Update `create-order-page.tsx` confirmation modal
7. Update route delegation
8. i18n verification
9. Tests + final verification (`bun run check && bun run typecheck && bun run test && bun run build`)
