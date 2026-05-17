# Status-Related Translation Keys

> Extracted from `src/messages/types.ts`, `en.ts`, and `id.ts`
> **Sources:** `src/messages/en.ts` (460 lines) and `src/messages/id.ts` (460 lines)

---

## 1. Centralized `status` Namespace

This is the master list of canonical status labels used across the app.

| Key                     | EN              | ID                  |
| ----------------------- | --------------- | ------------------- |
| `status.draft`          | Draft           | Draf                |
| `status.pending`        | Pending         | Tertunda            |
| `status.approved`       | Approved        | Disetujui           |
| `status.in_progress`    | In Progress     | Sedang Diproses     |
| `status.production`     | In Production   | Dalam Produksi      |
| `status.in_delivery`    | In Delivery     | Dalam Pengiriman    |
| `status.completed`      | Completed       | Selesai             |
| `status.cancelled`      | Cancelled       | Dibatalkan          |
| `status.rejected`       | Rejected        | Ditolak             |
| `status.active`         | Active          | Aktif               |
| `status.inactive`       | Inactive        | Tidak Aktif         |
| `status.paid`           | Paid            | Lunas               |
| `status.partially_paid` | Partially Paid  | Dibayar Sebagian    |
| `status.unpaid`         | Unpaid          | Belum Dibayar       |
| `status.void`           | Void            | Batal               |
| `status.overdue`        | Overdue         | Jatuh Tempo         |
| `status.pendingPayment` | Pending Payment | Menunggu Konfirmasi |
| `status.failed`         | Failed          | Gagal               |

**File locations:**

- `types.ts` lines 279–297
- `en.ts` lines 196–214
- `id.ts` lines 196–214

---

## 2. Common "Status" Labels

| Key               | EN     | ID     | File line                 |
| ----------------- | ------ | ------ | ------------------------- |
| `common.status`   | Status | Status | types:78, en:81, id:81    |
| `orders.status`   | Status | Status | types:194, en:111, id:111 |
| `invoices.status` | Status | Status | types:417, en:417, id:419 |

---

## 3. Order Status Keys (`orders.*`)

### Status action buttons

| Key                              | EN                         | ID                        | File line                 |
| -------------------------------- | -------------------------- | ------------------------- | ------------------------- |
| `orders.approve`                 | Approve                    | Setujui                   | types:235, en:152, id:152 |
| `orders.reject`                  | Reject                     | Tolak                     | types:236, en:153, id:153 |
| `orders.rejectReason`            | Rejection Reason           | Alasan Penolakan          | types:237, en:154, id:154 |
| `orders.rejectReasonPlaceholder` | Enter reason for rejection | Masukkan alasan penolakan | types:238, en:155, id:155 |
| `orders.completeOrder`           | Complete Order             | Selesaikan Pesanan        | types:242, en:159, id:159 |

### Status change success messages

| Key                     | EN              | ID                | File line                 |
| ----------------------- | --------------- | ----------------- | ------------------------- |
| `orders.orderApproved`  | Order approved  | Pesanan disetujui | types:239, en:156, id:156 |
| `orders.orderRejected`  | Order rejected  | Pesanan ditolak   | types:240, en:157, id:157 |
| `orders.orderCompleted` | Order completed | Pesanan selesai   | types:241, en:158, id:158 |

### Payment-specific status keys

| Key                           | EN             | ID                | File line                 |
| ----------------------------- | -------------- | ----------------- | ------------------------- |
| `orders.paymentStatus`        | Payment Status | Status Pembayaran | types:243, en:160, id:160 |
| `orders.paymentNoInvoice`     | No Invoice     | Tanpa Invoice     | types:244, en:161, id:161 |
| `orders.paymentPaid`          | Paid           | Lunas             | types:247, en:164, id:164 |
| `orders.paymentUnpaid`        | Unpaid         | Belum Dibayar     | types:248, en:165, id:165 |
| `orders.paymentPartiallyPaid` | Partially Paid | Dibayar Sebagian  | types:249, en:166, id:166 |
| `orders.paymentVoid`          | Void           | Batal             | types:250, en:167, id:167 |

