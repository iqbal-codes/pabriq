# Pabriq — Product Requirements Document

> **Version:** 2.0
> **Last Updated:** 2026-06-21

---

## Problem Statement

Made-To-Order businesses such as custom merchandise shops, printing houses, furniture workshops, clothing makers, and similar production operations run on fragmented tools. Owners and admins often need separate spreadsheets, chat threads, payment records, customer forms, production boards, and manual status updates to move one order from inquiry to delivery.

This creates operational gaps: order details are incomplete, product pricing is inconsistent, production tasks are hard to track, operators lack a focused shop-floor view, customers need repeated manual follow-up, and owners do not get a reliable picture of active orders, invoices, and production bottlenecks.

Pabriq should become the operating system for small and medium MTO organizations: one authenticated workspace for the business, one token-based order experience for customers, and one production flow that turns approved orders into actionable kanban tasks.

---

## Solution

Build Pabriq as an MTO SaaS platform for order intake, product catalog management, pricing, customer approval, invoice/payment tracking, and production execution.

The product supports an organization workspace with roles for Owner, Admin, Member, and Operator. Each organization owns its customers, products, orders, invoices, workflow stages, production tasks, settings, and members. The architecture is multi-tenant-ready through organization membership and org-scoped data isolation.

### Core Product Flow

1. A new user signs up or signs in.
2. If the user has no organization, the user completes onboarding by entering the organization name and optional logo.
3. Pabriq creates the organization and routes the user into the workspace.
4. An Admin defines products, pricing rules, and workflow stages.
5. An Admin creates a draft order for a customer.
6. The customer opens a secure token link to review order details, submit required data, upload design files, and confirm the order.
7. The order moves through draft → pending → approved → production → in_delivery → completed states (or cancelled/rejected).
8. When approved, Pabriq creates production tasks based on the organization's workflow stages.
9. Operators see only the production surface and advance tasks through button-based stage transitions.
10. Owners and Admins monitor active orders, production bottlenecks, invoices, and customer activity from the dashboard.

---

## Target Personas

### Internal Users

#### Owner
- **Role:** Business decision-maker with full platform access
- **Goals:** Revenue oversight, team management, platform configuration, financial health
- **Pain:** Disconnected spreadsheets, manual status updates, no visibility into production
- **Access:** Full CRUD on all resources, role management, settings

#### Admin
- **Role:** Operations lead; manages orders, production workflows, products, customers, team
- **Goals:** Keep orders flowing, review and approve items, track payments, configure stages
- **Pain:** Coordinating design approvals, managing production stages, tracking payments
- **Access:** CRUD on most resources, cannot delete organization or manage owner

#### Member
- **Role:** Team member with limited write access
- **Goals:** View resources, create orders and customers, assist with daily operations
- **Pain:** Needs to contribute without full admin overhead
- **Access:** Read on most resources, create orders and customers, advance production tasks

#### Operator
- **Role:** Production worker; advances orders through stages, completes tasks on the shop floor
- **Goals:** See assigned work, move items through stages, access customer specs and files
- **Pain:** Disconnected from customer context, unclear priorities, difficulty accessing design files
- **Access:** Production menu only, task advancement, task detail view

### External Users

#### Customer
- **Role:** Places or completes orders via secure token link — no login required
- **Goals:** Submit custom specifications, upload design files, track production status, pay invoices
- **Pain:** Chasing staff for updates, unclear pricing, slow revision cycles on designs
- **Access:** Token-based portal scoped to one order

---

## User Stories

### Authentication & Onboarding

1. As an Owner, I want to create an organization during onboarding, so that I can start using Pabriq without manual setup.
2. As an Owner, I want Pabriq to remember my organization after login, so that I land directly in my workspace.
3. As an Owner, I want each user to belong to one organization for the first version, so that the product remains simple while the business model is validated.
4. As an Owner, I want my organization's data isolated from other organizations, so that customer, order, invoice, and production information stays private.
5. As an Owner, I want to invite team members, so that admins, members, and operators can collaborate in the workspace.
6. As an Owner, I want to assign roles to members, so that each user sees only the capabilities they need.
7. As an Owner, I want to manage billing-ready organization data, so that Pabriq can support subscriptions later.

### Dashboard & Visibility

