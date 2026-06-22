# Pabriq — Product Overview

> Multi-tenant SaaS platform for Made-To-Order businesses — custom merchandise, custom printing, custom furniture, custom clothing, and any operation that produces to order.

---

## What Pabriq Does

Pabriq gives MTO businesses a single platform to manage **orders from customer intake through custom production to fulfillment** — with customer self-service, configurable production workflows, team collaboration, and financial visibility.

---

## Target Personas

### Internal Users

- **Owner**
  - Business decision-maker with full platform access
  - Goals: revenue oversight, team management, platform configuration, financial health
  - Pain: disconnected spreadsheets, manual status updates, no visibility into production

- **Admin**
  - Operations lead; manages orders, production workflows, products, customers, team
  - Goals: keep orders flowing, review and approve items, track payments, configure stages
  - Pain: coordinating design approvals, managing production stages, tracking payments

- **Operator**
  - Production worker; advances orders through stages, completes tasks on the shop floor
  - Goals: see assigned work, move items through stages, access customer specs and files
  - Pain: disconnected from customer context, unclear priorities, difficulty accessing design files

### External Users

- **Customer**
  - Places or completes orders via secure token link — no login required
  - Goals: submit custom specifications, upload design files, track production status, pay invoices
  - Pain: chasing staff for updates, unclear pricing, slow revision cycles on designs

---

## Problems Pabriq Solves

1. **Custom order chaos** — MTO orders with custom specs, design files, quantities, and pricing need structured intake instead of WhatsApp threads and email
2. **Production visibility** — Orders must be trackable through configurable stages so the team knows what to work on and when
3. **Design/artwork approval** — Customers submit custom designs or artwork; admins review, request revisions, and approve before production starts
4. **Payment for custom work** — Down payments (DP) and full invoicing for custom orders, with gateway integration for collections
5. **Asset reuse** — Reusable materials, screens, molds, templates, and patterns tied to customers and products reduce setup costs on repeat orders
6. **Financial oversight** — Income from invoices tracked alongside expenses (materials, labor, overhead) for true job costing
7. **Customer self-service** — Customers can submit specs, upload designs, track status, and pay invoices without contacting staff

---

## Feature Inventory

### Authentication & Multi-Tenancy

- Email/password authentication
- Organization-based multi-tenancy with active-organization selection
- Invitation flow (accept invitation, signup, login)
- Tenant onboarding with logo and profile setup
- Role-based access: Owner, Admin, Member, Operator
- Separate operator auth with temporary password on first login
- Device pairing with PIN session (for shop floor stations or shared terminals)

### Orders

- Full order lifecycle: draft → pending → approved → production → in_delivery → completed / cancelled / rejected
- Admin-created orders or customer-submitted drafts via secure token
- Draft order: admin creates skeleton, customer completes (adds specs, uploads designs, provides shipping)
- Order approval with promised date, payment type (partial/full), down payment amount
- Order rejection with reason logging
- Order approval: create down payment invoice and spawn production tasks per line item
- Order fulfillment: add shipping cost, generate final invoice
- Order completion with receipt number
- Price preview with quantity-based pricing tiers
- Order analytics and customer order history
- Public order token access (no login required)

### Public Customer Portal

- Customer-facing order tracking page with status timeline and progress checkpoints
- Payment card with gateway integration (virtual account, QRIS, retail outlet)
- Bank transfer instruction display
- Draft completion form: custom specs, design file uploads, shipping address, courier preference
- Views for: in-progress, pending-review, rejected, completed
- WhatsApp or similar contact button

### Customers

- Customer list with search
- Customer detail card
- Create/update/delete customer
- Customer stats and order history
- Credit guard flag (`allowCredit`)
- Phone number lookup

### Products & Catalog

- Product/service list with cards
- Product form: name, description, production days, images, base price, min/max quantity
- Custom specification fields builder (JSON config — generates dynamic form fields per product)
- Quantity-based pricing tiers (price breaks for higher volumes)
- Repeat-order pricing support
- Product duplication
- Product activation and priority flags
- Overflow/alternative product linking

### Product Addons

- Optional extras attached to products or orders
- Addon types: per_unit, per_order
- Scoped to all products or specific products with custom pricing
- Addon selection in order form

### Invoices & Payments

- Invoice list and detail views
- Partial (down payment) or full invoice
- Mark as paid, partially paid, void, or overdue with payment proof upload
- PDF generation and download
- Invoice analytics
- Payment gateway integration (virtual account, QRIS, e-wallet, retail outlet)
- Standalone invoice line items
- Public invoice access via order token

### Payment Methods & Gateway Config

- Manual bank transfer methods (account number, holder name)
- Gateway-integrated methods via provider API (Xendit, Midtrans, Doku)
- Default payment method selection
- Encrypted credential storage for gateway API keys
- Test connection to payment gateway

### Production Workflow & Kanban Board

- Configurable workflow stages (name, color, order, approval gates, privacy, admin-only)
- Stage requirement builder (file upload, text, number, dropdown, checkbox, date)
- Workflow templates: standard production, custom job, simple assembly
- Task board with column-based task view and button-based stage transitions
- Task cards: product, quantity, customer, priority, promised date
- Stage advancement with approval gates
- Approve/reject task moves
- Task detail modal with attachments and stage history
- Auto-archive tasks when order cancelled
- Order approval spawns tasks per line item in first stage

### Design & Artwork Review

- Admin design/artwork review page listing orders needing approval
- Operator design dashboard
- Design file upload to task attachments
- Approve artwork (advances order to production)
- Request revision with notes
- Reassign operator to order

### Assets & Reusable Resources