---

## 4. Invoice Status Keys (`invoices.*`)

### Status action buttons

| Key                                | EN                                 | ID                                   | File line                 |
| ---------------------------------- | ---------------------------------- | ------------------------------------ | ------------------------- |
| `invoices.markAsPaid`              | Mark as Paid                       | Tandai Lunas                         | types:422, en:422, id:424 |
| `invoices.voidInvoice`             | Void Invoice                       | Batalkan Invoice                     | types:423, en:423, id:425 |
| `invoices.voidConfirm`             | Are you sure... void this invoice? | Yakin ingin membatalkan Invoice ini? | types:424, en:424, id:426 |
| `invoices.confirmSimple`           | Confirm                            | Konfirmasi                           | types:439, en:439, id:441 |
| `invoices.rejectSimple`            | Reject                             | Tolak                                | types:440, en:440, id:442 |
| `invoices.rejectReasonPlaceholder` | Reason for rejection               | Alasan penolakan                     | types:441, en:441, id:443 |
| `invoices.confirmPayment`          | Confirm Payment                    | Konfirmasi Pembayaran                | types:453, en:453, id:455 |

### Status values / labels

| Key                            | EN                   | ID                  | File line                 |
| ------------------------------ | -------------------- | ------------------- | ------------------------- |
| `invoices.pendingConfirmation` | Pending confirmation | Menunggu konfirmasi | types:454, en:454, id:456 |
| `invoices.overdue`             | Overdue              | Jatuh Tempo         | types:458, en:458, id:458 |
| `invoices.pendingAmount`       | Pending              | Menunggu            | types:436, en:436, id:438 |
| `invoices.paidAmount`          | Paid                 | Dibayar             | types:435, en:435, id:437 |

### Status change messages

| Key                         | EN                     | ID                             | File line                 |
| --------------------------- | ---------------------- | ------------------------------ | ------------------------- |
| `invoices.paymentConfirmed` | Payment confirmed      | Pembayaran dikonfirmasi        | types:445, en:445, id:447 |
| `invoices.paymentRecorded`  | Payment recorded       | Pembayaran dicatat             | types:446, en:446, id:448 |
| `invoices.paymentRejected`  | Payment rejected       | Pembayaran ditolak             | types:447, en:447, id:449 |
| `invoices.invoicePaid`      | Invoice marked as paid | Invoice ditandai sudah dibayar | types:450, en:450, id:450 |

---

## 5. Production Status Keys (`production.*`)

### Dedicated production status labels

| Key                           | EN          | ID                | File line                 |
| ----------------------------- | ----------- | ----------------- | ------------------------- |
| `production.statusQueued`     | Queued      | Dalam Antrian     | types:544, en:544, id:548 |
| `production.statusInProgress` | In Progress | Sedang Dikerjakan | types:545, en:545, id:549 |
| `production.statusCompleted`  | Completed   | Selesai           | types:546, en:546, id:550 |

### General status labels in production

| Key                          | EN                | ID                   | File line                 |
| ---------------------------- | ----------------- | -------------------- | ------------------------- |
| `production.pendingApproval` | Pending Approval  | Menunggu Persetujuan | types:547, en:547, id:547 |
| `production.queue`           | Queue             | Antrian              | types:487, en:487, id:489 |
| `production.done`            | Done              | Selesai              | types:488, en:488, id:490 |
| `production.active`          | Active            | Aktif                | types:524, en:524, id:526 |
| `production.inactive`        | Inactive          | Tidak Aktif          | types:525, en:525, id:527 |
| `production.canceled`        | Canceled          | Dibatalkan           | types:512, en:512, id:514 |
| `production.needApproval`    | Requires Approval | Perlu Persetujuan    | types:520, en:520, id:522 |
| `production.required`        | Required          | Wajib                | types:531, en:531, id:533 |
| `production.optional`        | Optional          | Opsional             | types:532, en:532, id:534 |

### Production action buttons