8. As an Owner, I want a dashboard summary of active orders, products, and invoices, so that I understand business health quickly.
9. As an Owner, I want to see production bottlenecks, so that I can identify where orders are getting delayed.
10. As an Owner, I want to see outstanding invoices, so that I can follow up on unpaid orders.
11. As an Owner, I want to configure organization settings, so that Pabriq matches my workshop's operating model.

### Products & Pricing

12. As an Admin, I want to create and edit products, so that my team can quote and sell standard MTO items.
13. As an Admin, I want to define product variants, so that customers can order different sizes, materials, colors, or configurations.
14. As an Admin, I want to configure pricing breakpoints, so that Pabriq can interpolate prices consistently across quantities.
15. As an Admin, I want to attach production requirements to products, so that approved orders create the right production work.
16. As an Admin, I want to mark products as active or inactive, so that unavailable items do not appear in new orders.
17. As an Admin, I want to set product priority flags, so that urgent products are visually distinguished in production.
18. As an Admin, I want to duplicate products, so that similar items don't require rebuilding from scratch.
19. As an Admin, I want optional addons per product (per-unit or per-order), so that extras are tracked and priced correctly.

### Customers

20. As an Admin, I want to manage customers, so that repeat buyers can be reused across orders.
21. As an Admin, I want to search customers by name, email, or phone, so that I can find records quickly.
22. As an Admin, I want customer detail views with stats and order history, so that I understand the relationship.
23. As an Admin, I want a credit guard flag per customer, so that I can control credit-based orders.

### Orders

24. As an Admin, I want to create a draft order, so that I can prepare customer-specific order details before sending a confirmation link.
25. As an Admin, I want to add line items to an order, so that the order reflects what the customer wants to buy.
26. As an Admin, I want Pabriq to calculate order totals from product pricing rules, so that pricing stays consistent and less manual.
27. As an Admin, I want to override or adjust pricing when needed, so that custom commercial agreements remain possible.
28. As an Admin, I want to add notes and requirements to an order, so that production has enough context.
29. As an Admin, I want to generate a secure customer token link, so that the customer can review and confirm without creating an account.
30. As an Admin, I want to resend a customer token link, so that customers can recover access to their order review page.
31. As an Admin, I want a pending order queue, so that customer-submitted orders can be reviewed before approval.
32. As an Admin, I want to approve a pending order with a promised delivery date and payment terms, so that production tasks can be created.
33. As an Admin, I want to reject or cancel an order with a reason, so that invalid or abandoned orders do not enter production.
34. As an Admin, I want to move an approved order into production, so that the team knows work has started.
35. As an Admin, I want to mark an order as in delivery with shipping details, so that delivery status is visible to the team.
36. As an Admin, I want to complete an order with a receipt number, so that finished work is removed from active production views.
37. As an Admin, I want to see an order timeline, so that I understand what happened and when.
38. As an Admin, I want to search and filter orders, so that I can find work by status, customer, due date, or product.
39. As an Admin, I want URL-backed filters, so that order and production views can be shared or restored.
40. As an Admin, I want to duplicate a past order and link previous assets, so that repeat customers don't require rebuilding from scratch.

### Invoices & Payments

41. As an Admin, I want to create invoices for approved orders, so that payment tracking is tied to the order lifecycle.
42. As an Admin, I want to record manual bank transfer payments with proof upload, so that the platform works without payment processor integration.
43. As an Admin, I want to mark invoices as paid, partially paid, void, or overdue, so that receivables are clear.
44. As an Admin, I want to generate invoice PDFs, so that professional documents can be sent to customers.
45. As an Admin, I want to generate quotation PDFs, so that pre-order quotes look professional.
46. As an Admin, I want to manage payment methods (bank accounts), so that customers know where to transfer.
47. As an Admin, I want invoice status to affect order visibility, so that payment-sensitive work can be tracked properly.
48. As an Admin, I want standalone invoice line items, so that charges not tied to order line items can be billed.
49. As an Admin, I want public invoice access via order token, so that customers can view and pay invoices without login.
50. As an Admin, I want custom invoice number prefixes and tax ID fields, so that invoices meet local business requirements.
51. As an Admin, I want payment gateway integration (virtual account, QRIS, e-wallet, retail outlet), so that customers have automated payment options.

### Production Workflow

