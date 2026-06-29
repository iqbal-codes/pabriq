---
target: src/routes/_org/orders/$id/index.tsx
total_score: 26
p0_count: 1
p1_count: 3
timestamp: 2026-06-29T17-57-53Z
slug: src-routes-org-orders-id-index-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Status badge on header, action bar shows context-sensitive buttons; missing loading skeleton for the page itself |
| 2 | Match System / Real World | 2 | Hardcoded English strings ("Invoice amount", "Full (100%)", "Custom", "Previously invoiced") break i18n — Indonesian users see mixed languages |
| 3 | User Control and Freedom | 3 | Cancel/back available; reject dialog has textarea; modals dismissible on overlay click |
| 4 | Consistency and Standards | 2 | Reject button uses CheckCircle2 (same icon as Approve); hardcoded colors bypass design tokens |
| 5 | Error Prevention | 3 | Reject requires reason text; submit buttons disabled during pending; textarea validation present |
| 6 | Recognition Rather Than Recall | 3 | Customer info, line items, invoices all visible on one page; order number and status always in header |
| 7 | Flexibility and Efficiency | 3 | Action bar adapts to order status; custom invoice percentage; portal link copy |
| 8 | Aesthetic and Minimalist Design | 2 | Orange/green hardcoded Tailwind colors on FinalInvoicePreview clash with monochrome design system; inconsistent button sizes |
| 9 | Error Recovery | 3 | Toast errors on mutation failure; modal stays open on error |
| 10 | Help and Documentation | 2 | No contextual help; missing DialogDescription on CreateInvoiceModal hurts screen readers |
| **Total** | | **26/40** | **Functional but inconsistent** |

## Anti-Patterns Verdict

**LLM assessment**: The page does not read as AI-generated. It's a functional admin detail page with real business logic. The layout is straightforward — header, action bar, stacked cards — and doesn't try to be clever. The anti-pattern risk here is the opposite of "AI slop": it's developer-default. Raw Tailwind colors (`orange-50`, `green-800`) sprinkled over a carefully tokenized design system read as "someone built the DESIGN.md then didn't use it." The monochrome-first principle from DESIGN.md is violated in two components.

**Deterministic scan**: `detect.mjs` returned `[]` — zero automated findings. The issues here are semantic (wrong icon, broken i18n, token violations) which the detector doesn't catch.

## Overall Impression

The page works. Information hierarchy is sound: you see the order number + status, then actions, then details. But the execution has cracks — a `console.log` in production, hardcoded English in a bilingual app, and an approve/reject button pair that uses the same icon. These aren't design taste issues; they're ship-blockers that erode trust in the tool.

## What's Working

1. **Single-page information architecture.** Customer info, line items, and invoices all live on one scrollable page. No tab-hunting, no "go find it elsewhere." This matches Pabriq's "context over navigation" principle perfectly.

2. **Role-aware action bar.** The action bar only shows buttons relevant to the current order status (draft → edit, pending → approve/reject, in_progress → complete production). This is clean progressive disclosure — users only see what they can act on.

3. **RejectedReasonBanner placement.** The red banner sits directly below the action bar, above the detail cards. It's immediately visible when an order is rejected, with the reason text right there. No click-through needed.

## Priority Issues

### [P0] `console.log({ task })` in production code
**What**: `order-line-items-card.tsx:35` has `console.log({ task })` left in the `LineItemRow` component. Every render of every line item dumps to the browser console.

**Why it matters**: Unprofessional in a production tool. Leaks internal state to anyone who opens DevTools. Performance cost is trivial but the trust cost isn't.

**Fix**: Delete line 35.

**Suggested command**: Direct edit (not a design command).

---

### [P1] Hardcoded English strings break i18n
**What**: `create-invoice-modal.tsx` contains 6 hardcoded English strings that bypass `use-intl`:
- Line 120: `"Invoice amount"`
- Line 129: `"Full (100%)"`
- Line 139: `"Remaining ({order.remainingPercentage}%)"`
- Line 148: `"Custom"`
- Line 174: `"(5% steps)"`
- Line 184: `"Previously invoiced:"`

