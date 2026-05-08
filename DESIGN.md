---
name: Pabriq
description: A production management tool for Made-To-Order businesses — confident, clean, and practical, anchored on white canvas with near-black primary CTAs, Inter body type, and a sidebar-driven app shell.
colors:
  primary: "#111111"
  primary-active: "#242424"
  primary-disabled: "#e5e7eb"
  ink: "#111111"
  body: "#374151"
  muted: "#6b7280"
  muted-soft: "#898989"
  hairline: "#e5e7eb"
  hairline-soft: "#f3f4f6"
  canvas: "#ffffff"
  surface-soft: "#f8f9fa"
  surface-card: "#f5f5f5"
  surface-strong: "#e5e7eb"
  surface-dark: "#101010"
  surface-dark-elevated: "#1a1a1a"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  on-dark-soft: "#a1a1aa"
  brand-accent: "#3b82f6"
  success: "#10b981"
  warning: "#f59e0b"
  error: "#ef4444"
  badge-orange: "#fb923c"
  badge-pink: "#ec4899"
  badge-violet: "#8b5cf6"
  badge-emerald: "#34d399"
typography:
  display-xl:
    fontFamily: "Inter, sans-serif"
    fontSize: 64px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -2px
  display-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -1.5px
  display-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -1px
  display-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.5px
  title-lg:
    fontFamily: "Inter, sans-serif"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.3px
  title-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: "Inter, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  button:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-outline:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  sidebar:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    width: 256px
  sidebar-collapsed:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    width: 48px
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  card-compact:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 0px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  badge:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  kanban-column:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 0px
  kanban-task-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 12px
  data-table:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 6px
  data-table-header:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  page-header:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.title-lg}"
  page-content:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    padding: 24px
  dialog:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
---

# Design System: Pabriq

## 1. Overview

**Creative North Star: "The Workbench"**

Pabriq is a craftsman's workbench for Made-To-Order businesses. Every element earns its place. The system reads as a well-organized workshop: tools in their spots, materials visible at a glance, nothing decorative getting in the way. Confidence comes from precision, not ornamentation.