52. As an Admin, I want to view production tasks by order, so that I can inspect progress at the order level.
53. As an Admin, I want to view production tasks on a kanban board by stage, so that I can manage the workshop workload.
54. As an Admin, I want to configure workflow stages (name, color, order, approval gates, privacy, admin-only), so that Pabriq matches my production process.
55. As an Admin, I want workflow stages to be ordered, so that tasks move through a clear production path.
56. As an Admin, I want workflow changes to affect future tasks safely, so that existing production work does not break unexpectedly.
57. As an Admin, I want stage requirement builder (file upload, text, number, dropdown, checkbox, date), so that operators provide the right data at each step.
58. As an Admin, I want approval gates on stages, so that critical steps are reviewed before advancement.
59. As an Admin, I want to archive completed tasks, so that the board stays clean.
60. As an Admin, I want workflow templates (standard production, custom job, simple assembly), so that new setups are fast.
61. As an Admin, I want a production scheduling or Gantt view, so that I can plan capacity per operator and machine.
62. As an Operator, I want button-based stage advancement (not drag-and-drop), so that shop-floor state changes are deliberate and reliable.

### Design & Artwork Review

63. As an Admin, I want a dedicated design review page listing orders needing approval, so that artwork is checked before production.
64. As an Admin, I want to approve artwork or request revision with notes, so that the design loop is tracked.
65. As an Admin, I want to upload design files to task attachments, so that the latest version is always accessible.
66. As an Admin, I want to reassign an operator to an order, so that workload is balanced.

### Assets & Reusable Resources

67. As an Admin, I want to upload and manage reusable assets (screen, mold, pattern, template, equipment, other), so that setup costs are tracked.
68. As an Admin, I want to distinguish customer-owned vs company-owned assets, so that ownership is clear.
69. As an Admin, I want auto-generated asset numbers, so that assets are easy to reference.
70. As an Admin, I want a customer assets panel in order and customer views, so that existing materials are visible.
71. As an Admin, I want to link assets in the order form, so that repeat work reuses existing materials.
72. As an Admin, I want a quick-add asset dialog, so that new assets can be created inline.
73. As an Admin, I want asset upload with progress tracking, so that large files are handled gracefully.

### Finance & Expenses

74. As an Owner, I want expense categories (COGS, operational labor, utilities, operational expenses, capital expenses), so that costs are classified.
75. As an Owner, I want a finance dashboard with income vs expense chart, so that profitability is visible.
76. As an Owner, I want a recent transactions table, so that cash flow is clear at a glance.
77. As an Owner, I want CSV export for orders, invoices, and expenses, so that data can be analyzed externally.

### Team & Operator Management

78. As an Owner, I want to list team members and pending invitations, so that I know who has access.
79. As an Owner, I want to invite by email with role assignment, so that new team members get appropriate access.
80. As an Owner, I want to update member roles and remove members, so that access stays current.
81. As an Owner, I want to cancel invitations, so that stale invites don't create confusion.
82. As an Owner, I want operator CRUD with temporary password generation, so that shop-floor workers have focused access.
83. As an Operator, I want a separate login flow with temporary password on first login, so that my experience is distinct from admin users.

### Device Pairing

84. As an Operator, I want to pair a device with a PIN session, so that shared terminals on the shop floor don't require repeated login.
85. As an Owner, I want to manage paired devices, so that access to shared terminals is controlled.

### Settings Hub

86. As an Admin, I want to configure organization profile (name, logo, contact info), so that the workspace reflects my business.
87. As an Admin, I want to manage payment methods, so that customers have up-to-date transfer instructions.
88. As an Admin, I want to manage workflow stages from settings, so that production configuration is centralized.
89. As an Admin, I want to manage addons from settings, so that product extras are configured in one place.

### Customer Portal

90. As a Customer, I want to open a secure order link without login, so that I can review my order quickly.
91. As a Customer, I want to confirm order details and submit custom specifications, so that the business knows the order is ready for review.
92. As a Customer, I want to upload design/artwork files, so that the business has what it needs for custom work.
93. As a Customer, I want to see order totals clearly, so that I understand what I am approving.
94. As a Customer, I want to see payment instructions for manual bank transfer, so that I know how to pay.
95. As a Customer, I want to see order progress with a timeline, so that I know the current status.
96. As a Customer, I want to provide shipping address and courier preference, so that fulfillment is prepared.
97. As a Customer, I want token links to be secure and scoped to one order, so that my order data is protected.
98. As a Customer, I want a WhatsApp or similar contact button, so that I can reach the business directly.