**Why it matters**: Pabriq targets Indonesian MTO businesses. Bahasa Indonesia is the primary UI language. A modal that suddenly switches to English mid-flow breaks trust and comprehension. The rest of the page is properly translated.

**Fix**: Add keys to `src/messages/en.ts` and `src/messages/id.ts` for each string. Replace literals with `t('key')` calls.

**Suggested command**: `$impeccable harden src/features/invoices/components/create-invoice-modal.tsx`

---

### [P1] Reject button uses CheckCircle2 icon (same as Approve)
**What**: `order-action-bar.tsx:88` — the Reject button uses `<CheckCircle2 />`, identical to the Approve button on line 78. Both buttons are `size="sm"`, both use the same icon. The only visual difference is Approve is `variant="default"` (black) and Reject is `variant="outline"`.

**Why it matters**: Approve and Reject are opposite actions with high consequences. Using the same icon for both is a recognition failure — users have to read the label carefully every time. The reject button should use `XCircle` or `Ban` to create instant visual distinction.

**Fix**: Replace `<CheckCircle2 />` on line 88 with `<XCircle />` from lucide-react. Also consider making the reject button use `variant="destructive"` instead of `variant="outline"` — rejecting an order is irreversible and should look dangerous.

**Suggested command**: `$impeccable clarify src/features/orders/components/order-action-bar.tsx`

---

### [P1] Hardcoded Tailwind colors bypass design tokens
**What**: Two components use raw Tailwind color classes instead of the design system tokens defined in DESIGN.md:

1. `complete-production-form-sections.tsx:152` — `FinalInvoicePreview` uses `border-orange-200 bg-orange-50 text-orange-800 text-orange-600 text-green-600`
2. `complete-production-modal.tsx:124-129` — Task completion status uses `bg-green-50 border-green-200 text-green-800 bg-green-500`

DESIGN.md defines semantic tokens: `success: #10b981`, `warning: #f59e0b`, `error: #ef4444`. The monochrome action rule says "Color communicates state, not brand." These hardcoded oranges and greens bypass that system entirely.

**Why it matters**: If the design system colors are ever tuned (e.g., green shifts from emerald to teal), these components won't update. More importantly, the `FinalInvoicePreview` uses orange as a "warning" container, but the design system's warning is amber (`#f59e0b`), not Tailwind's `orange-500`. The colors clash.

**Fix**: Replace hardcoded Tailwind colors with CSS variables from the design system. Use `border-warning/30 bg-warning/5 text-warning` pattern for the invoice preview, and `border-success/30 bg-success/5 text-success` for the completion banner.

**Suggested command**: `$impeccable colorize src/features/orders/components/complete-production-form-sections.tsx src/features/orders/components/complete-production-modal.tsx`

---

### [P2] Missing `DialogDescription` on CreateInvoiceModal
**What**: `create-invoice-modal.tsx:102-105` — the `DialogHeader` contains a `DialogTitle` but the order number text is a bare text node, not wrapped in `DialogDescription`. Screen readers get no description for this dialog.

**Why it matters**: WCAG AA requires dialogs to have accessible descriptions. The `DialogDescription` from shadcn renders as `aria-describedby` on the dialog container, which screen readers announce after the title.

**Fix**: Wrap the order number in `<DialogDescription>`:
```tsx
<DialogDescription>
  Order #{order.orderNumber ?? '—'}
</DialogDescription>
```

**Suggested command**: `$impeccable audit src/features/invoices/components/create-invoice-modal.tsx`

---

### [P2] `validUntil` date orphaned between PageHeader and action bar
**What**: `view-order-page.tsx:105-109` — the "Valid until" date renders as a standalone `<span>` between the PageHeader and OrderActionBar. It's visually disconnected from both.

