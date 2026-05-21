# Dashboard Page — Strategic Alternatives

> **Context:** 30-day-challenge personal project built with TanStack Start + React 19 + shadcn/ui + Tailwind CSS v4 + Neon Postgres + Drizzle. This is a workshop/manufacturing order management SaaS ("Pabriq").
>
> **Design principle:** Users scan dashboards in ~2.3 seconds (NN/g). Limit primary metrics to 3–6.

---

## Current Domain Entities

| Entity | Key Dashboard-Relevant Fields |
|---|---|
| `orders` | status, total, createdAt, customerId, orderNumber |
| `customers` | active, createdAt, name |
| `products` | active, basePrice, name |
| `invoices` | status (unpaid/paid/overdue/void), total, dueDate, customerId, paidAt |
| `payments` | status (pending/confirmed/rejected), amount, receivedAt |
| `productionTasks` | status, board (pre_production/production), orderId, priority |
| `activityEvents` | action, targetType, targetId, actorId, createdAt |
| `members` | role, userId, orgId |

---

## Missing Metrics (Not Yet Aggregated in Schema)

These require server-side aggregation — they are not stored as rows:

| Metric | How to Compute |
|---|---|
| Revenue (period) | SUM(orders.total) WHERE status NOT IN (draft, cancelled) |
| Active orders count | COUNT(orders) WHERE status NOT IN (draft, completed, cancelled) |
| Overdue invoices | COUNT(invoices) WHERE dueDate < NOW() AND status = 'unpaid' |
| Production throughput | COUNT(productionTasks) WHERE status = 'completed' in period |
| Avg order value | AVG(orders.total) |
| New customers (period) | COUNT(customers) WHERE createdAt >= period_start |
| Top products by revenue | JOIN orders → orderLineItems → products, GROUP BY productId |

**Implication:** Dashboard server functions must run aggregation queries — no pre-computed counters exist.

---

## Alternative A: Minimal KPI Dashboard

> **Philosophy:** Show the 3–6 numbers that matter most. Let the user decide what to drill into.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Header: "Welcome back, [Name]" + date range picker │
├──────────┬──────────┬──────────┬──────────────────┤
│ KPI Card │ KPI Card │ KPI Card │    Quick Action   │
│ Revenue  │  Active  │  Overdue  │  + New Order      │
│  This    │  Orders  │ Invoices  │                   │
│  Month   │          │           │                   │
├──────────┴──────────┴───────────┴──────────────────┤
│         Recent Orders Table (last 5)                │
│  Order # | Customer | Status | Total | Date        │
└────────────────────────────────────────────────────┘
```

### Components Needed

| Component | Source |
|---|---|
| Card, CardHeader, CardTitle, CardContent | `#/components/ui/card` |
| Badge (for status) | `#/components/ui/badge` + `#/components/status-badge` |
| Button | `#/components/ui/button` |
| DataTable | `#/components/app/data-table` (recent orders) |
| SelectField / ComboboxField | `#/components/app/form` (date range) |

### Server Functions Needed

1. `getDashboardKPIs(orgId, period)` — returns `{ revenue, activeOrders, overdueInvoices, newCustomers, avgOrderValue }` computed from orders, invoices, customers
2. `getRecentOrders(orgId, limit)` — returns last N orders with customer name

### i18n Keys to Create

```ts
dashboard: {
  title: "Dashboard"
  welcome: "Welcome back, {name}"
  period: {
    thisMonth: "This Month"
    lastMonth: "Last Month"
    last30Days: "Last 30 Days"
    thisYear: "This Year"
  }
  kpi: {
    revenue: "Revenue"
    revenueDesc: "Total revenue this {period}"
    activeOrders: "Active Orders"
    activeOrdersDesc: "Orders currently in progress"
    overdueInvoices: "Overdue Invoices"
    overdueInvoicesDesc: "Invoices past due date"
    newCustomers: "New Customers"
    newCustomersDesc: "Customers added this {period}"
    avgOrderValue: "Avg Order Value"
    avgOrderValueDesc: "Average order total"
  }
  quickActions: {
    newOrder: "New Order"
    viewAllOrders: "View All Orders"
  }
  recentOrders: "Recent Orders"
  viewAll: "View All"
}
```

### Pros
- Fastest to load (2 lightweight queries)
- 2.3-second scan test passes easily
- Easy to implement incrementally
- Works for all user types

### Cons
- No drill-down capability without navigating away
- Limited context — user can't see trends
- No comparison with previous period (needs separate query)

