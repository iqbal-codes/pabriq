---
target: order list
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-06-30T05-21-26Z
slug: src-features-orders-pages-orders-list-page-tsx
---
Method: dual-agent (A: CritiqueDesignA · B: CritiqueEvidenceB)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Refetching has a visible overlay through `DataTable`, but initial orders loading uses `useSuspenseQuery` before `DataTable` can render its own skeleton (`src/features/orders/hooks.ts:17-21`, `src/features/orders/pages/orders-list-page.tsx:119-124`). |
| 2 | Match System / Real World | 4 | Order, customer, payment, due date, deadline, and IDR total map directly to MTO operations; status values are localized and date/currency formatting uses Indonesian conventions (`order-table-columns.tsx:9-13`, `31-47`, `84-141`). |
| 3 | User Control and Freedom | 3 | Search, status filter, clear filters, pagination, and column visibility exist, but row selection is enabled with no visible bulk action path (`orders-list-page.tsx:125`; `data-table-toolbar.tsx:30-41`). |
| 4 | Consistency and Standards | 4 | The page follows the project vocabulary: `PageContent`, `PageHeader`, `DataTable`, `nuqs`, and `use-intl` (`orders-list-page.tsx:1-21`, `110-153`). |
| 5 | Error Prevention | 2 | Copy-link failure prevention is weak: token generation has a raw English error, clipboard write has no recovery, and the success toast fires only after an awaited API with no catch (`order-table-actions.tsx:31-45`). |
| 6 | Recognition Rather Than Recall | 3 | Search, filter chips, status badges, and action tooltips help recognition; the table still asks users to parse status, payment status, due date, deadline, and created date at equal weight (`order-table-columns.tsx:35-141`). |
| 7 | Flexibility and Efficiency | 2 | The interface exposes selection checkboxes but no batch action, and row-level actions are limited to view/edit/copy link (`orders-list-page.tsx:125`, `152`; `order-table-actions.tsx:12-49`). |
| 8 | Aesthetic and Minimalist Design | 3 | The composition is clean and system-native, but desktop columns are visually flat: order number, customer, total, status, payment, and dates render without enough priority cues (`order-table-columns.tsx:22-142`). |
| 9 | Error Recovery | 3 | The generic `DataTable` can render table-level error states, but `OrdersListPage` does not pass `error`, `errorMessage`, or `onRefetch`; query errors leave recovery to an outer boundary (`data-table-state-table.tsx:127-159`; `orders-list-page.tsx:119-153`). |
| 10 | Help and Documentation | 2 | The list has no contextual explanation for the 9 order statuses or the difference between due date and deadline (`order-table-columns.tsx:146-157`, `84-121`). |
| **Total** | | **29/40** | **Good — strong system fit, with workflow affordance and recovery gaps.** |

#### Anti-Patterns Verdict

**LLM assessment**: Low AI-slop risk. The target source does not show decorative gradients, glass, stripe backgrounds, sketch SVGs, hero metrics, or generic card-grid scaffolding. It reads like a real app screen: restrained `PageHeader` plus shared `DataTable`. The slop is structural, not decorative: enabled selection without actions, dense same-weight columns, and a few template-ish fallback/error seams.

**Deterministic scan**: `node .agents/skills/impeccable/scripts/detect.mjs --json src/features/orders/pages/orders-list-page.tsx` returned exit code 0 and `[]`. No detector anti-patterns in the target file.

**Visual overlays**: Overlay injection succeeded on the redirected sign-in page, not the order list. Browser navigation to `http://localhost:3001/orders` redirected to `http://localhost:3001/sign-in?redirect=%2Forders`; no credentials were available. The sign-in page emitted 5 detector hits on 2 elements, but those are out of scope for this target and treated as non-applicable.

#### Overall Impression

This order list is a credible production-management surface, not a prototype. It uses the right app shell and table system, keeps decoration out of the way, and gives admins the basic list/search/filter loop. The biggest opportunity is to make the table tell operators what matters now: which orders need action, which deadlines are urgent, and what can be done in bulk.

#### What's Working

1. **System-native structure**: `OrdersListPage` composes `PageContent`, `PageHeader`, and `DataTable` instead of inventing local table UI (`orders-list-page.tsx:110-153`). This matches the project’s UI-system rules.
2. **Responsive table abstraction**: Column `mobileRole` metadata drives mobile card layout from the same column definitions (`order-table-columns.tsx:22-142`; `data-table-mobile-card.tsx:17-32`). Good maintainability.
3. **Honest empty/no-results states**: The page distinguishes “no orders yet” from “no orders match your search” and provides contextual create actions (`orders-list-page.tsx:143-149`; `data-table-state-table.tsx:167-256`).

#### Priority Issues

