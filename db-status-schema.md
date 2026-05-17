# Database Status Field Analysis

**Source:** `src/db/schema.ts` dan model type definitions di `src/features/`

---

## 1. `invitation` (Better Auth — organization plugin)

| Field    | Definition                    | Default   |
|----------|-------------------------------|-----------|
| `status` | `text('status').notNull()`    | (none in schema, `'pending'` via Zod) |

**Possible values** (dari Better Auth `invitationStatus` enum):
```
'pending' | 'accepted' | 'rejected' | 'canceled'
```

**Referensi:** `node_modules/better-auth/dist/plugins/organization/schema.mjs` line 5–8

---

## 2. `orders`

| Field    | Definition                                   | Default |
|----------|----------------------------------------------|---------|
| `status` | `text('status').notNull().default('draft')`  | `draft` |

**Possible values** (dari kode model di `src/features/orders/model.ts`):
```
'draft' | 'pending' | 'approved' | 'in_progress' | 'in_delivery' | 'completed' | 'rejected'
```

**Lifecycle (state machine):**
```
draft ──(confirmPortalOrder)──► pending
pending ──(approveOrder)──► approved
pending ──(rejectOrder)──► rejected
approved ──(advanceOrderStatus)──► in_progress
in_progress ──(advanceOrderStatus atau markShipped)──► in_delivery
in_delivery ──(advanceOrderStatus)──► completed
```

**Referensi:**
- Schema: `src/db/schema.ts` lines 137–164
- Model: `src/features/orders/model.ts` lines 457, 475 (draft), 463 (pending via portal), 624 (pending guard), 631 (approved), 658 (rejected), 682–695 (advance), 685 (in_progress), 695 (completed), 739 (in_delivery guard), 748 (shippedAt)

---

## 3. `invoices`

| Field    | Definition                                    | Default  |
|----------|-----------------------------------------------|----------|
| `status` | `text('status').notNull().default('unpaid')`  | `unpaid` |

**Possible values** (dari `Invoice` type di `src/features/invoices/model.ts`):
```
'unpaid' | 'partially_paid' | 'paid' | 'void'
```

**Lifecycle:**
```
unpaid ──(create payment + confirm)──► partially_paid (jika sisa > 0) atau paid (jika sisa ≤ 0)
unpaid ──(voidInvoice)──► void
partially_paid ──(confirm more payment)──► paid (jika sisa ≤ 0)
```

**Referensi:**
- Schema: `src/db/schema.ts` lines 199–227
- Type: `src/features/invoices/model.ts` line 19
- Transitions: lines 246, 280 (unpaid default), 421–422 (guard), 465 (paid), 495 (void), 655 (paid), 664 (partially_paid)

---

## 4. `payments`

| Field    | Definition                                    | Default   |
|----------|-----------------------------------------------|-----------|
| `status` | `text('status').notNull().default('pending')` | `pending` |

**Possible values** (dari `Payment` type di `src/features/invoices/model.ts`):
```
'pending' | 'confirmed' | 'rejected' | 'refunded'
```

**Lifecycle:**
```
pending ──(confirmPayment)──► confirmed
pending ──(rejectPayment)──► rejected
```

> **Catatan:** `'refunded`' ada di tipe tetapi belum ada kode transisi ke status ini — kemungkinan untuk penggunaan di masa depan.

**Referensi:**
- Schema: `src/db/schema.ts` lines 287–309
- Type: `src/features/invoices/model.ts` line 102
- Transitions: lines 602 (pending default), 641 (confirmed), 696 (rejected)

---

## 5. `productionTasks`

| Field    | Definition                                      | Default  |
|----------|-------------------------------------------------|----------|
| `status` | `text('status').notNull().default('queued')`    | `queued` |

**Possible values** (dari kode model di `src/features/production/model.ts`):
```
'queued' | 'in_progress' | 'pending_approval' | 'completed'
```

**Lifecycle:**
```
queued ──(advanceTask, stage pertama)──► in_progress
in_progress ──(advanceTask, stage berikutnya)──► in_progress (lanjut stage)
in_progress ──(advanceTask, stage butuh approval)──► pending_approval
pending_approval ──(approveTask)──► in_progress (lanjut)
pending_approval ──(rejectTask)──► in_progress (kembali)
in_progress ──(advanceTask, stage terakhir selesai)──► completed
(ketika semua task selesai) ──(archiveBoardTasks)──► archivedAt diisi, status tetap `completed`
```

**Referensi:**
- Schema: `src/db/schema.ts` lines 327–351
- Model: `src/features/production/model.ts` lines 265 (guard), 269 (queued check), 360, 414, 458, 480, 566, 591, 615, 657, 745, 796
- Spawner: `src/features/production/spawner.ts` lines 46, 87, 116, 156

---

## 6. `assets`

| Field    | Definition                                    | Default   |
|----------|-----------------------------------------------|-----------|
| `status` | `text('status').notNull().default('pending')` | `pending` |

**Possible values** (dari `AssetStatus` type di `src/features/assets/model.ts`):
```
'pending' | 'active' | 'deleted'
```

**Lifecycle:**
```
pending ──(processing selesai)──► active
active ──(soft delete)──► deleted (via deletedAt timestamp)
```

> **Catatan:** Ada `UploadStatus` terpisah (`'pending' | 'uploading' | 'processing' | 'done' | 'failed'`) untuk upload client-side machine, berbeda dari `AssetStatus` di database.

**Referensi:**
- Schema: `src/db/schema.ts` lines 374–395
- Type: `src/features/assets/model.ts` line 18

---

## Ringkasan

| Entity           | Field    | DB Default        | Possible Values                                                                 |
|------------------|----------|-------------------|---------------------------------------------------------------------------------|
| `invitation`     | `status` | `'pending'`       | `pending \| accepted \| rejected \| canceled`                                  |
| `orders`         | `status` | `'draft'`         | `draft \| pending \| approved \| in_progress \| in_delivery \| completed \| rejected` |
| `invoices`       | `status` | `'unpaid'`        | `unpaid \| partially_paid \| paid \| void`                                     |
| `payments`       | `status` | `'pending'`       | `pending \| confirmed \| rejected \| refunded` (refunded belum diimplementasikan) |
| `productionTasks`| `status` | `'queued'`        | `queued \| in_progress \| pending_approval \| completed`                       |
| `assets`         | `status` | `'pending'`       | `pending \| active \| deleted`                                                 |

**Tidak ada constraint CHECK/ENUM di database — semua hanya kolom `text`.** Validasi status hanya dilakukan di lapisan aplikasi (TypeScript types + runtime guards di model functions).
