# AI Assistant Tools Expansion

## Problem Statement

The Pabriq AI business assistant currently only supports searching business records and creating order drafts through a propose/confirm flow. Users cannot manage customers, products, or existing draft orders through the assistant. Additionally, the current order creation implementation uses a simplified duplicate function that bypasses critical validation, proper order numbering, and deadline computation.

## Solution

Expand the AI assistant with CRUD tools for customers, products, and draft orders, while fixing the order creation bug to use the canonical order creation pipeline with proper validation, sequential order numbering, and correct portal URL generation.

## User Stories

1. As a business owner, I want to ask the AI to "find customer Acme Corp" so that I can quickly locate customer details without navigating the UI
2. As a business owner, I want to ask the AI to "create a new customer named PT Maju Jaya with email info@maju.co.id" so that I can add customers conversationally
3. As a business owner, I want to ask the AI to "update customer Acme's phone number to 081234567890" so that I can maintain customer data without opening forms
4. As a business owner, I want to ask the AI to "show me all active products" so that I can review my product catalog
5. As a business owner, I want to ask the AI to "create a new product 'Kaos Premium' with base price 50000 and minimum quantity 100" so that I can add products conversationally
6. As a business owner, I want to ask the AI to "update product Kaos Premium price to 55000" so that I can adjust pricing quickly
7. As a business owner, I want to ask the AI to "show me draft orders from this week" so that I can review pending orders
8. As a business owner, I want to ask the AI to "show me order ORD-2026-001 details" so that I can check order status without navigating
9. As a business owner, I want to ask the AI to "add 50 more units to order ORD-2026-001" so that I can modify draft orders conversationally
10. As a business owner, I want to receive portal and admin URLs after creating an order so that I can share the portal link with the customer and open the admin view immediately
11. As a business owner, I want the AI to validate order prerequisites before proposing so that I'm guided to complete setup (business address, production stages) before creating orders
12. As a business owner, I want the AI to warn me if I try to create an order for a customer without an address so that I know the order will need address setup later

## Implementation Decisions

### Bug Fix: Order Creation Pipeline

- **Replace simplified order creation**: `confirmOrderDraft` in the assistant model will call `createDraftOrderFromAction` from `orders/model.ts` instead of the simplified `assistant/create-draft-order.ts`
- **Delete duplicate**: Remove `src/features/assistant/create-draft-order.ts` entirely
- **Add readiness validation**: `proposeOrderDraft` will call `getOrderCreationReadiness` and return `status: 'invalid'` with missing prerequisites if the org lacks business address, production stages, active products, or payment methods
- **Fix order numbering**: Use sequential `generateOrderNumber(orgId)` producing `ORD-2026-001`, `ORD-2026-002`, etc., instead of random `ORD-2026-{random}`
- **Fix portal URL**: Use `buildPortalUrl(orderToken)` from `src/lib/domain-routing.ts` to generate `portal.<domain>/{token}` format instead of the incorrect `/_org/portal/orders/{id}`
- **Fix per-line deadlines**: The canonical `createDraftOrderFromAction` computes per-line deadlines from `product.productionDays` via `addWorkingDays`, ensuring accurate delivery estimates

### New Tool Architecture

- **Single agent pattern**: All 14 tools (5 existing + 9 new) remain on the `business-assistant` agent
- **No activeTools filtering initially**: Expose all tools; add intent-based filtering later if tool selection becomes problematic
- **No toModelOutput initially**: Keep tools simple; add output transformation later if token usage becomes an issue

### Tool File Organization

- **Existing tools**: Keep in `src/mastra/tools/business-tools.ts`
- **New customer tools**: Create `src/mastra/tools/customer-tools.ts` (3 tools)
- **New product tools**: Create `src/mastra/tools/product-tools.ts` (3 tools)
- **New order tools**: Create `src/mastra/tools/order-tools.ts` (3 tools)
- **Agent imports**: Update `business-assistant-agent.ts` to import from all four files

### Tool Design Patterns

- **Discriminated union returns**: All tools return `{ ok: true, ... } | { ok: false, error: string }` matching existing server function patterns
- **Org-scoping**: All tools extract `orgId`, `userId`, `role` from `RequestContext` via `readAssistantToolContext` helper
- **Domain-specific output schemas**: Tools return typed objects (e.g., `Customer`, `Product`, `Order`) instead of generic records with metadata bags
- **Fixed search limits**: Domain-specific search tools return up to 10 results (no pagination parameter)
- **URL responses**: All successful create/update operations return detail URLs for immediate navigation

### Customer Tools

1. **searchCustomerTool**: Search customers by name/email/phone with limit 10
   - Input: `{ query: string }`
   - Output: `{ customers: CustomerRow[] }`
   
2. **createCustomerTool**: Create customer with basic fields (no address)
   - Input: `{ name: string, email?: string, phone?: string, notes?: string, active?: boolean, isWni?: boolean }`
   - Output: `{ ok: true, id: string, url: string } | { ok: false, error: string }`
   - Note: Address creation deferred to UI; AI creates customer without address
   
3. **updateCustomerTool**: Update existing customer
   - Input: `{ id: string, name?: string, email?: string, phone?: string, notes?: string, active?: boolean }`
   - Output: `{ ok: true, id: string, url: string } | { ok: false, error: string }`

### Product Tools

1. **searchProductTool**: Search products by name/category with limit 10
   - Input: `{ query: string, activeOnly?: boolean }`
   - Output: `{ products: ProductRow[] }`
   
2. **createProductTool**: Create product with basic fields (no breakpoints/addons)
   - Input: `{ name: string, description?: string, category?: string, basePrice: number, minQuantity: number, pricingMode: string, productionDays: number, maxProductionQuantity?: number, repeatOrderMinQuantity?: number }`
   - Output: `{ ok: true, id: string, url: string } | { ok: false, error: string }`
   - Note: Breakpoints and addons managed via UI; AI creates product with base pricing only
   