### Best For
- **Owner/Admin** — daily health check at a glance
- **Any role** — landing page after login

---

## Alternative B: Activity Feed Dashboard

> **Philosophy:** "What happened recently?" — good for collaborative, multi-user teams where others' actions matter.

### Layout

```
┌─────────────────────────────────────────────────────┐
│  Header: "Activity" + filter by type               │
├────────────────────────┬────────────────────────────┤
│   Activity Feed        │      Summary Cards (3)     │
│   ─────────────────    │  ┌──────────────────────┐  │
│   🔵 [User] approved   │  │ Active Orders: 12    │  │
│      order #123        │  └──────────────────────┘  │
│   🟢 [User] created    │  ┌──────────────────────┐  │
│      customer X        │  │ Pending Payments: 3 │  │
│   🔴 [User] rejected   │  └──────────────────────┘  │
│      order #119        │  ┌──────────────────────┐  │
│   ─────────────────    │  │ Tasks In Queue: 8   │  │
│   Load more...         │  └──────────────────────┘  │
│                       │                             │
├────────────────────────┴────────────────────────────┤
│              Recent Orders (compact list)           │
│   [Avatar] Customer — Order # — Status — Total     │
└────────────────────────────────────────────────────┘
```

### Components Needed

| Component | Source |
|---|---|
| Card | `#/components/ui/card` |
| Avatar | `#/components/ui/avatar` + `#/components/app/avatar-photo` |
| Badge | `#/components/ui/badge` + `#/components/status-badge` |
| Tabs | `#/components/ui/tabs` (filter by activity type) |
| ScrollArea | `#/components/ui/scroll-area` |
| DataTable | `#/components/app/data-table` (compact orders) |

### Server Functions Needed

1. `getActivityFeed(orgId, filter?, limit, offset)` — reads from `activityEvents`, joins user name, supports type filtering
2. `getDashboardCounts(orgId)` — `{ activeOrders, pendingPayments, queuedTasks }`

### i18n Keys to Create

```ts
dashboard: {
  activity: {
    title: "Activity"
    filterAll: "All"
    filterOrders: "Orders"
    filterProduction: "Production"
    filterCustomers: "Customers"
    filterInvoices: "Invoices"
    loadMore: "Load more"
    noActivity: "No recent activity"
    noActivityDesc: "Activity will appear here as you work."
    // Action labels
    created: "created"
    approved: "approved"
    rejected: "rejected"
    updated: "updated"
    completed: "completed"
    // Actor labels
    by: "by"
  }
  summary: {
    pendingPayments: "Pending Payments"
    queuedTasks: "Queued Tasks"
  }
}
```

### Pros
- Social accountability — users see who did what
- Good for teams with multiple staff members
- Low-information-density — easy to scan

### Cons
- `activityEvents` table must be populated consistently by all mutations (code discipline required)
- Not useful if event logging is incomplete
- Less actionable than KPI dashboard for daily operations

### Best For
- **Multi-user teams** — see what colleagues are doing
- **Manager** — track team activity
- **Bad fit for** — solo operators who don't need social awareness

---

## Alternative C: Action-Oriented Dashboard

> **Philosophy:** "What do you need to do next?" — surfaces pending tasks, approvals, and overdue items prominently.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Your Dashboard" + greeting                    │
├───────────────────────┬──────────────────────────────────┤
│   ACTION ITEMS (4)    │       SUMMARY                    │
│   ─────────────────   │  ┌────────────┬────────────────┐ │
│  ⚠️ 3 orders awaiting │  │  Revenue   │  Active Orders  │ │
│     approval           │  │  This Month│                │ │
│                       │  └────────────┴────────────────┘ │
│  ⚠️ 2 payments need   │                                  │
│     confirmation       │                                  │
│                       ├──────────────────────────────────┤
│  📋 5 production tasks │      TOP PRODUCTS               │
│     need advancement   │  1. Product A — 45 orders       │
│                       │  2. Product B — 32 orders        │
│  🔴 1 invoice overdue  │  3. Product C — 18 orders       │
│                       │                                  │
└───────────────────────┴──────────────────────────────────┘
```

### Components Needed

| Component | Source |
|---|---|
| Card, CardHeader, CardTitle, CardDescription | `#/components/ui/card` |
| Badge | `#/components/ui/badge` |
| Alert | `#/components/ui/alert` (for action items) |
| Button | `#/components/ui/button` |
| Progress | `#/components/ui/progress` (optional: completion %) |
| Tabs | `#/components/ui/tabs` (segment action types) |
| DataTable | `#/components/app/data-table` (top products) |

