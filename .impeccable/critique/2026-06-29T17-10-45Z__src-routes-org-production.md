---
target: src/routes/_org/production/
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-06-29T17-10-45Z
slug: src-routes-org-production
---
# Critique: `src/routes/_org/production/` (Production Kanban)

**Target**: Production kanban surface — route shell (`index.tsx`) + active board (`kanban-page.tsx`) + archive (`archived-tasks-page.tsx`) + supporting components (`kanban-board`, `kanban-column`, `kanban-task-card`, `task-detail-modal`, `review-modal`).

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No explicit confirmation after advance/approve/reject — modals close silently |
| 2 | Match System / Real World | 3 | Hardcoded "Selesai" (`task-detail-modal.tsx:254`) and "Fulfilled Requirements" (`review-modal.tsx:70`) bypass i18n |
| 3 | User Control and Freedom | 3 | No undo for task advancement, approval, or rejection |
| 4 | Consistency and Standards | 3 | Date formatting inconsistent: `activity-row.tsx` (browser locale) vs `archived-tasks-page.tsx` (`id-ID` hardcoded) |
| 5 | Error Prevention | 2 | Zero confirmation before irreversible actions (approve, reject, advance) |
| 6 | Recognition Rather Than Recall | 3 | Requirements rendered as raw database IDs in `review-modal.tsx:76` |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts, no drag-and-drop, no bulk actions |
| 8 | Aesthetic and Minimalist Design | 3 | Clean and restrained; 4 column color variants add unscoped chromatic noise |
| 9 | Error Recovery | 1 | Zero error feedback on any mutation — no `.onError()`, no toast, no retry |
| 10 | Help and Documentation | 1 | No tooltips, no contextual help, bare empty state |
| **Total** | | **24/40** | **Acceptable — significant improvements needed before users are happy** |

---

## Anti-Patterns Verdict

**Does this look AI-generated?** No. This surface does not trigger the "AI made this" reflex. The near-monochrome palette, restrained semantic color, and information-dense layout are aligned with the workshop brand personality (Confident, Clean, Practical). No gradient text, no glassmorphism, no hero-metric template, no eyebrow-on-every-section, no numbered scaffolding. The composition is genuinely product-native.

**LLM assessment**: The aesthetic is disciplined and on-brand. The one product-register violation is structural, not visual: **modal-as-first-thought** for every task interaction. Opening a modal to advance a task, then a second modal to review/approve, is the lazy-affordance pattern the product register warns against. On a production floor where an operator advances dozens of tasks a day, the modal chain is friction dressed as focus.

**Deterministic scan**: `detect.mjs` ran on `src/features/production/` + `src/routes/_org/production/`, exit code 2, **1 finding**:
- **Side-tab accent border** (`kanban-column.tsx:55`): `border-l-4` on the `CardHeader` of each kanban column, colored by variant (`slate`/`sky`/`amber`/`emerald`).

**Correction to the sub-agent's false-positive call**: The detector flagged this as a "likely false positive — legitimate kanban column-styling pattern." That verdict is **wrong**. The impeccable absolute bans and `DESIGN.md` both explicitly prohibit `border-left/right > 1px` as a colored accent on cards. `KanbanColumn` renders a `<Card>` with exactly that — a 4px colored side-stripe as the stage indicator. The stage distinction is already carried by `styles.headerBg` (header background tint); the side-stripe is redundant decoration that violates the project's own design contract. This is a real finding the design review missed; the detector caught it correctly and then misclassified it. **Not a false positive.**

**Visual overlays**: Not available. The production route is auth-gated via Better Auth with org context; navigating without credentials redirects to login. Browser visualization was skipped for this reason. Fallback signal: source-level CLI scan + manual source review.

---

## Overall Impression

A clean, restrained production board that mostly earns its place — until the moment a user advances a task. At that point the surface goes silent: no confirmation, no error feedback, and a modal chain that treats every advancement as a heavyweight decision. The kanban is well-organized but not yet a workshop you trust completely, because trust lives in feedback, and feedback is exactly what's missing. The single biggest opportunity: make task advancement a fast, confident, confirmed one-step action instead of a silent two-modal ritual.

---

## What's Working

