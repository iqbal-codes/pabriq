# Components

> **Rules:** [`../rules/ui.md`](../rules/ui.md) — shadcn compliance, form/component conventions, non-negotiables.

## UI Primitives (`src/components/ui/`)

57 shadcn/ui components. Most follow the pattern `Primitive`, `PrimitiveTrigger`, `PrimitiveContent`, etc.

| File | Key Exports |
|---|---|
| `accordion.tsx` | Accordion, AccordionItem, AccordionTrigger, AccordionContent |
| `alert.tsx` | Alert, AlertTitle, AlertDescription |
| `alert-dialog.tsx` | AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader/F, AlertDialogTitle/Desc, AlertDialogAction/Cancel |
| `avatar.tsx` | Avatar, AvatarImage, AvatarFallback |
| `badge.tsx` | Badge (variants: default, secondary, destructive, outline, success, warning) |
| `breadcrumb.tsx` | Breadcrumb, BreadcrumbList/Item/Link/Page/Separator/Ellipsis |
| `button.tsx` | Button (variants: default/destructive/outline/secondary/ghost/link; sizes: default/sm/lg/icon/icon-sm) |
| `calendar.tsx` | Calendar (day picker) |
| `card.tsx` | Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent |
| `checkbox.tsx` | Checkbox |
| `collapsible.tsx` | Collapsible, CollapsibleTrigger, CollapsibleContent |
| `combobox.tsx` | Combobox, ComboboxInput, ComboboxContent, ComboboxListbox, ComboboxOption |
| `command.tsx` | Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator |
| `dialog.tsx` | Dialog, DialogTrigger, DialogContent, DialogHeader/F, DialogTitle/Desc, DialogClose |
| `drawer.tsx` | Drawer, DrawerTrigger, DrawerContent, DrawerHeader/F, DrawerTitle/Desc, DrawerClose |
| `dropdown-menu.tsx` | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent/Item/CheckboxItem/RadioItem/Label/Separator/Shortcut/Sub/SubTrigger/SubContent/RadioGroup |
| `field.tsx` | Field, FieldContent, FieldLabel, FieldError, FieldSet, FieldGroup, FieldLegend |
| `input.tsx` / `label.tsx` | Input, Label |
| `native-select.tsx` | NativeSelect, NativeSelectOption |
| `pagination.tsx` | Pagination, PaginationContent/Ellipsis/Item/Link/Next/Previous |
| `popover.tsx` | Popover, PopoverTrigger, PopoverContent, PopoverAnchor |
| `progress.tsx` | Progress |
| `radio-group.tsx` | RadioGroup, RadioGroupItem |
| `scroll-area.tsx` | ScrollArea, ScrollBar |
| `select.tsx` | Select, SelectGroup/Value/Trigger/Content/Label/Item/Separator/ScrollUpButton/ScrollDownButton |
| `separator.tsx` | Separator |
| `sheet.tsx` | Sheet, SheetTrigger, SheetContent, SheetHeader/F, SheetTitle/Desc, SheetClose |
| `sidebar.tsx` | Sidebar, SidebarContent/Footer/Group/GroupAction/GroupContent/GroupLabel/Header/Input/Inset/Menu/MenuAction/MenuBadge/MenuButton/MenuItem/MenuSkeleton/MenuSub/MenuSubButton/MenuSubItem/Provider/Rail/Separator/Trigger, useSidebar |
| `skeleton.tsx` | Skeleton |
| `slider.tsx` / `switch.tsx` | Slider, Switch |
| `sonner.tsx` | Toaster |
| `spinner.tsx` | Spinner |
| `table.tsx` | Table, TableHeader/Body/Footer/Head/Row/Cell/Caption |
| `tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent |
| `textarea.tsx` | Textarea |
| `theme-provider.tsx` | ThemeProvider (next-themes wrapper) |
| `toggle.tsx` / `toggle-group.tsx` | Toggle, ToggleGroup, ToggleGroupItem |
| `tooltip.tsx` | TooltipProvider, Tooltip, TooltipTrigger, TooltipContent |

## Page Shell (`src/components/app/page-shell/`)

| Component | Props | Description |
|---|---|---|
| `PageHeader` | title, description?, backTo?, actions?: PageAction[] | Page heading with optional back link and action buttons |
| `PageContent` | className?, children | Centered content wrapper (max-w-5xl) |
| `PageActions` | children | Primary button + secondary dropdown container |
| `Breadcrumbs` | (reads route context) | Auto-breadcrumbs from route `beforeLoad` |
| `EmptyState` | icon: LucideIcon, title, description?, action?: { label, href } | Empty/no-results state |

`PageAction` type: `{ label, icon?: LucideIcon, href?, onClick?, isLoading? }`

## Status Badge (`src/components/status-badge.tsx`)

Maps entity statuses to badge variants using `useTranslations('status')`.

## Confirm Dialog (`src/components/confirm-dialog.tsx`)

AlertDialog wrapper with i18n labels. Props: `open`, `onOpenChange`, `title`, `description`, `onConfirm`, `confirmLabel?`, `variant?` ('default' | 'destructive').

## Theme & Language Toggles (`src/components/app/header-controls.tsx`)

- `ThemeToggle` — Sun/Moon icon button using next-themes
- `LanguageToggle` — Dropdown for en/id switching (URL-based + cookie)

## Asset Image (`src/components/app/asset-image.tsx`)

Image/video preview with signed URL resolution. Click-to-open dialog lightbox.

## Avatar Photo (`src/components/app/avatar-photo.tsx`)

Avatar with signed URL image + initials fallback.