### Server Functions Needed

1. `getActionItems(orgId)` — returns `{ pendingApprovals, pendingPayments, queuedTasks, overdueInvoices }` with counts + sample items
2. `getRevenueKPIs(orgId)` — same as KPI dashboard revenue query
3. `getTopProducts(orgId, limit)` — aggregation of order line items grouped by product

### i18n Keys to Create

```ts
dashboard: {
  actions: {
    title: "Your Tasks"
    pendingApproval: "Awaiting Approval"
    pendingApprovalDesc: "{count} orders need your review"
    pendingPayments: "Payments to Confirm"
    pendingPaymentsDesc: "{count} payments pending confirmation"
    queuedTasks: "Production Queue"
    queuedTasksDesc: "{count} tasks waiting to advance"
    overdueInvoices: "Overdue Invoices"
    overdueInvoicesDesc: "{count} invoices past due date"
    noActions: "You're all caught up! ✓"
    noActionsDesc: "No pending actions at the moment."
    viewItem: "View"
    takeAction: "Review"
  }
  topProducts: {
    title: "Top Products"
    subtitle: "By order volume this month"
    noData: "No orders yet"
  }
}
```

### Pros
- Immediately actionable — user sees what to do next
- Reduces "where do I start?" friction
- Prioritization is implicit (count + urgency via alert variant)

### Cons
- Most complex to build — 3+ queries, more UI surface
- Action items require role-based visibility (admin sees approvals, staff sees tasks)
- Needs careful UX testing to ensure right actions surface for right roles

### Best For
- **Admin/Owner** — daily review of what needs attention
- **Workflow-heavy apps** — production/manufacturing context fits well
- **Bad fit for** — read-only or analytics-first use cases

---

## Cross-Cutting Concerns

### Date Range Support

All three alternatives need a date range selector. Options:

1. **Preset chips** — `7d`, `30d`, `90d`, `This Month`, `Last Month` (simplest)
2. **Custom date picker** — full calendar range (more flexible, more work)

Recommendation: Start with presets. Add custom picker in v2 if needed.

### Theme Support

- All shadcn/ui components support dark mode via `.dark` class on `<html>`
- Charts (if added later) need `currentColor` or CSS variable for theming
- No special handling needed — just verify `.dark` class applies correctly

### Mobile

- KPI cards stack to 2-col grid on mobile
- Activity feed works well on mobile (vertical scroll)
- DataTable already handles mobile with `mobileRole` per column
- Action items stack vertically on small screens

---

## Recommendation Matrix

| Criterion | A: KPI | B: Activity Feed | C: Action-Oriented |
|---|---|---|---|
| Implementation complexity | Low | Medium | High |
| Time to ship (estimate) | 1–2 days | 2–3 days | 3–5 days |
| Scan test (2.3s) | ✅ Pass | ✅ Pass | ✅ Pass (if under 4 actions) |
| Actionability | Medium | Low | High |
| Team collaboration | Low | High | Medium |
| Fits solo operator | ✅ | ❌ | ✅ |
| Fits multi-user team | ✅ | ✅ | ✅ |
| Requires event logging | ❌ | ✅ | ❌ |
| Role-based filtering | Optional | Optional | Required |

---

## Suggested Path: Start with A, Expand to C

1. **Ship Alternative A first** — minimal KPI cards + recent orders table. Gets the dashboard page live with minimal effort.

2. **Add action items incrementally** — once A is live, add the "pending approvals" alert card on top. This is the first step toward C.

3. **Refine based on usage** — observe which metrics users click. Build deeper drill-down pages for the most-visited ones.

**Don't build C fully from day 1** — the action items logic requires role-based filtering, which needs the permissions feature to be stable. A is safe to ship now; C depends on that foundation.

---

## Server Functions to Create

```ts
// src/features/dashboard/model.ts
export type DashboardKPIs = {
  revenue: number
  revenueChange: number        // % vs previous period
  activeOrders: number
  overdueInvoices: number
  newCustomers: number
  avgOrderValue: number
}

// src/features/dashboard/server.ts
// 1. getDashboardKPIs(orgId: string, period: DateRange)
// 2. getRecentOrders(orgId: string, limit?: number)
// 3. getActivityFeed(orgId: string, filter?: ActivityFilter, page?: number)
// 4. getActionItems(orgId: string, role?: MemberRole)
// 5. getTopProducts(orgId: string, period?: DateRange, limit?: number)
```

---

*Last updated: 2026-05-18*
