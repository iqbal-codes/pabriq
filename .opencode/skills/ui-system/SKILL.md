---
name: ui-system
description: UI component system — shadcn primitives, app components, forms, DataTable, sidebar, styling, and asset upload. Use when building or modifying UI components, forms, tables, navigation, or when user mentions shadcn, forms, data tables, sidebar.
---

# UI System

## Non-Negotiables

- MUST use shadcn/ui primitives — never raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<table>`, `<dialog>`, `<label>` standalone. Use `Button`, `Input`, `NativeSelect`, `Textarea`, `Table`, `Dialog`, `Label` from `#/components/ui/*`.
- MUST use `useAppForm` from `#/components/app/form` for all form state. MUST NOT use raw `useState` for field values.
- MUST wrap form fields in `form.AppField` with the field component from `#/components/app/form`.
- MUST use `nuqs` (`useQueryState`, `parseAsString`) for URL search params. MUST NOT use raw `useSearchParams`.
- MUST use lucide-react for icons. MUST NOT use emoji or other icon libraries.
- MUST use `Button asChild` when wrapping a `Link` in a `Button`.
- MUST use `PageContent` and `PageHeader` from `#/components/app/page-shell` for workspace pages.
- MUST use `DataTable` from `#/components/app/data-table` for lists with columns.

## UI Primitives

57 shadcn/ui components in `src/components/ui/`. Key primitives:

| File | Exports |
|---|---|
| `button.tsx` | Button (variants: default/destructive/outline/secondary/ghost/link; sizes: default/sm/lg/icon/icon-sm) |
| `card.tsx` | Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent |
| `badge.tsx` | Badge (variants: default, secondary, destructive, outline, success, warning) |
| `dialog.tsx` / `alert-dialog.tsx` | Dialog + AlertDialog variants with trigger/content/header/footer |
| `select.tsx` / `combobox.tsx` | Select + Combobox (searchable popover) |
| `sidebar.tsx` | Sidebar, SidebarContent/Footer/Group/Menu/Provider/Trigger, useSidebar |
| `table.tsx` | Table, TableHeader/Body/Footer/Head/Row/Cell/Caption |
| `field.tsx` | Field, FieldContent, FieldLabel, FieldError, FieldSet |
| `dropdown-menu.tsx` | Full dropdown with items, submenus, separators |
| `sheet.tsx` | Sheet side panel with trigger/content/header |
| `pagination.tsx` | Pagination with content/ellipsis/item/link/next/previous |
| `tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent |
| All 57: accordion, alert, avatar, breadcrumb, calendar, checkbox, collapsible, command, drawer, input, label, native-select, popover, progress, radio-group, scroll-area, separator, skeleton, slider, sonner, spinner, switch, textarea, theme-provider, toggle, toggle-group, tooltip |

## App Components

### Page Shell (`#/components/app/page-shell`)
- **PageHeader** — title, description?, backTo?, actions?: PageAction[]
- **PageContent** — centered wrapper (max-w-5xl)
- **PageActions** — primary button + secondary dropdown
- **Breadcrumbs** — auto from route beforeLoad context
- **EmptyState** — icon, title, description?, action?

### Status Badge (`#/components/status-badge`)
Maps statuses to badge variants via `useTranslations('status')`.

### Confirm Dialog (`#/components/confirm-dialog`)
AlertDialog wrapper with i18n labels. Props: open, onOpenChange, title, description, onConfirm, confirmLabel?, variant?.

### Theme & Language Toggles (`#/components/app/header-controls`)
ThemeToggle (Sun/Moon, next-themes) + LanguageToggle (en/id dropdown).

### Asset Image / Avatar Photo
- AssetImage — image/video with signed URL + lightbox
- AvatarPhoto — avatar with URL image + initials fallback

## Form System

Setup at `#/components/app/form/form-context.tsx` (createFormHook + createFormHookContexts). Exports `useAppForm` and `withForm`.

### Field Components

| Component | Type | Description |
|---|---|---|
| TextField | string | Text input |
| EmailField | string | Email input |
| PasswordField | string | Password input |
| TextareaField | string | Multi-line text |
| NumberField | number | Numeric with Indonesian formatting |
| PhoneField | string | Tel with +62 prefix |
| SelectField | string | Native select |
| ComboboxField | string / string[] | Searchable popover (single/multi) |
| AddressField | AddressValue | Area search + street |
| AreaSearchField | string | Biteship area search |
| PhotoUploadField | string / string[] | Photo upload with preview |
| FileUploadField | string[] | File upload list |