### Notifications

99. As an Owner, I want Telegram bot integration for outbound notifications, so that the team is alerted to important events.
100. As an Owner, I want event toggles (new order, payment received, overdue items, stage moves, fulfillment complete), so that I control what triggers notifications.
101. As an Owner, I want a test notification feature, so that I can verify the bot is connected.
102. As an Owner, I want daily summary scheduling, so that the team gets a regular digest.
103. As an Owner, I want additional notification channels (Slack, Discord, email), so that the team can use their preferred tool.

### System

104. As the system, I want every business table to carry organization ownership, so that tenant isolation can be enforced consistently.
105. As the system, I want server functions for internal API operations, so that business logic stays behind typed server boundaries.
106. As the system, I want forms to use TanStack Form, so that validation and submission behavior are consistent.
107. As the system, I want URL state to use nuqs, so that filters and search params are predictable.
108. As the system, I want user-facing text to be translatable, so that the product can support English and Indonesian from the beginning.
109. As the system, I want shadcn/ui primitives for interface elements, so that the UI remains consistent and accessible.
110. As the system, I want Sentry integration ready for production, so that runtime errors can be observed.
111. As the system, I want Neon and Drizzle migrations to define the database contract, so that schema changes are reviewable and repeatable.
112. As the system, I want focused tests around deep modules, so that pricing, order lifecycle, permissions, and task spawning stay correct as UI changes.
113. As an Owner, I want Pabriq to feel like a purpose-built MTO platform rather than a generic ERP, so that the product fits my business language and workflows.

---

## Feature Specification

### 1. Authentication & Multi-Tenancy

| Aspect | Detail |
|--------|--------|
| Email/password auth | Better Auth with email/password |
| Organization multi-tenancy | Org-scoped data isolation via `orgId` on all tables |
| Invitation flow | Invite by email → accept → signup/login |
| Onboarding | Org name + logo upload via dropzone |
| Role-based access | Owner, Admin, Member, Operator via Better Auth access control |
| Operator auth | Separate auth with temporary password on first login |
| Device pairing | PIN session for shop floor stations / shared terminals |

**Access Control Statements:**
```
organization: update, delete
member: create, update, delete
invitation: create, cancel
team: create, update, delete
ac: create, read, update, delete
customer: create, read, update, delete
order: create, read, update, delete, approve, cancel
product: create, read, update, delete
invoice: create, read, update, delete, send, void
production: read, update
settings: read, update
```

**Role Permissions:**

| Resource | Owner | Admin | Member | Operator | Customer |
|----------|:-----:|:-----:|:------:|:--------:|:--------:|
| Orders | CRUD | CRUD | CRU | — | R (own) |
| Workflow Config | CRUD | CRUD | R | — | — |
| Tasks | CRUD | CRUD | RU | RU | — |
| Customers | CRUD | CRUD | CR | — | — |
| Products | CRUD | CRUD | R | — | — |
| Invoices | CRUD | CRUD | R | — | R (own) |
| Team Members | CRUD | RU | — | — | — |
| Tenant Settings | CRUD | RU | — | — | — |
| Assets | CRUD | CRUD | R | — | — |
| Devices | CRUD | CR | — | R | — |

---

### 2. Products & Catalog

| Aspect | Detail |
|--------|--------|
| Product CRUD | Name, description, production days, images, base price, min/max qty |
| Product variants | Sizes, materials, colors, configurations per product |
| Pricing breakpoints | Quantity-based price tiers with interpolation or step mode |
| Pricing engine | Calculates unit price, line total; supports manual override |
| Active/inactive toggle | Boolean flag to hide unavailable items |
| Priority flag | Boolean flag for urgent products |
| Product images | Primary image via asset upload |
| Product duplication | Quick copy of existing product |
| Overflow/alternative linking | Link overflow products when primary is unavailable |
| Addons | Optional extras (per_unit, per_order) scoped to all or specific products |
| Repeat-order pricing | Special pricing for returning customers |
| Custom spec fields builder | Dynamic form fields per product (text, number, dropdown, checkbox, date, upload) |

**Database Schema:**
- `products` — orgId, name, description, active, priority, productionNotes, primaryImageAssetId, basePrice, productionDays, minQuantity, maxQuantity, pricingMode
- `pricing_breakpoints` — orgId, productId, minQuantity, unitPrice