1. **Kanban column color system** — the four variant tints (queue slate, pre-production sky, production amber, done emerald) give spatial orientation at a glance. The semantic mapping is meaningful, not decorative. The peak of the emotional journey is a task landing in the emerald Done column — tangible daily progress.

2. **Task card information density** — `KanbanTaskCard` packs six data points (task number in mono, product name, customer, quantity, status badge, priority) into a compact card with clear type hierarchy. Monospaced task numbers correctly signal "reference code." This is density with clarity, the core design principle.

3. **Progressive disclosure architecture** — the kanban → `TaskDetailModal` → tabbed detail → `RequirementForm`/`ReviewModal` chain reveals complexity only on demand. The structure is right; the execution of the modal handoffs is where it breaks down.

---

## Priority Issues

### [P1] No error feedback on task mutations
- **What**: `task-detail-modal.tsx:113-118` (`handleAdvance` → `advanceTask.mutate(...)` then `onOpenChange(false)`) and `kanban-page.tsx:152-158` (`onApprove`/`onReject` → `.mutate(...)` then `setReviewTaskId(null)`). No `.onError()` handler on any mutation chain. The modal closes before the mutation resolves; on failure the task appears stuck with no error, no toast, no retry.
- **Why it matters**: Silent failure on production-critical actions destroys user trust — the exact brand promise ("you trust it completely") this surface exists to deliver. An operator who advances a task, sees the modal close, and later finds the task still in the old stage has no idea the advance failed. This is the lowest valley in the emotional journey.
- **Fix**: Add `.onError()` to all mutation chains with a toast notification naming the action that failed. Do NOT close the modal on error — close only on `.onSuccess()`. Add a retry affordance in the toast.
- **Suggested command**: `$impeccable harden`

### [P1] Hardcoded i18n strings bypass the translation system
- **What**: `task-detail-modal.tsx:254-256` compares `nextStage?.name === 'Selesai'` — using a Bahasa Indonesia string as both a comparison key and display text. `review-modal.tsx:70` renders the literal English `"Fulfilled Requirements"` label. Both bypass `use-intl`.
- **Why it matters**: The stage-name comparison breaks if the stage is ever renamed or the org switches locale; "Selesai" shows untranslated to English users. The project's non-negotiable rule is "no hardcoded user-facing text." This is a contract violation, not a polish item.
- **Fix**: Compare by stage ID or a `type`/`kind` field, never by display name. Replace the literal with `t('fulfilledRequirements')` and add the key to `src/messages/en.ts` + `src/messages/id.ts`.
- **Suggested command**: `$impeccable harden`

### [P2] Side-stripe accent border on kanban columns (absolute ban)
- **What**: `kanban-column.tsx:55` — `border-l-4` on `CardHeader`, colored per variant. This is a >1px colored side-stripe on a card, explicitly banned by both the impeccable absolute bans and `DESIGN.md` ("Don't use border-left or border-right greater than 1px as a colored accent on cards").
- **Why it matters**: It's a categorical design-system violation. The stage distinction is already carried by the header background tint (`styles.headerBg`); the side-stripe is redundant decoration. It also deviates from `DESIGN.md`, which specifies kanban columns use a single neutral `surface-soft` background — not four colored variants.
- **Fix**: Drop `border-l-4` entirely. Keep the header background tint as the stage indicator, or move to a full 1px border in the variant color if a stronger signal is needed. Reconcile the four-variant color system against the design system's single-neutral-column spec.
- **Suggested command**: `$impeccable polish`

### [P2] Raw requirement IDs in the review modal
- **What**: `review-modal.tsx:76` renders `{id}` — the raw database key from the `requirementResponses` map — instead of a human-readable requirement label.
- **Why it matters**: The review modal is the highest-stakes decision surface on the board (approve or reject production advance). Showing `req_8a3f...` instead of "Print proof approved by customer" forces the reviewer to cross-reference the task detail they just closed — a working-memory bridge. It undermines the one screen where clarity matters most.
- **Fix**: Map requirement IDs to labels using the stage's `requirements` array (already available on `currentStage` in `task-detail-modal.tsx:103`). Pass the labeled pairs into `ReviewModal` as a prop, or fetch the stage requirements in the review flow.
- **Suggested command**: `$impeccable clarify`