1. **[P1] Selection checkboxes create a dead promise**
   - **What**: `enableRowSelection` is enabled, but no `selectionToolbar` is passed.
   - **Why it matters**: Admins see checkboxes, select rows, then get no action. That violates user control and makes the table feel unfinished.
   - **Fix**: Either remove selection from the orders list or add a selection toolbar with real batch actions: bulk status transition where safe, export, assign, or clear selection. If no batch workflow exists yet, remove the checkboxes now.
   - **Suggested command**: `$impeccable polish order list`

2. **[P1] Copy portal link has fragile recovery**
   - **What**: The copy-link action catches token-generation failure only through a result-shape check, uses a hardcoded English toast, and does not catch clipboard failure.
   - **Why it matters**: Copying the customer portal link is a high-value admin action. Clipboard APIs fail on permission, protocol, browser policy, or focus state. Silent failure here sends admins back to WhatsApp/manual work.
   - **Fix**: Wrap the whole generate/copy flow in try/catch; use `t('generateLinkFailed')` or a more specific i18n key; show a recovery path such as “Open portal link” or a selectable URL when clipboard write fails.
   - **Suggested command**: `$impeccable harden order list`

3. **[P2] Table hierarchy treats operationally different facts as equal**
   - **What**: Order number, customer, status, payment status, total, due date, deadline, and created date all sit at similar visual weight.
   - **Why it matters**: Operations users scan for urgency. Equal-weight columns force reading instead of pattern recognition, especially when both order status and payment status are badges.
   - **Fix**: Promote order number/customer as the row identity, right-align/mono or emphasize total, visually separate operational status from payment status, and make overdue deadlines include text/icon semantics beyond red color.
   - **Suggested command**: `$impeccable layout order list`

4. **[P2] Initial loading and query errors are not handled at the list level**
   - **What**: `useOrdersList` uses `useSuspenseQuery`, so the list page depends on an outer suspense/error boundary rather than passing `isLoading`, `error`, and retry state through `DataTable`.
   - **Why it matters**: The shared `DataTable` has skeleton/error affordances, but this page may not use them for first load or failures. Users can see a generic route fallback instead of an order-specific table state.
   - **Fix**: Either confirm the route-level pending/error UI is specific enough, or switch this list to a non-suspense query pattern that feeds `DataTable` its own loading/error/retry props.
   - **Suggested command**: `$impeccable harden order list`

5. **[P2] Mobile cards are dense and under-prioritized**
   - **What**: Mobile cards use order number as title, no subtitle role, one badge, then every `mobileRole: 'meta'` field as key-value rows.
   - **Why it matters**: A shop-floor or on-the-go admin sees six metadata rows per card before action. The customer and deadline should be more prominent than created date.
   - **Fix**: Assign `customerName` as subtitle, hide or demote `createdAt` on mobile, keep total/deadline/status visible, and move row actions to a larger accessible action area or menu.
   - **Suggested command**: `$impeccable adapt order list`

#### Persona Red Flags

**Alex — Admin power user**: Alex can search and filter quickly, but selection checkboxes do nothing useful. The fastest path for repeated work is still row-by-row navigation because actions are view/edit/copy only.

**Jordan — First-time operations lead**: Jordan sees 9 possible statuses and two deadline-like columns without explanation. “Due Date” versus “Deadline” and `—` for no invoice require interpretation instead of recognition.

**Sam — accessibility-dependent user**: Sam gets icon-only row actions whose accessible names depend on the custom `Button tooltip` implementation, not an explicit `aria-label` at the action source. Overdue is conveyed by red text alone in `maxDeadline`.

**Casey — mobile admin on the shop floor**: Casey gets compact cards with many metadata rows and small icon actions. The default mobile card has no customer subtitle because no column uses `mobileRole: 'subtitle'`.

#### Minor Observations

- The route defines a primary action in `beforeLoad` and the page also defines `PageHeader.primaryAction`; that may be intentional shell/page duplication, but it is worth checking (`src/routes/_org/orders/index.tsx:6-10`; `orders-list-page.tsx:112-118`).
- Date parsing differs: `dueDate` appends `T00:00:00`, while `maxDeadline` uses `new Date(date)` directly (`order-table-columns.tsx:91-97`, `109-119`).
- `DataTableFilterPanel` contains generic English fallbacks like `Search...` and `No options`, though the order status filter path does not currently hit those strings (`data-table-filter-panel.tsx:49-72`, `97-104`).
- `StatusBadge` supports both `cancelled` and `canceled`; not harmful, but it shows status vocabulary drift (`status-badge.tsx:20`, `36`).

#### Questions to Consider

- Is the order list supposed to be a command surface, or just a directory into order detail pages? The selection/action model should answer that decisively.
- Which date drives production urgency: customer due date, internal max deadline, or both? The current table asks users to infer the hierarchy.
- Should order status and payment status be peers, or should one become a secondary signal inside the row identity?
- Should mobile prioritize “what to do next” over complete parity with the desktop table?
