# Sidebar & Navigation

## App Sidebar (`src/components/app-sidebar.tsx`)

Standard sidebar layout with:
- `TeamSwitcher` — org display/selector
- `NavMain` — navigation groups with items (icon + title + url)
- `NavUser` — user avatar/name dropdown with sign-out

## Nav Items Pattern

Nav items use lucide icons and route paths:

```typescript
const items = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Orders', url: '/orders', icon: ShoppingCart },
]
```

## Layout Composition (`_org.tsx`)

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

The header reads `pageTitle` and `primaryAction` from leaf route context for mobile display.
