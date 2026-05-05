# Styling

## Tailwind CSS v4

Config at `src/styles.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";
@plugin "@tailwindcss/typography";

@theme inline {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.141 0.005 285.823);
  /* ... all theme tokens in oklch */
  --radius: 0.5rem;
}
```

## Theme Variables (oklch)

| Token | Purpose |
|---|---|
| `--color-background` / `--color-foreground` | Page background + text |
| `--color-card` / `--color-card-foreground` | Card surfaces |
| `--color-primary` / `--color-primary-foreground` | Primary actions |
| `--color-secondary` / `--color-secondary-foreground` | Secondary actions |
| `--color-muted` / `--color-muted-foreground` | Subtle text/surfaces |
| `--color-accent` / `--color-accent-foreground` | Accent highlights |
| `--color-destructive` / `--color-destructive-foreground` | Error/danger |
| `--color-border` / `--color-input` | Borders and inputs |
| `--color-ring` | Focus rings |
| `--color-sidebar-*` | Sidebar theme |
| `--radius` | Border radius (0.5rem) |

Dark mode via `.dark` class override of all variables.

## Font

```css
font-family: ui-sans-serif, system-ui, sans-serif;
```

## Key Conventions

- All colors use oklch color space
- Dark mode via `.dark` class on `<html>`
- Tailwind utility classes for all styling (no separate CSS files per component)
- `tw-animate-css` for animations
- `@tailwindcss/typography` plugin for prose content