---

### 3. Customers

| Aspect | Detail |
|--------|--------|
| Customer CRUD | Name, business name, email, phone, address, notes |
| Search | By name, email, phone |
| Detail view | Customer card with stats and order history |
| Address integration | Shipping address via addresses table |
| Customer photo | Photo asset per customer |
| Credit guard | `allowCredit` flag to control credit-based orders |
| Phone lookup | Find customer by normalized phone number |

---

### 4. Orders

| Aspect | Detail |
|--------|--------|
| Full lifecycle | draft → pending → approved → production → in_delivery → completed / cancelled / rejected |
| Admin-created drafts | Create draft with line items |
| Customer-submitted drafts | Via secure token portal |
| Line items | Product, quantity, unit price, total, notes, deadline, asset link |
| Pricing calculation | Auto-calculated from breakpoints + manual override |
| Order number generation | Sequential per org (ORD-XXXX) |
| Token-based portal access | Secure token scoped to one order, with expiry |
| Approval with dates/terms | Approved at, approved by, promised delivery date |
| Rejection with reason | Rejected at, rejected by, reject reason |
| Status advancement | State machine with validated transitions |
| Fulfillment/shipping | Courier, tracking number, shipped/delivered timestamps |
| Order totals | Computed from line items |
| Search and filter | By status, customer, search term, with URL-backed params |
| Order analytics | Detailed order metrics and trends |
| Duplicate order | Quick "order again" with previous assets linked for repeat customers |

**Database Schema:**
- `orders` — orgId, customerId, status, notes, total, orderNumber, orderToken, validUntil, shippingAddress (JSON), approvedAt/By, rejectedAt/By/rejectReason, courier, trackingNumber, shippedAt, deliveredAt
- `order_line_items` — orgId, orderId, productId, quantity, unitPrice, total, name, notes, assetId, productionDays, deadline
- `customer_tokens` — orgId, orderId, token (unique), expiresAt, scope (JSON: readonly, orderId)

---

### 5. Public Customer Portal

| Aspect | Detail |
|--------|--------|
| Order tracking page | Status timeline and progress checkpoints |
| Draft completion form | Custom specs, file uploads, shipping address, courier |
| Payment section | Bank transfer instructions, payment status, gateway integration |
| Order timeline | Task-based progress events |
| Line item task cards | Per-line-item production status |
| Customer info card | Customer details in portal |
| Shipping address card | Address display and edit |
| Payment alert banner | Prompts for unpaid invoices |
| Portal header | Order number, status badge |
| Progress views | In-progress, pending-review, rejected, completed |
| WhatsApp contact button | Direct contact link |

---

### 6. Invoices & Payments

| Aspect | Detail |
|--------|--------|
| Invoice CRUD | Create, list, detail, update |
| Partial/full invoice | Percentage-based partial invoices (down payment) |
| Payment tracking | Create payment, confirm, reject workflow |
| Payment proof upload | Asset upload for payment receipts |
| Invoice PDF | Generated via @react-pdf/renderer |
| Quotation PDF | Generated via @react-pdf/renderer |
| Invoice number generation | Sequential per org (INV-XXXX) with custom prefix support |
| Payment methods | Bank account details, CRUD, default selection |
| Public invoice access | Via order token portal |
| Invoice balance tracking | Remaining balance per invoice |
| Void invoice | Void unpaid invoices |
| Standalone line items | Charges not tied to order line items |
| Invoice analytics | Revenue trends, aging reports |
| Tax/invoice numbering | Custom prefix/format, tax ID field |
| Multi-currency | Support for multiple currencies |
| Payment gateway | Virtual account, QRIS, e-wallet, retail outlet via Xendit/Midtrans/Doku |

**Database Schema:**
- `invoices` — orgId, invoiceNumber, orderId, customerId, customerName, status, percentage, subtotal, total, dueDate, issuedDate, paymentMethodId, paidAt, paidBy, notes
- `invoice_line_items` — invoiceId, description, quantity, unitPrice, lineType, taxPercent, total
- `payments` — orgId, invoiceId, amount, method, reference, proofAssetId, status, receivedAt, confirmedAt, confirmedBy, rejectedReason
- `payment_methods` — orgId, bankName, accountNumber, holderName, isActive, isDefault

---

### 7. Production Workflow & Kanban Board