**Why it matters**: This is a piece of order metadata that belongs inside the order summary or next to the status badge, not floating as a lone line. On mobile, it creates a confusing gap between the header and the action buttons.

**Fix**: Move the `validUntil` display into the `PageHeader` subtitle area (next to the status badge), or into the `OrderSummaryCard` alongside the order total. A subtitle prop on PageHeader would be the cleanest integration.

**Suggested command**: `$impeccable layout src/features/orders/pages/view-order-page.tsx`

---

### [P2] Inconsistent button sizes in action bar
**What**: `order-action-bar.tsx` mixes `size="sm"` on approve/reject/complete buttons with no size prop (default 40px) on the portal link and print buttons. This creates a visual height mismatch in the same row.

**Why it matters**: The action bar is the primary interaction zone for the order. Mixed button heights look unintentional and break the "consistent affordances" principle from DESIGN.md.

**Fix**: Pick one size for all action bar buttons. Either all `size="sm"` (compact, fits the toolbar pattern) or all default height. Given this is a toolbar-like row, `size="sm"` consistently makes sense.

**Suggested command**: `$impeccable layout src/features/orders/components/order-action-bar.tsx`

## Persona Red Flags

**Selected**: Admin/Operations Lead (primary user), Operator/Production Worker (secondary).

### Admin/Operations Lead (Day-to-day order manager)

The admin opens this page to process orders quickly — approve, reject, invoice, ship. The mixed-language invoice modal is the biggest friction point: they're managing Indonesian customers but the modal switches to English mid-task. The approve/reject icon confusion means they have to slow down and read carefully on the highest-stakes action. The console.log is embarrassing if a customer or manager is watching over their shoulder.

**Specific red flags**:
- Invoice modal has 6 English strings in an otherwise Indonesian UI — the admin has to mentally code-switch while calculating money
- Approve and Reject use the same CheckCircle2 icon — the admin must read labels, not scan icons, on the most consequential buttons
- `validUntil` floats as orphaned text — the admin looking for "when does this quote expire?" has to hunt

### Operator/Production Worker (Floor-level task executor)

The operator rarely sees this page (they use the kanban), but when they do (checking order details), the page is clear. No red flags for this persona — the information density is appropriate and the action bar hides irrelevant actions.

## Minor Observations

1. **`OrderSummaryCard` uses `text-muted-foreground` instead of design system `body` color.** Lines 44, 62, 67 use Tailwind's default `text-muted-foreground` which maps to a generic gray. DESIGN.md defines `body: #374151` and `muted: #6b7280` explicitly. Should use `text-body` or the CSS variable equivalent.

2. **`LineItemRow` card uses `rounded-lg border p-4` inline.** This matches the `Card` component's compact variant but is hand-rolled. Could use `<Card variant="compact">` for consistency.

3. **`RejectReasonDialog` uses AlertDialog but asks for text input.** AlertDialog is semantically for confirm/cancel decisions. Since this dialog has a textarea for the reject reason, a regular `Dialog` would be more appropriate — AlertDialog's `aria-describedby` pattern doesn't account for form fields.

4. **The `Truck` icon is imported but unused in `view-order-page.tsx`.** It's imported on line 1 (implicitly via CompleteProductionModal) but not directly used in the page component. Minor, but the import could be cleaner.

## Questions to Consider

- The approve/reject pair is the highest-stakes action on this page. Should reject be a destructive-styled button (`variant="destructive"`) instead of outline, to make the consequence visually obvious?
- The `validUntil` date only shows for draft orders. Is this a critical piece of information that deserves more prominence (e.g., in the header subtitle), or is it fine where it is?
- The `FinalInvoicePreview` uses a prominent orange container. Should this follow the design system's warning token instead of hardcoded Tailwind orange, or is the orange intentional for "attention-grabbing money amounts"?
- The invoice modal's custom percentage stepper uses ±5% increments. Is 5% granular enough for Indonesian MTO businesses, or do they typically invoice in 25%/50%/100% chunks?