| Key                               | EN                     | ID                   | File line                 |
| --------------------------------- | ---------------------- | -------------------- | ------------------------- |
| `production.startProduction`      | Start Pre-Production   | Mulai Pra-Produksi   | types:494, en:494, id:498 |
| `production.continueToProduction` | Continue to Production | Lanjut Produksi      | types:495, en:495, id:499 |
| `production.advanceTo`            | Advance to {stage}     | Lanjutkan ke {stage} | types:496, en:496, id:500 |
| `production.completeRequirements` | Complete Requirements  | Lengkapi Persyaratan | types:497, en:497, id:502 |
| `production.requestReview`        | Request Review         | Minta Review         | types:502, en:502, id:506 |
| `production.reviewAdvancement`    | Review Advancement     | Review Kemajuan      | types:503, en:503, id:507 |
| `production.approve`              | Approve & Advance      | Setujui & Lanjutkan  | types:504, en:504, id:508 |
| `production.approveOrder`         | Approve Order          | Setujui Pesanan      | types:505, en:505, id:509 |
| `production.reject`               | Reject                 | Tolak                | types:506, en:506, id:510 |
| `production.rejectOrder`          | Reject Order           | Tolak Pesanan        | types:507, en:507, id:511 |
| `production.cancelOrder`          | Cancel Order           | Batalkan Pesanan     | types:508, en:508, id:512 |
| `production.markAsShipped`        | Mark as Shipped        | Tandai Dikirim       | types:570, en:570, id:574 |
| `production.completeProduction`   | Complete Production    | Selesaikan Produksi  | types:571, en:571, id:575 |
| `production.createInvoiceAndShip` | Create Invoice & Ship  | Buat Invoice & Kirim | types:584, en:584, id:586 |

### Production status change messages

| Key                               | EN                               | ID                                | File line                 |
| --------------------------------- | -------------------------------- | --------------------------------- | ------------------------- |
| `production.movedToStage`         | Moved to {stage}                 | Dipindahkan ke {stage}            | types:535, en:535, id:537 |
| `production.advancedFromQueue`    | Advanced from Queue              | Maju dari Antrian                 | types:536, en:536, id:539 |
| `production.advancementRequested` | Advancement requested            | Kemajuan diminta                  | types:537, en:537, id:540 |
| `production.approved`             | Approved by {actor}              | Disetujui oleh {actor}            | types:538, en:538, id:541 |
| `production.rejected`             | Rejected by {actor}              | Ditolak oleh {actor}              | types:539, en:539, id:542 |
| `production.taskCompleted`        | Task completed                   | Tugas selesai                     | types:541, en:541, id:544 |
| `production.orderApproved`        | Order approved successfully      | Pesanan berhasil disetujui        | types:542, en:542, id:545 |
| `production.orderRejected`        | Order rejected                   | Pesanan ditolak                   | types:543, en:543, id:546 |
| `production.allTasksCompleted`    | All tasks have been completed ✓  | Semua tugas telah selesai ✓       | types:580, en:580, id:583 |
| `production.tasksNotCompleted`    | Some tasks are still in progress | Beberapa tugas masih dalam proses | types:581, en:581, id:584 |

### Production stage status labels

| Key                             | EN             | ID           | File line                 |
| ------------------------------- | -------------- | ------------ | ------------------------- |
| `production.tabActive`          | Active Tasks   | Tugas Aktif  | types:555, en:555, id:557 |
| `production.boardPreProduction` | Pre-Production | Pra-Produksi | types:560, en:560, id:562 |
| `production.boardProduction`    | Production     | Produksi     | types:561, en:561, id:563 |

---

## 6. Portal Status Keys (`portal.*`)

### Order status labels (for portal/public view)

| Key                       | EN                   | ID                   | File line                 |
| ------------------------- | -------------------- | -------------------- | ------------------------- |
| `portal.statusDraft`      | Pending Confirmation | Menunggu Konfirmasi  | types:620, en:621, id:624 |
| `portal.statusPending`    | Awaiting Approval    | Menunggu Persetujuan | types:621, en:622, id:625 |
| `portal.statusApproved`   | Approved             | Disetujui            | types:622, en:623, id:626 |
| `portal.statusProduction` | In Production        | Dalam Produksi       | types:623, en:624, id:627 |
| `portal.statusInDelivery` | In Delivery          | Dalam Pengiriman     | types:624, en:625, id:628 |
| `portal.statusCompleted`  | Completed            | Selesai              | types:625, en:626, id:629 |
| `portal.statusCancelled`  | Cancelled            | Dibatalkan           | types:626, en:627, id:630 |