| Aspect | Detail |
|--------|--------|
| Configurable stages | Name, color, board, description, approval gates, requirements, order, active toggle, privacy, admin-only |
| Stage requirement builder | File upload, text, number, dropdown, checkbox, date |
| Kanban board | Column-based task view with task cards |
| Task cards | Product, quantity, customer, priority, promised date |
| Stage advancement | Button-based (not drag-and-drop) for shop-floor reliability |
| Approval gates | Per-stage approval flag, approve/reject workflow |
| Task comments | Comment threads on tasks |
| Task detail modal | Full task context with activity history and attachments |
| Auto-archive | Tasks archived when order cancelled; configurable after hours |
| Archived tasks view | Separate page for archived tasks |
| Multi-board support | Separate boards (e.g., pre_production, production) |
| Stage reorder | Drag or button-based reordering |
| Stage toggle | Activate/deactivate stages without deleting |
| Workflow templates | Pre-built stage configurations (standard production, custom job, simple assembly) |
| Stage color | Visual differentiation per stage |
| Stage privacy / admin-only | Restrict stage visibility to certain roles |
| Production scheduling / Gantt | Calendar view, capacity planning per operator/machine |

**Database Schema:**
- `production_stages` — orgId, name, board, color, description, needApproval, requirements (JSON), orderIndex, active, privacy, adminOnly
- `production_tasks` — orgId, orderId, board, stageId, status, taskNumber, lineItemId, priority, context (JSON), assignedTo, archivedAt
- `task_activity` — orgId, taskId, type, fromStageId, toStageId, data (JSON), actorId

---

### 8. Design & Artwork Review

| Aspect | Detail |
|--------|--------|
| Dedicated design review page | Admin page listing orders needing design approval |
| Operator design dashboard | Focused view for design operators |
| File upload to attachments | Asset upload to task attachments |
| Approve artwork | Advances order to production |
| Request revision | With review notes |
| Reassign operator | Operator assignment management |

---

### 9. Assets & Reusable Resources

| Aspect | Detail |
|--------|--------|
| Asset types | Screen, mold, pattern, template, equipment, other |
| Owner types | Customer-owned, company-owned |
| Auto-generated asset numbers | Sequential asset IDs |
| Customer assets panel | View assets per customer in order/customer views |
| Asset link in order form | Link existing assets to order line items |
| Quick-add asset dialog | Inline asset creation |
| Asset upload | State machine with progress tracking |
| Presigned URL uploads | R2/S3 direct upload |
| Asset variants | Multiple sizes/formats per asset |
| Asset deletion | Soft delete with recovery |

**Database Schema:**
- `assets` — orgId, ownerType, ownerId, draftId, usage, assetKind, originalFilename, mimeType, sizeBytes, uploadedByUserId, status, checksumSha256, imageWidth, imageHeight, videoDurationSeconds, deletedAt
- `asset_variants` — assetId, variantKey, storageKey, mimeType, sizeBytes, width, height

---

### 10. Finance & Expenses

| Aspect | Detail |
|--------|--------|
| Expense categories | COGS, operational labor, utilities, operational expenses, capital expenses |
| Finance dashboard | Income vs expense chart |
| Recent transactions table | Latest financial activity |
| CSV export | Export orders, invoices, expenses |
| Dashboard KPI cards | Active orders, revenue, tasks, invoices |
| Revenue chart | Revenue series by configurable period |

---

### 11. Team & Member Management

| Aspect | Detail |
|--------|--------|
| Member list | List team members and pending invitations |
| Invite by email | With role assignment |
| Update member roles | Change roles after invitation |
| Remove members | Protects last owner |
| Cancel invitations | Revoke pending invites |
| Accept invitation page | Dedicated route for invitation acceptance |
| Operator CRUD | Separate operator management with temp password generation |
| Operator login/logout | Dedicated auth flow for operators |

---

### 12. Settings Hub

| Aspect | Detail |
|--------|--------|
| Profile settings | Org name, logo, contact info, address |
| General settings | Organization-level config |
| Payment methods manager | Bank accounts, default selection |
| Production stages config | Stage list, requirement config, templates |
| Members management | Team list, invite, role management |
| Addon manager | Product addon configuration |

---

### 13. Notifications