3. **updateProductTool**: Update existing product
   - Input: `{ id: string, name?: string, description?: string, basePrice?: number, minQuantity?: number, productionDays?: number, active?: boolean }`
   - Output: `{ ok: true, id: string, url: string } | { ok: false, error: string }`

### Order Tools

1. **searchOrderTool**: Search orders by status/customer/date with limit 10
   - Input: `{ query?: string, status?: string, customerId?: string, dateFrom?: string, dateTo?: string }`
   - Output: `{ orders: Array<{ id: string, orderNumber: string, customerName: string | null, status: string, total: number, createdAt: string }> }`
   
2. **getOrderTool**: Get order details with line items
   - Input: `{ orderId: string }`
   - Output: `{ order: Order, lineItems: OrderLineItem[], customerName: string | null } | { ok: false, error: string }`
   
3. **updateDraftOrderTool**: Update draft order (line items, notes, customer, deadline)
   - Input: `{ orderId: string, customerId?: string, notes?: string, lineItems?: LineItemInput[], deadline?: string }`
   - Output: `{ ok: true, orderId: string, adminUrl: string } | { ok: false, error: string }`
   - Note: Only works on orders with `status: 'draft'`; throws error for other statuses

### URL Generation

- **Portal URLs**: Use `buildPortalUrl(orderToken)` which produces `portal.<domain>/{token}` via subdomain rewriting
- **Admin URLs**: Use `/_org/{domain}/{id}` format (e.g., `/_org/customers/uuid`, `/_org/orders/uuid`)
- **Base URL**: Derive from `process.env.NEXT_PUBLIC_APP_URL` or request origin

### Agent Instruction Updates

- Add documentation for new customer CRUD capabilities
- Add documentation for new product CRUD capabilities  
- Add documentation for new order browse/update capabilities
- Clarify that order status transitions (approve, reject, advance status) remain UI-only
- Clarify that customer address and product breakpoints/addons are UI-managed

## Testing Decisions

### Unit Tests

- **Tool execution tests**: Each new tool should have tests verifying:
  - Successful create returns `{ ok: true, id, url }` with correct URL format
  - Failed create returns `{ ok: false, error }` with meaningful error message
  - Org-scoping enforced (cannot access another org's data)
  - Search respects limit parameter
  
- **Bug fix tests**: Verify `createDraftOrderFromAction` from `orders/model.ts`:
  - Sequential order numbering (`ORD-2026-001`, `ORD-2026-002`)
  - Per-line deadline computation from `product.productionDays`
  - Portal URL format matches `buildPortalUrl(orderToken)` output
  - Readiness check returns missing prerequisites

### Integration Tests

- **End-to-end order flow**: Test propose → confirm flow with the new canonical order creation:
  - AI proposes order with product hints
  - User confirms
  - Order created with correct numbering, deadlines, and URLs
  
- **Cross-domain search**: Verify search tools return correct domain-specific objects:
  - Customer search returns `CustomerRow` objects
  - Product search returns `ProductRow` objects
  - Order search returns order summaries

### Test Fixtures

- Use existing test patterns from `src/features/assistant/model.test.ts`
- Mock `RequestContext` with test org/user IDs
- Use in-memory database or transaction rollback for isolation

## Out of Scope

### Image Pricing Extraction
- Parsing pricing breakpoints from uploaded images
- Requires multimodal model support (vision capability)
- Will be a separate tool (`extractPricingFromImageTool`) in a follow-up iteration

### Customer Address Management
- AI creating or updating customer shipping addresses
- Requires Biteship area resolution (area name → areaId)
- Addresses managed via UI only

### Product Breakpoints and Addons
- AI creating or managing pricing tiers and product addons
- Complex structured input (arrays of `{minQuantity, unitPrice}`)
- Breakpoints and addons managed via UI only

### Order Status Transitions
- AI approving, rejecting, or advancing order status
- High-risk mutations reserved for UI with confirmation dialogs
- AI can only update draft orders

### Delete Operations
- AI hard-deleting customers, products, or orders
- Destructive operations reserved for UI with confirmation dialogs
- AI can set `active: false` to deactivate customers/products

### ActiveTools Filtering
- Intent-based tool exposure (detecting "customer" vs "product" vs "order" intent)
- Will be added later if tool selection accuracy becomes problematic

### ToModelOutput Transformation
- Simplified LLM-facing summaries vs rich app-facing outputs
- Will be added later if token usage becomes an issue

## Further Notes

### Mastra HITL Pattern
- The current propose → confirm flow is conversation-level HITL (Human-in-the-Loop)
- Mastra's workflow-level HITL (`suspend()`/`resume()`) is not needed for single-action flows
- Workflow HITL would only benefit multi-stage pipelines (draft → approve → production → invoice)

### Tool Count Considerations
- 14 tools total (5 existing + 9 new) slightly exceeds Mastra's recommended 5-12 range
- Modern LLMs (GPT-4o, Claude 3.5) handle 15-20 tools reasonably well
- Monitor tool selection accuracy; add `activeTools` filtering if needed

### Portal URL Format
- Correct format: `portal.<domain>/{token}` (e.g., `https://portal.example.com/abc123`)
- Generated via `buildPortalUrl(orderToken)` which handles subdomain rewriting
- Previous implementation incorrectly used `/_org/portal/orders/{id}` format

### Readiness Check Timing
- Readiness validated at propose time (not confirm time) for better UX
- AI guides user to complete setup before creating proposal
- Prevents creating orders that get stuck due to missing prerequisites
