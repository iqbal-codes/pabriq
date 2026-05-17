# Badge Component

**Path:** `src/components/ui/badge.tsx`

## Full Path
```
/Users/efishery/Documents/workspace/labq-projects/30-day-challenges/my-tanstack-app/src/components/ui/badge.tsx
```

## Content

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#/lib/utils.ts"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        success:
          "bg-success text-success-foreground [a&]:hover:bg-success/90",
        warning:
          "bg-warning text-warning-foreground [a&]:hover:bg-warning/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
```

## Summary

- **Path:** `src/components/ui/badge.tsx` (19 lines)
- **Dependencies:** `react`, `class-variance-authority`, `radix-ui` (Slot), `#/lib/utils.ts` (cn)
- **Exports:** `Badge` (component), `badgeVariants` (CVA config)
- **Variants:** `default`, `secondary`, `destructive`, `success`, `warning`, `outline`, `ghost`, `link`
- **Props:** All standard `span` props + `variant` (from CVA) + `asChild` (renders Slot.Root instead of span)
- **Usage in project:** Imported via `#/components/ui/badge` in at least 3 files: `app/data-table/data-table-filter-combobox.tsx`, `app/asset-file.tsx`, `app/data-table/data-table-filter-trigger.tsx`, plus `status-badge.tsx` wraps it.