- Asset types: screen, mold, pattern, template, equipment, other
- Owner types: customer-owned, company-owned
- Auto-generated asset numbers
- Customer assets panel in order and customer views
- Asset link field in order form
- Quick-add asset dialog
- Repeat order linking previous assets

### Finance & Expenses

- Expense categories: COGS, operational labor, utilities, operational expenses, capital expenses
- Finance dashboard with income vs expense chart
- Recent transactions table
- CSV export

### Team & Operator Management

- List team members and pending invitations
- Invite by email with role assignment
- Update member roles
- Remove members (protects last owner)
- Cancel invitations
- Operator CRUD with temporary password generation
- Operator login, logout, change password

### Settings Hub

- Profile: tenant name, logo, contact info
- Workflow Stages: stage list, requirement config, templates
- Payment Methods: bank accounts, payment methods manager
- Addons: addon manager
- Users: team management

### Notifications

- Telegram bot integration
- Event toggles: new order, payment received, overdue items, stage moves, fulfillment complete, daily summary
- Test notification
- Daily summary scheduling

### Integrations

- Presigned URL generation for direct file storage uploads (R2/S3)
- Payment gateway integration: create/cancel invoices, webhook handler
- Public webhook handler for payment callbacks
- Shipping area lookup (search by region, get by ID)

---

## Key User Journeys

### Journey 1: Customer Places Custom Order

1. Admin creates **draft order** with line items (custom product, quantity, base specs)
2. System generates secure token and sends link to customer
3. Customer opens portal, fills detailed specs, uploads design/artwork files, selects courier
4. Customer submits draft → status becomes `pending`
5. Admin reviews, approves with promised delivery date and payment terms (partial or full)
6. System creates down payment invoice and **production tasks** for each line item
7. Customer pays via bank transfer or payment gateway
8. Admin marks invoice paid → order moves to `production`
9. Tasks flow through workflow stages; operator advances cards
10. Admin marks fulfilled → final invoice generated with shipping cost
11. Customer pays final invoice; admin completes order

### Journey 2: Production Stage Progression

1. Order approval spawns tasks in first workflow stage
2. Operator views kanban board with all active tasks
3. Operator moves task to next stage (e.g., printing → cutting → finishing)
4. If stage has approval gate, task enters `pending` state
5. Admin or supervisor approves or rejects
6. Task reaches final stage, operator marks done
7. Tasks auto-archived if order cancelled

### Journey 3: Design Approval Loop

1. Order with custom artwork appears in design review queue
2. Admin or operator uploads design files to task attachments
3. Admin approves artwork (order continues to production) or requests revision with notes
4. On revision request, customer receives notification and resubmits corrected files
5. Loop continues until artwork is approved

---

## Permission Matrix

| Resource          | Owner | Admin | Member | Operator | Customer |
| ----------------- | :---: | :---: | :----: | :------: | :------: |
| Orders            | CRUD  |  CRU  |  CRU   |    R     | R (own)  |
| Workflow Config   | CRUD  |  CRU  |   R    |    —     |    —     |
| Tasks             | CRUD  |  CRU  |  RU    |    RU    |    —     |
| Customers         | CRUD  |  CRU  |  CR    |    R     |    —     |
| Products/Services | CRUD  |  CRU  |   R    |    R     |    —     |
| Invoices/Billing  | CRUD  |  CRU  |   R    |    —     | R (own)  |
| Team Members      | CRUD  |  RU   |   —    |    —     |    —     |
| Tenant Settings   | CRUD  |  RU   |   —    |    —     |    —     |
| Assets            | CRUD  |  CRU  |   R    |    R     |    —     |
| Devices           | CRUD  |  CRU  |   —    |    R     |    —     |

> Customers access via token-based public portal, no persistent login. Operators use a separate auth flow with temporary passwords.

---

## Gaps & Opportunities (Roadmap)

### High Priority

- [ ] **Inventory/Stock Management** — no raw material or consumable tracking; assets are reusable but no stock depletion
- [ ] **Bill of Materials** — no cost breakdown per product; pricing tiers exist but no actual cost structure or job costing
- [ ] **Production Scheduling / Gantt** — kanban is stage-based, no calendar view or capacity planning per operator/machine
- [ ] **Customer Portal Login** — magic link tokens work but no persistent customer accounts with order history
- [ ] **Automated Reminders** — no scheduled notifications for overdue invoices or approaching delivery dates
- [ ] **Role Permissions Granularity** — admin vs operator permissions are coarse; field-level or action-level RBAC not implemented

### Medium Priority

- [ ] **Mobile App / PWA** — no mobile companion app for operators on the shop floor
- [ ] **Batch Work Order Print** — work order batch printing not implemented
- [ ] **Webhook for Telegram** — outbound notifications exist, no inbound handling from Telegram
- [ ] **Audit Log / Activity Feed** — no unified activity log across all resources
- [ ] **Duplicate Order** — no quick "order again" with same specs for returning customers
- [ ] **Tax / Invoice Numbering** — no tax ID field or custom invoice number prefix/format
- [ ] **Multi-currency** — platform assumes single currency
- [ ] **Reporting / BI** — basic dashboard stats, no exportable or configurable reports

### Lower Priority

- [ ] **White-label / Custom Domain** — no per-tenant domain or full branding customization beyond logo
- [ ] **API Keys for Customers** — no public API for programmatic order submission from customer systems
- [ ] **Product Bundle / Kit** — no grouping of multiple products into a single SKU
- [ ] **Recurring Orders / Subscriptions** — no subscription or recurring order model for retainer clients
- [ ] **Credit Limit Management** — credit flag exists on customer but no limit enforcement
- [ ] **Additional Notification Channels** — Telegram only; no Slack, Discord, or email integration
- [ ] **Localization beyond Indonesian** — next-intl present but single-locale content