### Form Components
- **SubmitButton** — auto-disables during submission
- **FormError** — Alert with AlertCircle icon

### Layout Components
- **FormRoot** — form wrapper with context
- **FormSection** — section with legend
- **FormGrid** — columns: 1|2|3
- **FormActions** — button row layout

### Usage Pattern
```tsx
import { useAppForm, FormRoot, FormSection, FormGrid, FormActions } from '#/components/app/form'

const form = useAppForm({
  defaultValues: { name: '', email: '' },
  onSubmit: async ({ value }) => { /* server fn */ },
})

return (
  <FormRoot form={form}>
    <FormSection title="Details">
      <FormGrid columns={2}>
        <form.AppField name="name">
          {(field) => <field.TextField label="Name" />}
        </form.AppField>
      </FormGrid>
    </FormSection>
    <FormActions>
      <form.AppForm>
        <form.SubmitButton>Save</form.SubmitButton>
      </form.AppForm>
    </FormActions>
  </FormRoot>
)
```

### Array Fields (Dynamic Lists)
```tsx
<form.AppField name="items" mode="array">
  {(itemsField) => (
    <div>
      {itemsField.state.value.map((_, i) => (
        <div key={i}>
          <form.AppField name={`items[${i}].name`}>
            {(field) => <field.TextField label="Name" />}
          </form.AppField>
          <button onClick={() => itemsField.removeValue(i)}>Remove</button>
        </div>
      ))}
      <button onClick={() => itemsField.pushValue({ name: '', quantity: '1' })}>Add</button>
    </div>
  )}
</form.AppField>
```

## DataTable System

`#/components/app/data-table` — wraps @tanstack/react-table.

```tsx
import { DataTable } from '#/components/app/data-table'
import type { AppColumnDef } from '#/components/app/data-table'

const columns: AppColumnDef<Item>[] = [
  { accessorKey: 'name', header: 'Name', meta: { label: 'Name', mobileRole: 'title' } },
  { accessorKey: 'status', header: 'Status', meta: { label: 'Status', mobileRole: 'badge' },
    cell: ({ row }) => <StatusBadge status={row.original.status} /> },
]

<DataTable columns={columns} data={data} isLoading={isLoading} labels={dt} />
```

### Filter Types: combobox-single, combobox-multi, date-single, date-range, radio-chips, custom

### Sub-components
DataTableSearch, DataTablePagination, DataTableToolbar, DataTableViewOptions, DataTableFilterPanel, DataTableFilterTrigger, DataTableFilterChips, DataTableFilterCombobox, DataTableFilterDate, DataTableActiveFilterChips, DataTableMobileCard, DataTableProvider

## Sidebar & Navigation

`#/components/app-sidebar` — TeamSwitcher + NavMain + NavUser.

```tsx
<SidebarProvider>
  <AppSidebar user={user} org={org} />
  <SidebarInset>
    <header>
      <SidebarTrigger />
      <Breadcrumbs />
      <ThemeToggle />
      <LanguageToggle />
    </header>
    <Outlet />
  </SidebarInset>
</SidebarProvider>
```

## Asset Upload

Components: AssetUploadDropzone, PhotoGridUpload, FileListUpload.
Adapter interface: `{ uploadFile(item, onProgress) => UploadResult, removeFile(assetId) }`.
Hook: `useUploadMachine({ config, adapter })` returns `{ items, addItems, removeItem, retryItem }`.

## Styling

Tailwind CSS v4 at `src/styles.css`. All colors in oklch. Dark mode via `.dark` class. Font: `ui-sans-serif, system-ui, sans-serif`. `tw-animate-css` for animations. `@tailwindcss/typography` plugin.

## References

When you need deeper detail, read the bundled reference files:

- UI components reference: [`references/components.md`](references/components.md)
- Form system (fields, layout, arrays): [`references/form-system.md`](references/form-system.md)
- DataTable (columns, filters, sub-components): [`references/data-table.md`](references/data-table.md)
- Sidebar & navigation: [`references/sidebar-navigation.md`](references/sidebar-navigation.md)
- Styling (Tailwind, theme tokens): [`references/styling.md`](references/styling.md)
- Asset upload (components, adapter, hook): [`references/asset-upload.md`](references/asset-upload.md)