### Portal payment status

| Key                     | EN                                | ID                                       | File line                 |
| ----------------------- | --------------------------------- | ---------------------------------------- | ------------------------- |
| `portal.paymentAlert`   | Payment Status                    | Status Pembayaran                        | types:631, en:632, id:633 |
| `portal.paymentUnpaid`  | {count} unpaid invoice — {amount} | {count} Invoice belum dibayar — {amount} | types:632, en:633, id:634 |
| `portal.paymentOverdue` | Overdue                           | Terlambat                                | types:633, en:634, id:635 |
| `portal.paymentDueSoon` | Due in {days} days                | Jatuh tempo {days} hari lagi             | types:634, en:635, id:636 |
| `portal.paymentAllPaid` | All invoices paid                 | Semua Invoice telah dibayar              | types:635, en:636, id:637 |

### Portal status messages & titles

| Key                      | EN                                                             | ID                                                          | File line                 |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------- |
| `portal.waitApproval`    | Your order has been submitted. Please wait for admin approval. | Pesanan Anda telah dikirim. Mohon tunggu persetujuan admin. | types:590, en:591, id:591 |
| `portal.completedThanks` | Thanks for your order.                                         | Terima kasih atas pesanan Anda.                             | types:619, en:620, id:623 |
| `portal.rejectedTitle`   | Order Rejected                                                 | Pesanan Ditolak                                             | types:641, en:642, id:643 |
| `portal.confirmFailed`   | Could not confirm the order. Please try again.                 | Pesanan tidak dapat dikonfirmasi. Coba lagi.                | types:617, en:618, id:621 |
| `portal.notFound`        | Order not found                                                | Pesanan tidak ditemukan                                     | types:618, en:619, id:622 |
| `portal.currentStage`    | Current Stage                                                  | Tahap Saat Ini                                              | types:637, en:638, id:639 |

---

## 7. Domain-Specific `active`/`inactive` Keys

These are duplicated across customer, product, and settings domains (separate keys, same values):

| Key                  | EN       | ID          | File line                 |
| -------------------- | -------- | ----------- | ------------------------- |
| `customers.active`   | Active   | Aktif       | types:331, en:331, id:335 |
| `customers.inactive` | Inactive | Tidak Aktif | types:332, en:332, id:336 |
| `products.active`    | Active   | Aktif       | types:370, en:370, id:374 |
| `products.inactive`  | Inactive | Tidak Aktif | types:371, en:371, id:375 |
| `settings.active`    | Active   | Aktif       | types:107, en:107, id:273 |
| `settings.inactive`  | Inactive | Tidak Aktif | types:108, en:108, id:274 |

---

## 8. Members Status Keys (`members.*`)

| Key                   | EN                                           | ID                          | File line                 |
| --------------------- | -------------------------------------------- | --------------------------- | ------------------------- |
| `members.pending`     | Pending Invitations                          | Undangan Tertunda           | types:128, en:128, id:292 |
| `members.pendingDesc` | These invitations have not been accepted yet | Undangan ini belum diterima | types:129, en:129, id:293 |
| `members.accepted`    | Invitation accepted                          | Undangan diterima           | types:139, en:139, id:303 |
| `members.rejected`    | Invitation rejected                          | Undangan ditolak            | types:141, en:141, id:305 |
| `members.accept`      | Accept                                       | Terima                      | types:137, en:137, id:301 |
| `members.reject`      | Reject                                       | Tolak                       | types:138, en:138, id:302 |

---

## 9. Asset Upload State Keys (`assetUpload.states.*`)