| Aspect | Detail |
|--------|--------|
| Telegram bot integration | Outbound notifications via Telegram |
| Event toggles | Per-event notification control (new order, payment received, overdue, stage moves, fulfillment complete) |
| Test notification | Verify bot connectivity |
| Daily summary scheduling | Scheduled digest messages |
| Email notifications | Invitation and customer link delivery |
| Additional channels | Slack, Discord |

---

### 14. Integrations

| Aspect | Detail |
|--------|--------|
| R2/S3 presigned URLs | Direct file storage uploads |
| Shipping area lookup | Search by region, get by ID (Biteship) |
| Shipping carrier integration | Automated label generation |
| Payment gateway | Xendit, Midtrans, Doku — virtual account, QRIS, e-wallet, retail outlet |
| Gateway credentials | Encrypted storage for API keys |
| Gateway test connection | Verify gateway connectivity before going live |
| Gateway invoice operations | Create and cancel invoices via gateway API |
| Payment webhooks | Inbound payment callback handler |
| Telegram webhook | Inbound message handling |

---

### 15. Documents

| Aspect | Detail |
|--------|--------|
| Invoice PDF generation | @react-pdf/renderer with invoice template |
| Quotation PDF generation | @react-pdf/renderer with quotation template |
| PDF download API | Authenticated and token-based PDF endpoints |
| Custom invoice templates | Tenant-branded templates |

---

### 16. UI & Infrastructure

| Aspect | Detail |
|--------|--------|
| shadcn/ui primitives | Full component library |
| Sidebar navigation | Role-based item visibility |
| Breadcrumbs | Auto-generated from route context |
| Status badges | Typed status display |
| Confirm dialogs | Reusable confirmation component |
| DataTable | TanStack Table integration |
| Form components | TanStack Form + shadcn Field |
| Header controls | Theme toggle, language toggle |
| Asset upload components | File/image upload with preview |
| Progress components | Custom progress indicators |
| Page shell | Consistent page layout |
| i18n (en + id) | use-intl with message files |
| URL state (nuqs) | Filters, search, pagination |
| TanStack Query | Server state management |
| TanStack Virtual | Long lists and activity streams |

---

## Implementation Decisions

- Build the product around the domain concepts Organization, Owner, Admin, Member, Operator, Customer, Product, Order, Invoice, Workflow Stage, Production Task, Asset, and Customer Token.
- Preserve Better Auth as the authentication, session, organization, membership, invitation, and role foundation.
- Keep the first user journey simple: sign in or sign up, onboard with organization name + logo, then route into the workspace.
- Keep one organization per user for the first product slice, while preserving the underlying multi-tenant schema and org membership model.
- Resolve the current workspace organization from membership in the local/apex flow rather than requiring subdomain navigation during development.
- Keep future production multi-tenancy compatible with organization slugs and org-scoped data, but avoid making local subdomain cookies a blocker for product progress.
- Use Row-Level Security-ready business tables with organization ownership for every domain table.
- Use server functions (`createServerFn`) as the internal API boundary for auth-adjacent and business operations.
- Use TanStack Query for server-backed reads and cache invalidation across workspace surfaces.
- Use TanStack Form with shadcn Field components for onboarding, product forms, order intake, customer token forms, invoice updates, and settings forms.
- Use nuqs for URL-backed search, filters, pagination, and view state.
- Use shadcn/ui primitives and lucide-react icons for all UI composition.
- Use TanStack Table for tabular resource lists such as orders, products, customers, invoices, and members.
- Use TanStack Virtual for long activity streams, long order lists, and production task queues where needed.
- Treat pricing as a deep module with a small interface that calculates line-item pricing, quantity breakpoints, interpolation, overrides, and order totals.
- Treat order lifecycle as a deep module with a small interface that validates transitions across draft, pending, approved, production, in delivery, completed, cancelled, and rejected states.
- Treat workflow/task spawning as a deep module with a small interface that turns approved order line items into production tasks based on configured workflow stages.
- Treat permission checks as a deep module that maps Better Auth roles to domain actions such as approving orders, editing invoices, managing members, and advancing production tasks.
- Treat customer token access as a deep module that validates token scope, expiry, and allowed actions without requiring a customer login.
- Create business schema for customers, products, pricing breakpoints, orders, order line items, customer tokens, invoices, payments, payment methods, workflow stages, production tasks, task activity, activity events, assets, asset variants, addresses, and organization profiles.
- Keep kanban progression button-based instead of drag-and-drop to reduce accidental shop-floor state changes.
- Include design review as part of the production workflow rather than a separate special-case module.
- Keep all user-facing strings routed through the translation system (en + id).
- Use @react-pdf/renderer for document generation (invoices, quotations).
- Use R2/S3 presigned URLs for direct file uploads without server-side buffering.
- Use Biteship for shipping area lookup.