The visual language is deliberately restrained. A near-monochrome palette (`{colors.primary}` — #111111 on `{colors.canvas}` — #ffffff) keeps the focus on the work itself: orders, production tasks, invoices. Color appears only where it carries meaning — success green on completed tasks, amber on pending approvals, red on errors. The sidebar provides constant navigation anchor while the content area stays clean and information-dense.

This system explicitly rejects: enterprise-ugly gray admin panels with 47 identical cards, consumer-playful toy aesthetics with rounded-everything and bright gradients, SaaS-landing-page hero sections with floating mockups, and generic-AI-tool glassmorphism with purple neon on dark. Pabriq is a production management tool, not a chatbot or a marketing site.

**Key Characteristics:**

- Sidebar-driven app shell with collapsible icon mode. The sidebar is the structural backbone — org logo, nav items, user menu. It narrows to icon-only on demand, keeping the content area maximized.
- Near-monochrome action layer. Primary CTAs are `{colors.primary}` (#111111), not blue. The only accent that appears on buttons is destructive red for delete/reject actions.
- Information density with clarity. Data tables use a double-border container pattern (muted outer frame, white inner table) that creates visual structure without shadows. Kanban columns use `{colors.surface-soft}` (#f8f9fa) backgrounds to distinguish stages.
- Tactile feedback on every interaction. Cards lift with `hover:shadow-md transition-shadow` on clickable surfaces. Buttons shift from `{colors.primary}` to `{colors.primary-active}` on press. The system responds to touch.
- Role-appropriate views. Owner sees revenue dashboards, operator sees kanban tasks, customer sees production progress. Same data, different lenses.
- Mobile-first responsive tables. Data tables collapse to stacked Card layouts on mobile with infinite scroll, preserving every data point without horizontal overflow.

## 2. Colors

The palette is a cool-toned monochrome with semantic color sparingly applied. Every surface is tinted toward the neutral gray axis — no warm or cool hue bias. The system is Restrained: tinted neutrals plus one accent (brand blue) used on less than 10% of surfaces.

### Primary

- **Ink** (`{colors.ink}` — #111111): All headlines, primary text, and primary CTAs. This is the dominant color across the entire interface. Press state shifts to `{colors.primary-active}` (#242424).
- **Brand Accent** (`{colors.brand-accent}` — #3b82f6): Used sparingly on inline links and occasional highlights. Appears on less than 5% of any given screen. Never on primary buttons.

### Surface

- **Canvas** (`{colors.canvas}` — #ffffff): The default page floor. Every screen starts here.
- **Surface Soft** (`{colors.surface-soft}` — #f8f9fa): Sidebar background, kanban column backgrounds, table header rows, subtle section dividers. The "work surface" beneath the content.
- **Surface Card** (`{colors.surface-card}` — #f5f5f5): Badge backgrounds, compact card backgrounds, empty state containers. A step warmer than canvas.
- **Surface Strong** (`{colors.surface-strong}` — #e5e7eb): Hairline border alternative, disabled button backgrounds. The strongest neutral before entering dark territory.
- **Surface Dark** (`{colors.surface-dark}` — #101010): Reserved exclusively for dark mode backgrounds. Never used as a light-mode accent.
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #1a1a1a): Dark mode card and elevated surface backgrounds.

### Text

- **Ink** (`{colors.ink}` — #111111): Headlines, primary text, button labels. The highest-contrast text color.
- **Body** (`{colors.body}` — #374151): Default running text, form field values. Comfortable reading weight.
- **Muted** (`{colors.muted}` — #6b7280): Secondary text — descriptions, breadcrumbs, empty states, table metadata.
- **Muted Soft** (`{colors.muted-soft}` — #898989): Tertiary text — captions, fine print, timestamps, secondary labels.
- **On Primary** (`{colors.on-primary}` — #ffffff): Text on primary buttons and destructive badges.
- **On Dark** (`{colors.on-dark}` — #ffffff): Text on dark mode surfaces.
- **On Dark Soft** (`{colors.on-dark-soft}` — #a1a1aa): Secondary text on dark backgrounds.

### Semantic

- **Success** (`{colors.success}` — #10b981): Completed states, paid invoices, successful actions. Used on badge backgrounds and status indicators.
- **Warning** (`{colors.warning}` — #f59e0b): Pending approval states, caution callouts. Used on badge borders and inline warning text.
- **Error** (`{colors.error}` — #ef4444): Validation errors, destructive actions, failed states. Used on destructive buttons and error badges.

### Badge Pastels

A small chromatic set for avatar fills and category tags: `{colors.badge-orange}` (#fb923c), `{colors.badge-pink}` (#ec4899), `{colors.badge-violet}` (#8b5cf6), `{colors.badge-emerald}` (#34d399). These appear only on pill badges and avatar placeholder fills — never on primary actions, never on cards.

### Named Rules

**The Monochrome Action Rule.** Primary CTAs are always `{colors.primary}` (#111111), never blue, never colored. The only exception is destructive actions, which use `{colors.error}` (#ef4444). Color communicates state, not brand.

**The Semantic Scarcity Rule.** Success green, warning amber, and error red appear only where they carry operational meaning — status badges, validation feedback, confirmation states. They are signals, not decoration.

## 3. Typography

**Display Font:** Inter (with `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` fallback)
**Body Font:** Inter (same fallback stack)
**Mono Font:** JetBrains Mono (with `ui-monospace, monospace` fallback)

**Character:** Inter is a neutral, highly legible sans-serif that disappears into the content. It doesn't carry brand personality — the work itself does. The type system prioritizes scannability over expression: clear hierarchy through weight and size contrast, consistent line heights, and restrained letter-spacing.

### Hierarchy

- **Display XL** (64px, weight 600, line-height 1.05, letter-spacing -2px): Reserved for dashboard hero metrics and page-level statements. Rarely used — most screens don't need this scale.
- **Display LG** (48px, weight 600, line-height 1.1, letter-spacing -1.5px): Section headlines on dashboard and marketing surfaces.
- **Display MD** (36px, weight 600, line-height 1.15, letter-spacing -1px): Major section breaks, page titles on high-density screens.
- **Display SM** (28px, weight 600, line-height 1.2, letter-spacing -0.5px): Card-level headlines, modal titles.
- **Title LG** (22px, weight 600, line-height 1.3, letter-spacing -0.3px): Page headers (`PageHeader` h1), section titles in settings.
- **Title MD** (18px, weight 600, line-height 1.4): Card headers, form section legends, sidebar item labels.
- **Title SM** (16px, weight 600, line-height 1.4): Small card titles, list group headers, table column group labels.
- **Body MD** (16px, weight 400, line-height 1.5): Default running text, form field values, dialog body copy.
- **Body SM** (14px, weight 400, line-height 1.5): Secondary body text, navigation labels, table cell content, button labels.
- **Caption** (13px, weight 500, line-height 1.4): Badge labels, timestamps, metadata text, empty state descriptions.
- **Code** (14px, JetBrains Mono, weight 400, line-height 1.5): Task numbers, order numbers, invoice numbers, any monospaced identifier.

### Named Rules

**The Weight Boundary Rule.** Headlines and titles are always weight 600. Body and labels are 400 or 500. The gap between 400 and 600 is the hierarchy — never use 700 on display sizes, never use 500 on body text for emphasis (use size or weight 600 instead).

**The Mono Identity Rule.** Monospaced text (`{typography.code}`) is reserved exclusively for machine-generated identifiers: task numbers, order numbers, invoice numbers. It signals "this is a reference code, not prose." Never use monospaced for body text or labels.

## 4. Elevation

The system is flat by default. Depth is conveyed through color contrast — white cards on soft-gray backgrounds, soft-gray columns on white canvas. Shadows appear only as interactive feedback, not as ambient depth.

At rest, surfaces sit on the same plane distinguished only by `{colors.canvas}` (#ffffff) vs `{colors.surface-soft}` (#f8f9fa) vs `{colors.surface-card}` (#f5f5f5). The double-border table container (muted outer frame, white inner table) creates structural depth through nesting, not shadow.

### Shadow Vocabulary

- **Interactive lift** (`box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)`): Applied on `hover` to clickable cards (kanban task cards, mobile data table cards). Signals "this is tappable." Transitions in with `transition-shadow`.
- **Dialog overlay** (`box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25)`): Modal/dialog drop shadow. The only ambient shadow in the system. Applied by Radix Dialog primitives.
- **Refetch blur** (`backdrop-blur-[1px]` with `bg-background/60`): Data table loading overlay. Not a shadow per se, but the only backdrop-filter in the system.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state — hover, active press, or dialog overlay. If a shadow would be visible without user interaction, use color contrast or border instead.

**The No-Glass Rule.** Glassmorphism (backdrop-blur on content surfaces, translucent cards, frosted overlays) is prohibited. The one exception is the data table refetch overlay, which uses a 1px blur to signal "loading, not interactive." Content is always opaque.

## 5. Components

### Sidebar

**Character:** The structural backbone of the app. Collapsible from 256px to 48px (icon-only mode). Background `{colors.surface-soft}` (#f8f9fa), not white — the sidebar is always the "work surface" beneath the content.

- **Shape:** No border radius on the sidebar itself (it's a full-height panel). Internal menu items use `{rounded.md}` (8px).
- **Header:** Org logo (8x8 rounded-lg) + org name + slug. The logo renders as `{rounded.lg}` (12px).
- **Nav items:** `{typography.nav-link}` (14px / 500), icon + label. Active item gets `{colors.surface-card}` background with `{colors.ink}` text. Inactive: transparent with `{colors.muted}` text.
- **Footer:** User avatar (36px circle) + name + email. Collapses to avatar-only in icon mode.
- **Rail:** A thin clickable rail at the sidebar edge for expand/collapse toggle.

### Buttons

**Character:** Solid and deliberate. Every button communicates exactly what it does through color and label. No gradient buttons, no ghost buttons with borders, no icon-only buttons without tooltips.

- **Primary** (`button-primary`): `{colors.primary}` background, `{colors.on-primary}` text, `{typography.button}` (14px / 600), `{rounded.md}` (8px), height 40px, padding 12px × 20px. Press state: `{colors.primary-active}` (#242424).
- **Outline** (`button-outline`): `{colors.canvas}` background, `{colors.ink}` text, 1px `{colors.hairline}` border. Used for cancel, secondary actions, pagination, inactive toggle states.
- **Ghost** (`button-ghost`): Transparent background, `{colors.ink}` text. Used for icon-only actions (back navigation, row actions, toolbar toggles). Always paired with a tooltip or visible label.
- **Destructive** (`button-destructive`): `{colors.error}` background, `{colors.on-primary}` text. Reserved for delete, reject, and irreversible actions. Never used for routine operations.
- **Submit** (wraps primary): A primary button with auto loading state. Shows spinner on left when submitting. The standard form submission button.

### Data Table

**Character:** Information-dense but scannable. The double-border container pattern (muted outer frame, white inner table) creates visual structure without shadows.

- **Outer container:** `{rounded.xl}` (16px), 1px `{colors.hairline}` border, `{colors.surface-soft}` background with 6px padding. This is the "workbench frame."
- **Inner table:** `{rounded-lg}` (12px), 1px `{colors.hairline}` border, `{colors.canvas}` background. This is the "work surface."
- **Header row:** `{colors.surface-soft}` background, `{typography.caption}` (13px / 500), `{colors.muted}` text. Column headers are labels, not data.
- **Data rows:** `{typography.body-sm}` (14px / 400), `{colors.body}` text. Row hover: `{colors.surface-soft}` background. Clickable rows get `cursor-pointer`.
- **Mobile:** Renders as stacked Card components instead of table rows. Each card shows title, subtitle, badge, and key-value meta pairs. Infinite scroll via IntersectionObserver.
- **Loading:** Skeleton placeholders (5 desktop rows, 3 mobile cards). Refetch shows blur overlay with spinner.
- **Empty state:** Centered icon in `{rounded-full} {colors.surface-card}` circle, title, description, and action button.

### Kanban Board

**Character:** The production floor. Columns represent workflow stages. Task cards are compact, clickable, and carry enough context to act on without opening.

- **Board container:** Horizontal flex with `{spacing.md}` (16px) gap, horizontally scrollable, full height.
- **Column:** `{kanban-column}` — `{colors.surface-soft}` background, `{rounded.xl}` (16px), min-width 288px, full height. Header shows stage name + count badge. Empty columns show centered muted text.
- **Task card:** `{kanban-task-card}` — `{colors.canvas}` background, `{rounded.lg}` (12px), 12px padding. `hover:shadow-md transition-shadow` on hover. Content: task number (mono, caption), product name (title-sm), customer + quantity (caption), status badge.
- **Status badges on cards:** Pending approval uses `{colors.warning}` border with amber text. Normal states use `{colors.surface-card}` background.
- **Count badge:** Tiny circular badge (`text-[10px] size-5`) on column header showing task count.

### Card

**Character:** Quiet containers. Cards hold content without demanding attention. The default card is white with a 1px hairline border and `{rounded.xl}` (16px) corners.

- **Standard:** `{colors.canvas}` background, `{rounded.xl}`, 24px padding, 1px `{colors.hairline}` border. Used for detail sections, summary panels, and content groups.
- **Compact** (kanban/mobile): `{colors.surface-card}` background, `{rounded.lg}` (12px), zero padding. Content provides its own spacing. Used inside kanban columns and as mobile data table rows.
- **Clickable:** Adds `cursor-pointer hover:shadow-md transition-shadow` to the standard card. Used on kanban task cards and interactive list items.
- **Destructive border:** `{colors.error}/50` border for rejection reason displays and error callouts.

### Form Fields

**Character:** Crisp and functional. Every field has a visible label, optional indicator, and inline error message. No floating labels, no placeholder-only fields.

- **Text input:** `{colors.canvas}` background, `{colors.ink}` text, `{typography.body-md}`, `{rounded.md}` (8px), height 40px, 1px `{colors.hairline}` border. Focus state: ring shifts to `{colors.ring}`.
- **Label:** `{typography.body-sm}` (14px / 500), `{colors.ink}`. Optional indicator: `{colors.muted}` text after the label.
- **Error state:** `{colors.error}` text below the field, `{colors.error}` ring on the input. `data-invalid` attribute on the wrapper.
- **Section groups:** `FormSection` wraps fields with a `FieldLegend` (title-md weight). `FormGrid` arranges 1-3 columns responsively (`grid-cols-1 md:grid-cols-2`).
- **Submit area:** `FormActions` — flex container aligned right on desktop, stacked on mobile. Primary submit button + outline cancel button.

### Dialog / Modal

**Character:** Focused interruption. Dialogs appear only when inline alternatives are exhausted. Every dialog has a clear title, focused content, and explicit action buttons.

- **Container:** `{dialog}` — `{colors.canvas}` background, `{rounded.xl}` (16px), 24px padding. Max-width 2xl for standard dialogs, sm:max-w-lg for forms.
- **Header:** Title in `{typography.title-lg}`, description in `{typography.body-sm}` `{colors.muted}`.
- **Footer:** `{flex justify-end gap-2}`. Cancel as outline, primary action as primary or destructive button.
- **Overlay:** Semi-transparent black backdrop with dialog drop shadow. Click-outside-to-close and Escape key supported.

### Badge / Status

**Character:** Functional labels, not decoration. Badges communicate state through color and text. Every badge has an i18n-translated label.

- **Default** (`{typography.caption}`, 13px / 500): `{colors.surface-card}` background, `{colors.ink}` text, `{rounded.pill}`, 4px × 12px padding.
- **Success:** `{colors.success}` background, `{colors.on-primary}` text. Used for completed, paid, active states.
- **Destructive:** `{colors.error}` background, `{colors.on-primary}` text. Used for cancelled, overdue, failed states.
- **Outline with color:** `{colors.warning}` border, amber text. Used for pending approval on kanban task cards.

### Page Shell

**Character:** Consistent structure across every screen. PageHeader handles navigation context and actions. PageContent provides the content container.

- **PageHeader:** Back button (ghost, icon-sm, ArrowLeft) + title (`{typography.title-lg}`, 22px / 600) + description (body-sm, muted). Actions cluster on the right (primary button + overflow menu). Hidden on mobile.
- **PageContent:** `max-w-5xl` (80rem), centered, `px-4 md:px-6 py-6`, `space-y-6`. The content area that holds all page content.
- **Breadcrumbs:** Auto-derived from route hierarchy. Uses shadcn Breadcrumb with `{colors.muted}` separators. Last item is non-link text.
- **Empty state:** Centered layout with icon in `{rounded-full} {colors.surface-card}` circle, title (font-semibold), description (body-sm, muted), and action button. Used when lists have no data.

### Tabs

**Character:** Toggle groups for switching views within a page. Two patterns coexist:

- **Board selector:** Manual toggle using `{Button variant={active ? 'default' : 'outline'}}` side by side. Used for switching between Pre-Production and Production boards.
- **Content tabs:** shadcn `Tabs` component with `TabsList` (surface-soft background) and `TabsTrigger` (active: canvas background with shadow). Used for switching between active/archived views and dialog content sections.

## 6. Do's and Don'ts

### Do:

- **Do** use `{colors.primary}` (#111111) for all primary CTAs. The button is near-black, not blue. This is the most important visual signature.
- **Do** use the sidebar as the structural backbone. Every screen starts with sidebar navigation. The collapsible icon mode maximizes content area on demand.
- **Do** use the double-border table container pattern (`bg-muted/50 p-1.5` outer, `bg-background` inner) for all data tables. This creates visual structure without shadows.
- **Do** use `{colors.surface-soft}` (#f8f9fa) for kanban column backgrounds and sidebar background. It distinguishes the "work surface" from the "workbench frame."
- **Do** apply `hover:shadow-md transition-shadow` on every clickable card surface. Tactile feedback is a core design principle.
- **Do** use `font-mono` for task numbers, order numbers, and invoice numbers. Monospaced text signals "this is a reference code."
- **Do** use i18n keys for every user-facing string. The app supports English and Bahasa Indonesia. No hardcoded text.
- **Do** use the `StatusBadge` component for all status displays. It maps status strings to the correct badge variant automatically.
- **Do** respect role-based visibility. Operators see production only. Customers see their portal only. Never show someone something they can't act on.

### Don't:

- **Don't** use blue (`{colors.brand-accent}`) on primary CTAs. Blue appears on less than 5% of surfaces — inline links and small highlights only.
- **Don't** use glassmorphism, backdrop-blur on content surfaces, or translucent cards. Content is always opaque. The one exception is the data table refetch overlay (1px blur).
- **Don't** use border-left or border-right greater than 1px as a colored accent on cards, list items, callouts, or alerts. Use background tints or full borders instead.
- **Don't** use gradient text (`background-clip: text` with gradient). Emphasis comes from weight (600) and size, not color gradients.
- **Don't** wrap everything in Cards. Data tables use the double-border container pattern. Kanban uses column cards. Forms use section groups. Match the container to the content pattern.
- **Don't** use modals as the first thought for every interaction. Exhaust inline alternatives (expandable rows, inline forms, progressive disclosure) before reaching for a dialog.
- **Don't** animate CSS layout properties (height, width, padding). Use opacity and transform for transitions. Ease out with exponential curves (`ease-out-quart`).
- **Don't** use `console.log` or code comments. The codebase uses pino for structured logging and i18n for all user-facing text.
- **Don't** hardcode user-facing text. Use `use-intl` and update message files in `src/messages/en.ts` and `src/messages/id.ts`.
- **Don't** guess library APIs. Check official docs, Context7, or existing project patterns first. The stack is TanStack Start + React 19 + Vite + TanStack Router + Tailwind CSS v4 + shadcn/ui.
