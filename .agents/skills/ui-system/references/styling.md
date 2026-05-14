# Styling

## Source of Truth

The full design system is defined in [`DESIGN.md`](../../../../DESIGN.md) at the project root. This reference summarizes the applied tokens.

## Tailwind CSS v4

Config at `src/styles.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";
```

## Theme Variables

All variables are defined as CSS custom properties in `src/styles.css` and mapped to Tailwind utilities via `@theme inline`.

### Light Mode

| Variable | Value | DESIGN Token |
|---|---|---|
| `--background` | `#ffffff` | canvas |
| `--foreground` | `#111111` | ink |
| `--card` | `#ffffff` | canvas |
| `--card-foreground` | `#111111` | ink |
| `--primary` | `#111111` | primary |
| `--primary-foreground` | `#ffffff` | on-primary |
| `--secondary` | `#f5f5f5` | surface-card |
| `--secondary-foreground` | `#111111` | ink |
| `--muted` | `#f5f5f5` | surface-card |
| `--muted-foreground` | `#6b7280` | muted |
| `--accent` | `#f5f5f5` | surface-card |
| `--accent-foreground` | `#111111` | ink |
| `--border` / `--input` | `#e5e7eb` | hairline |
| `--ring` | `#111111` | primary |

### Dark Mode

| Variable | Value | DESIGN Token |
|---|---|---|
| `--background` | `#101010` | surface-dark |
| `--card` / `--popover` / `--secondary` / `--muted` / `--accent` | `#1a1a1a` | surface-dark-elevated |
| `--foreground` / `--card-foreground` / ... | `#ffffff` | on-dark |
| `--muted-foreground` / `--secondary-foreground` | `#a1a1aa` | on-dark-soft |
| `--border` / `--input` | `#333333` | — |

### Custom Color Tokens (available as Tailwind classes)

| Token | Value | Example usage |
|---|---|---|
| `ink` | `#111111` | `text-ink` |
| `body` | `#374151` | `text-body` |
| `muted-soft` | `#898989` | `text-muted-soft` |
| `surface-soft` | `#f8f9fa` | `bg-surface-soft` |
| `surface-card` | `#f5f5f5` | `bg-surface-card` |
| `surface-strong` | `#e5e7eb` | `bg-surface-strong` |
| `surface-dark` | `#101010` | `bg-surface-dark` |
| `surface-dark-elevated` | `#1a1a1a` | `bg-surface-dark-elevated` |
| `hairline` | `#e5e7eb` | `border-hairline` |
| `hairline-soft` | `#f3f4f6` | `border-hairline-soft` |
| `brand-accent` | `#3b82f6` | `text-brand-accent` |
| `success` | `#10b981` | `text-success` |
| `warning` | `#f59e0b` | `text-warning` |
| `error` | `#ef4444` | `text-error` |
| `badge-orange` | `#fb923c` | `bg-badge-orange` |
| `badge-pink` | `#ec4899` | `bg-badge-pink` |
| `badge-violet` | `#8b5cf6` | `bg-badge-violet` |
| `badge-emerald` | `#34d399` | `bg-badge-emerald` |
| `on-dark` | `#ffffff` | `text-on-dark` |
| `on-dark-soft` | `#a1a1aa` | `text-on-dark-soft` |

## Font Stack

| Role | Family | CSS token |
|---|---|---|
| Body / UI | Inter | `--font-sans` (`font-sans`) |
| Display headings | Cal Sans, Inter fallback | `--font-display` (`font-display`) |
| Code | JetBrains Mono | `--font-mono` (`font-mono`) |

Inter and JetBrains Mono are loaded via Google Fonts CDN in `src/routes/__root.tsx`.

## Border Radius Scale

| Tailwind class | Value | DESIGN token | Used by |
|---|---|---|---|
| `rounded-sm` | 4px | xs | — |
| `rounded-md` | 6px | sm | small elements |
| `rounded-lg` | 8px | md | Buttons, Inputs, Selects, Textareas |
| `rounded-xl` | 12px | lg | Cards |
| `rounded-2xl` | 16px | xl | Hero mockup containers |
| `rounded-full` | 9999px | pill / full | Badges, Avatars, Icon buttons |

## Key Conventions

- **No standalone raw HTML elements** — use shadcn/ui primitives (`Button`, `Input`, `Card`, etc.)
- **Dark mode** via `.dark` class — all variables swap to dark palette
- **Custom tokens** like `bg-surface-card`, `text-muted-soft` are direct Tailwind classes via `@theme inline`
- **`tw-animate-css`** for animations
- **`@tailwindcss/typography`** plugin for prose content
- See `DESIGN.md` for the full design rationale, spacing scale, and component specs