---

## Testing Decisions

- Good tests should assert external behavior and domain outcomes, not implementation details.
- Pricing tests should assert totals, interpolation, quantity breakpoints, overrides, and edge cases such as missing prices or invalid quantities.
- Order lifecycle tests should assert allowed transitions, blocked transitions, role-sensitive transitions, and resulting side effects.
- Workflow/task spawning tests should assert that approved orders create the right production tasks in the right stages with the right order and product context.
- Permission tests should assert that Owner, Admin, Member, and Operator roles can and cannot perform expected domain actions.
- Customer token tests should assert token scope, expiry, order access, and blocked access to unrelated resources.
- Onboarding tests should assert that an authenticated user without an organization sees onboarding, an authenticated user with an organization lands in the workspace, and unauthenticated users are redirected to sign-in.
- Server function tests should assert business outcomes at the API boundary rather than component internals.
- Route tests should assert important redirects and rendered states for sign-in, sign-up, onboarding, and workspace shell.
- Form tests should assert validation messages, disabled submit state, successful submission behavior, and error display for user-visible forms.
- RLS/data isolation tests should assert that org-scoped queries never return another organization's rows.
- UI component tests should focus on accessible behavior, visible labels, and user actions rather than DOM structure.
- Use Vitest, React Testing Library, TanStack Router route guards, server functions, TanStack Form usage, and Biome checks.

---

## Database Schema

### Auth & Organization

| Table | Purpose |
|-------|---------|
| `user` | Auth users |
| `session` | Auth sessions |
| `account` | Auth accounts |
| `verification` | Auth verification tokens |
| `organization` | Tenant organizations |
| `member` | Org membership + roles |
| `invitation` | Pending invitations |
| `organization_profiles` | Org display info (name, logo, contact, address) |

### Business Domain

| Table | Purpose |
|-------|---------|
| `customers` | Customer records |
| `products` | Product catalog |
| `pricing_breakpoints` | Quantity-based price tiers |
| `orders` | Order headers |
| `order_line_items` | Order line items |
| `customer_tokens` | Portal access tokens |
| `payment_methods` | Bank accounts |
| `invoices` | Invoice headers |
| `invoice_line_items` | Invoice line items |
| `payments` | Payment records |

### Production

| Table | Purpose |
|-------|---------|
| `production_stages` | Workflow stages |
| `production_tasks` | Production tasks |
| `task_activity` | Task stage transition history |
| `activity_events` | Org-level audit events |

### Assets & Address

| Table | Purpose |
|-------|---------|
| `assets` | File assets |
| `asset_variants` | Asset derivatives (thumbnails, sizes) |
| `addresses` | Shipping addresses |
| `biteship_areas` | Shipping area lookup |

### Future

| Table | Purpose |
|-------|---------|
| Product variants | Size/material/color variants per product |
| Product addons | Optional extras (per_unit, per_order) |
| Expenses | Cost tracking and categorization |
| Notifications | Event configuration and delivery |
| Devices | Operator device pairing |

---

## Out of Scope (Current Version)

- Multi-organization switching for one user in the first product slice.
- Public marketplace or customer self-service catalog discovery.
- Drag-and-drop kanban interactions (intentionally button-based).
- Mobile native applications.
- Advanced inventory, procurement, accounting, payroll, or generic ERP modules.
- Full CRM automation and marketing campaigns.
- Complex manufacturing resource planning or machine scheduling optimization.
- Production-grade subdomain routing if local/apex workspace routing is sufficient for the first implementation slice.
- White-label / custom domain.
- API keys for customer programmatic access.
- Product bundles / kits.
- Recurring orders / subscriptions.

---

## Further Notes

- All implementation should follow the project constraints: TanStack Form for forms, nuqs for URL params, `createServerFn` for internal APIs, shadcn/ui primitives, no raw HTML primitives when shadcn equivalents exist, no console logs, no unnecessary comments, and full translation coverage.
- This PRD is intentionally product-level. It should be broken into independently grabbable tracer-bullet issues before implementation.