| Key                             | EN            | ID            | File line              |
| ------------------------------- | ------------- | ------------- | ---------------------- |
| `assetUpload.states.uploaded`   | Uploaded      | Tersimpan     | types:44, en:46, id:46 |
| `assetUpload.states.uploading`  | Uploading...  | Mengunggah... | types:45, en:47, id:47 |
| `assetUpload.states.processing` | Processing... | Memproses...  | types:46, en:48, id:48 |
| `assetUpload.states.failed`     | Failed        | Gagal         | types:47, en:49, id:49 |
| `assetUpload.states.done`       | Done          | Selesai       | types:48, en:50, id:50 |

Also `assetUpload.errors.uploadFailed` (`types:53`, `en:55`, `id:55`) — "Upload failed" / "Unggah gagal".

---

## 10. Dashboard Status Keys

| Key                          | EN                             | ID                             | File line                 |
| ---------------------------- | ------------------------------ | ------------------------------ | ------------------------- |
| `dashboard.activeOrders`     | Active Orders                  | Pesanan Aktif                  | types:351, en:351, id:355 |
| `dashboard.activeOrdersDesc` | Orders currently in production | Pesanan yang sedang diproduksi | types:352, en:352, id:356 |

---

## Summary Statistics

| Category                    | Count    | Includes                                                                                                                                                                              |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status.*` (canonical)      | 18 keys  | draft, pending, approved, in_progress, production, in_delivery, completed, cancelled, rejected, active, inactive, paid, partially_paid, unpaid, void, overdue, pendingPayment, failed |
| `orders.*` status           | 16 keys  | approve, reject, completeOrder, orderApproved/Rejected/Completed, paymentNoInvoice/Paid/Unpaid/PartiallyPaid/Void, etc.                                                               |
| `invoices.*` status         | 15 keys  | markAsPaid, voidInvoice, pendingConfirmation, overdue, confirmPayment, paymentConfirmed/Rejected/Recorded, etc.                                                                       |
| `production.*` status       | 35+ keys | statusQueued/InProgress/Completed, pendingApproval, active/inactive, canceled, approve/reject, advancement-requested, all shipping keys, etc.                                         |
| `portal.*` status           | 16 keys  | statusDraft/Pending/Approved/Production/InDelivery/Completed/Cancelled, paymentUnpaid/Overdue/DueSoon/AllPaid, rejectedTitle, etc.                                                    |
| `customers` active/inactive | 2 keys   |                                                                                                                                                                                       |
| `products` active/inactive  | 2 keys   |                                                                                                                                                                                       |
| `settings` active/inactive  | 2 keys   |                                                                                                                                                                                       |
| `members.*` status          | 6 keys   | pending, accepted, rejected, accept, reject                                                                                                                                           |
| `assetUpload.states.*`      | 5 keys   | uploaded, uploading, processing, failed, done                                                                                                                                         |
| `dashboard`                 | 2 keys   | activeOrders                                                                                                                                                                          |
| `common.status` labels      | 3 keys   | common.status, orders.status, invoices.status                                                                                                                                         |

**Total: ~105 individual translation keys** across both locales.

---

## Key Observations

1. **Overlap with `status.*` canonical namespace**: The `portal.status*` keys and `production.status*` keys duplicate values already in `status.*`. The portal uses `portal.statusDraft` instead of `status.draft` because the portal shows "Pending Confirmation" rather than "Draft" to customers. Similarly `portal.statusPending` uses "Awaiting Approval" vs `status.pending`'s "Pending".

2. **Shared values across domains**: `active`/`inactive` appear identically in `customers`, `products`, `settings`, and `status` — four separate entries all saying "Active"/"Aktif" and "Inactive"/"Tidak Aktif". These could potentially be consolidated in the future.

3. **Payment status fragmentation**: Payment status labels exist in three places: `status.paid|partially_paid|unpaid|void`, `orders.paymentPaid|Unpaid|PartiallyPaid|Void`, and `portal.paymentUnpaid|Overdue|DueSoon|AllPaid`.

4. **Production namespace has the most status keys** — over 35 keys covering task statuses, stage statuses, advancement flow, and shipment.

5. **The `orders.approve`/`reject` and `production.approve`/`reject` are distinct keys** — different values (orders: simple "Approve"/"Setujui" vs production: "Approve & Advance"/"Setujui & Lanjutkan").