### [P2] Kanban task cards are not keyboard-focusable
- **What**: `KanbanTaskCard` renders as a `<div>` (or non-semantic clickable element), not a `<button>` or `role="button"` with `tabindex`. The kanban board has no ARIA landmarks. Column count badges lack `aria-label` context.
- **Why it matters**: An accessibility-dependent user (Sam) cannot tab to a task card, cannot open it with Enter/Space, and cannot perceive the board structure through a screen reader. This is a WCAG AA baseline failure — the project's stated accessibility floor.
- **Fix**: Render the card's clickable surface as a `<button>` (or add `role="button" tabindex={0}` + keydown handler). Add `aria-label` to the board container and to each count badge (e.g., "5 tasks in Production").
- **Suggested command**: `$impeccable audit`

---

## Persona Red Flags

### Alex (Power User)
Primary action: advance a batch of tasks through production stages.
- **No keyboard shortcuts** for any kanban action — every advance requires mouse + modal + modal.
- **No drag-and-drop** task advancement — the canonical kanban interaction is absent.
- **No bulk actions** — one task at a time, even when a column has 20 cards ready to advance.
- **No inline quick-advance** — must open `TaskDetailModal` even for a routine stage bump with no requirements.
- **Redundant modal handoff** — `TaskDetailModal` → close → `ReviewModal` is two modals for one decision. High abandonment risk for a power user moving fast.

### Sam (Accessibility-Dependent User)
Primary action: tab through the board and open a task detail.
- **`KanbanTaskCard` is a div, not a button** — not focusable, no keyboard activation.
- **No ARIA landmarks** on the kanban board — screen readers get no structural announcement.
- **Column count badges lack `aria-label`** — "5" is read as a bare number with no context.
- **`ReviewModal` buttons lack `aria-describedby`** — approve/reject have no programmatic description of their consequence.
- **Activity icons lack `aria-hidden`/`aria-label`** — screen readers announce icon names as noise.

### Budi (Operator / Production Worker — project-specific)
Profile: floor-level task executor on the shop floor, possibly on a phone or tablet, Bahasa Indonesia speaker, advances tasks dozens of times a day.
Primary action: see what to produce next and advance it.
- **Modal-centric interaction on mobile** — advancing a task opens `TaskDetailModal` (and often `ReviewModal`) on a small screen. Two stacked modals on a phone is friction.
- **No responsive kanban layout** — the board is horizontal-scroll-only (`overflow-x-auto`). On a phone, finding the "next task" means swiping through columns.
- **`RequirementForm` inside a constrained `85vh` modal** on a phone — the form the operator must fill to advance is the hardest surface to use on the device they're most likely holding.
- **Comment input may be keyboard-obscured** on mobile when the soft keyboard rises inside the modal.
- **No post-action confirmation** — Budi advances a task, the modal closes, and he has no signal it worked. On a noisy shop floor, that ambiguity means re-checking by hand.

---

## Minor Observations

- Date formatting is inconsistent: `activity-row.tsx` uses the browser locale, `archived-tasks-page.tsx` hardcodes `id-ID`. Pick one (the org locale) and centralize it.
- No confirmation for task rejection (`review-modal.tsx:103-108`) — rejection sends work back and disrupts production flow; it is not a routine operation. A lightweight two-step confirm for reject only would add reassurance at a high-stakes moment.
- The empty kanban state (`kanban-page.tsx:119-121`) is bare translated text with no icon, description, or suggested action. The product register requires empty states that teach the interface.
- `assignedTo` exists on the task model but is not rendered on the card — operators can't see who's working on what at a glance.
- The comment field uses `Input` (single-line), not `Textarea` — comments are likely to be longer than one line.
- Tab count badges in `index.tsx:44,52` are `size-5` (20px) — at the lower bound of touch-target comfort (44pt recommended).
- Priority badge shows a generic label, not the priority level.

---

## Questions to Consider

- Should the kanban support drag-and-drop task advancement? The canonical kanban interaction is absent; for an operator advancing dozens of tasks a day, it may be the single highest-leverage efficiency gain.
- Is `TaskDetailModal` the right primary interaction, or should the surface use a split-pane / expandable card so context stays visible while advancing? The modal chain closes the board behind it.
- Should the archive page show the task's final status (completed vs. cancelled)? Currently it's a flat table — production history context is missing.
