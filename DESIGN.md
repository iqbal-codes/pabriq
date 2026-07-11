---
name: Pabriq
description: A production management tool for Made-To-Order businesses — confident, clean, and practical, aligned to the labq.dev navy/teal system.
colors:
  navy: "#002B5C"
  teal: "#00B8A9"
  canvas: "#FFFFFF"
  ink: "#002B5C"
  muted: "oklch(0.5 0.02 254)"
  surface-soft: "oklch(0.969 0.005 254)"
  surface-accent: "oklch(0.953 0.022 184)"
  hairline: "oklch(0.925 0.005 254)"
  primary: "#00B8A9"
  primary-foreground: "oklch(0.149 0.06 254)"
  success: "oklch(0.529 0.11 164.7)"
  warning: "oklch(0.666 0.157 58.3)"
  destructive: "oklch(0.577 0.245 27.325)"
rounded:
  xs: 0px
  sm: 0px
  md: 0px
  lg: 0px
  xl: 0px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: 40px
  sidebar:
    backgroundColor: "oklch(0.985 0.005 254)"
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

# Design System: Pabriq

## 1. Overview

**Creative North Star: "Labq Workspace"**

Pabriq follows the same visual system as `https://labq.dev/` and `/Users/efishery/Documents/labq-dev-app/apps/site/src/styles/globals.css`: white canvas, navy text, teal primary action, and flat geometry.

This is a product UI, not a brand landing page. Labq's navy/teal palette becomes task-focused app chrome: teal means primary action, focus, selection, and progress; navy means text, structure, and durable app identity. Surfaces stay white or near-white. Corners stay square except true circles.

## 2. Colors

### Brand tokens

- **Navy** (`#002B5C` / `--color-navy`): headings, body text, app identity, structural labels.
- **Teal** (`#00B8A9` / `--color-teal`): primary CTA, focus ring, selected state, active progress.
- **Canvas** (`#FFFFFF`): default page background and card surface.
- **Soft surface** (`oklch(0.969 0.005 254)`): secondary panels, table headers, subtle empty states.
- **Accent surface** (`oklch(0.953 0.022 184)`): selected or teal-tinted supporting UI, never broad decoration.
- **Hairline** (`oklch(0.925 0.005 254)`): borders and input outlines.

### Theme mapping

- `--primary` is teal (`oklch(0.661 0.131 184.05)`), matching labq CTA.
- `--primary-foreground` uses deep navy instead of labq's white because white on teal is 2.86:1; deep navy on teal is 6.90:1 and keeps small product buttons AA-readable.
- `--foreground` is navy (`oklch(0.227 0.075 253.83)`).
- `--background`, `--card`, and `--popover` are pure white.
- `--sidebar` is near-white (`oklch(0.985 0.005 254)`), not dark navy.
- `--ring` follows teal for visible focus.
- `--radius` is `0`.

### Semantic colors

- **Success**: completed work, paid invoices, accepted approvals.
- **Warning**: pending approval, near deadlines, caution.
- **Destructive**: delete, reject, overdue, failed state.

Semantic colors do not replace the brand roles. Teal remains action/focus/progress, not every positive state.

## 3. Geometry

Pabriq uses sharp, flat shadcn geometry.

- Cards, dialogs, sheets, buttons, inputs, tables, chips, and panels use radius `0`.
- True circles may stay circular: avatars, notification dots, count bubbles, step indicators, and circular icon-only affordances.
- Shadows stay minimal and state-based. No soft ghost-card decoration.

## 4. Typography

Inter Variable remains the sole product family. Use standard product sizing and weight:

- 600 for page titles, section headings, and button labels.
- 500 for labels and compact navigation.
- 400 for body and table content.
- JetBrains Mono only for identifiers like order numbers, invoice numbers, and machine-readable codes.

## 5. Components

### Buttons

Primary buttons use teal background with deep navy text for AA contrast. Outline and ghost buttons use navy text and labq hairline borders. Loading state must not inject extra siblings into `Button asChild`; Radix Slot requires one child.

### Sidebar

Light sidebar. Near-white background, navy text, teal active affordances. Do not return to the previous dark navy rail.

### Data Table

White table body, cool near-white header/frame, navy text, hairline borders. Active filters can use teal accents; inactive filters stay quiet.

### Kanban Board

Columns stay dense and operational. Use semantic status tokens for production state and teal only for current/progress affordances.

### Forms

Inputs are white with labq hairline borders and teal focus ring. Placeholder and muted text must remain readable on white and near-white surfaces.

### Badge / Status

Default badges are cool near-white with navy text. Success/warning/destructive badges use semantic tokens. Pills are not the default; sharp badges are preferred unless the shape is a true circular count/dot.

## 6. Do / Don't

### Do

- Use `#00B8A9`/teal for primary CTA and focus.
- Use `#002B5C`/navy for text and structural identity.
- Keep light surfaces white or near-white.
- Keep components square unless the element is genuinely circular.
- Preserve existing app semantics: success, warning, destructive.

### Don't

- Don't use navy as primary CTA.
- Don't use dark navy sidebar in light mode.
- Don't reintroduce rounded shadcn corners.
- Don't use warm paper, cream, sand, or beige surfaces.
- Don't add gradients, glassmorphism, decorative grids, or side-stripe accents.
