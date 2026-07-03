---
target: src/features/products/pages/create-product-page.tsx
total_score: 24
p0_count: 0
p1_count: 1
timestamp: 2026-07-03T07-28-34Z
slug: rc-features-products-pages-create-product-page-tsx
---
# Design Critique: Create Product Page

### 1. Nielsen Heuristics Table

| # | Heuristic | Score (0–4) | Key Issues |
|---|-----------|-------------|------------|
| 1 | Visibility of System Status | **3** | Submit button shows loading spinner. Toast is used for success/error. But no draft-saving status or overall form completion indicator is shown. |
| 2 | Match Between System & Real World | **3** | Clean terminology used ("Production Days", "Unit Price"). However, terms like "Negotiate Above Quantity" require domain knowledge. |
| 3 | User Control & Freedom | **2** | No undo button for dynamic array items (breakpoints, addons); they delete immediately. No cancel action button inside the form body. |
| 4 | Consistency & Standards | **2** | Left column wraps elements in a Card, right column nests multiple Card wrappers within a FormSection. Duplicates markup for breakpoint/addon rows. |
| 5 | Error Prevention | **2** | No help text/tooltips for advanced options. No numeric minimum bounds (e.g. production days >= 1) visual hint. |
| 6 | Recognition Rather Than Recall | **3** | Placeholders are present, but complex inputs like "Repeat Order Min Quantity" require recalling context from memory. |
| 7 | Flexibility & Efficiency | **2** | Lacks keyboard shortcuts for adding/removing rows. No template/duplication flow for power users. |
| 8 | Aesthetic & Minimalist Design | **3** | Clean typography and strict monochrome palette. However, nesting cards creates unnecessary visual clutter on the right column. |
| 9 | Error Recovery | **3** | Error texts are clean and display below inputs in red (`text-destructive`). Toast notifications provide server error feedback. |
| 10 | Help & Documentation | **1** | Almost no inline documentation or tooltips. Advanced settings descriptions are hidden behind the collapse button. |
| **Total** | | **24/40** | **Mediocre (Heuristic compliance needs improvement)** |

### 2. Anti-Patterns Verdict

* **LLM Assessment (Design Reviewer)**: Low AI slop. It respects basic borders, input radii, typography, and accents. However, it suffers from card-nesting overuse on the right column, and lopsided vertical density on desktop.
* **Deterministic Scan (Technical Auditor)**: Ran `detect.mjs` against both files. Result: **0 findings**. Clean static parsing.
* **Visual Overlays**: Auth-gated redirect to `/sign-in` prevented inject-based overlay loading on the localhost browser, but complete manual review was conducted on both files.

### 3. Overall Impression
The page is functional, clean, and complies well with the color constraints. However, it lacks inline documentation for its complex fields and over-reaches on card container nesting, leading to a lopsided, dense reading flow.

### 4. What's Working
* **Progressive Disclosure**: Collapse toggle on Advanced settings is functional and protects the core page from information overload.
* **Defaults Calculation**: Breakpoint minimum quantities auto-calculate safely based on the previous breakpoint + 1.
* **Strict i18n**: The files are 100% translated using namespaced keys (`useTranslations('products')`), with no hardcoded strings.

### 5. Priority Issues

#### [P1] Inconsistent Card Nesting (Layout)
* **Why it matters**: The right column nests multiple cards within each other, conflicting with the DESIGN.md component guidelines ("Don't wrap everything in Cards"). It creates extra visual borders that distract from form elements.
* **Fix**: Remove outer card borders around both columns, using `FormSection` directly as the container layout. Use `Card` only for the collapsible advanced options container.
* **Suggested command**: `$impeccable layout`

#### [P2] Missing `productionNotes` Form Field (Polish)
* **Why it matters**: The form model sets a default value for `productionNotes` (and translations exist), but no input field actually renders it.
* **Fix**: Render a `TextareaField` for `productionNotes` in the Left Column between Description and Production Days.
* **Suggested command**: `$impeccable polish`

#### [P2] Lack of Inline Explanations/Tooltips (Clarify)
* **Why it matters**: Complex pricing fields ("Negotiate Above Quantity", "Repeat Order Unit Price") can puzzle first-time admins. Toggling the pricing mode changes calculations without contextual guidance.
* **Fix**: Extend the inputs to support tooltip hints or inline descriptions (e.g. "Trigger negotiations when order size exceeds this limit").
* **Suggested command**: `$impeccable clarify`

#### [P3] Asymmetric Column Spacing (Layout)
* **Why it matters**: On large monitors, the Left Column has substantial empty whitespace below the cover photo, whereas the Right Column is visually dense.
* **Fix**: Balance density by shifting `productionNotes` to the left column and aligning column spacing.
* **Suggested command**: `$impeccable layout`

#### [P3] Array Item Keys (Harden)
* **Why it matters**: React map loops originally used `indexOf` for keys, which can cause DOM node recycling issues if duplicates occur.
* **Fix**: Ensure keys are stable or mapped safely (already patched).
* **Suggested command**: `$impeccable harden`

### 6. Persona Red Flags

* **Alex (Power User)**:
  - Friction: Lacks templates or order cloning options, forcing manual creation of very similar products.
  - Friction: No keyboard shortcuts to add/delete breakpoints or addons.
* **Jordan (First-Timer)**:
  - Friction: No onboarding context for what constitutes a typical product setup.
  - Friction: "Production Days" has no suffix indicating business days.
* **Made-to-Order Shop Owner**:
  - Friction: No currency labels (Rp) or format helpers visible next to the input text.
  - Friction: No preview of how the customer-facing order form will look when published.

### 7. Minor Observations
1. `number-field.tsx` wraps in a plain div instead of `TextInputFieldShell`, breaking label rendering consistency.
2. The pricing mode switch card structure is duplicated in two places; should be a reusable field component.
3. Collapsible button lacks `aria-expanded` attributes, failing screen readers.

### 8. Questions to Consider
1. *Would a stepped wizard (Identity -> Pricing -> Review) make the creation process feel less intimidating?*
2. *Should breakpoints and addons configuration live inside a separate dedicated tab on the product detail page, rather than on the initial creation form?*
