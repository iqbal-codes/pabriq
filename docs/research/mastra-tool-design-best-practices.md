# Research: Mastra Tool Design Best Practices for Pabriq Business Assistant

This document outlines the architectural research, best practices, and implementation guidelines for designing tools in the Mastra framework, specifically tailored for the Pabriq ERP business assistant. 

---

## 1. Tool Output Schema Patterns

### Context & Requirements
Mastra tools enforce structured inputs and outputs using Standard JSON Schema V1 via Zod, Valibot, or ArkType. For agents (LLMs) to use these tools effectively, output schemas must be descriptive, predictable, and optimized for model consumption.

### Recommended Patterns

1. **Strict Zod Output Schemas**:
   Always define concrete Zod schemas for the `outputSchema` property. Avoid returning unconstrained shapes (`z.any()` or `z.record(z.any())`) unless implementing a catch-all utility tool.
2. **Decompose Application Data vs. Model Data**:
   Mastra provides two powerful tools to decouple what the application receives from what the model receives:
   - **`toModelOutput`**: Transforms rich internal data returned by the tool's execution (e.g. database model keys, raw metadata, URLs) into a simplified shape (like text summaries or multimodal parts) for the model context. The application still gets the full raw execution result.
   - **`transform`**: Allows target-aware payload reduction (display vs. transcript targets) before tool execution payloads are streamed or rendered.

### Code Example: `toModelOutput` Pattern
*Source: `node_modules/@mastra/core/dist/docs/references/reference-tools-create-tool.md`*

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

export const productDetailTool = createTool({
  id: 'get-product-details',
  description: 'Get product information for a given product ID',
  inputSchema: z.object({
    productId: z.string(),
  }),
  outputSchema: z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    price: z.number(),
    description: z.string(),
    stockCount: z.number(),
    internalSupplierNote: z.string(),
  }),
  execute: async ({ productId }) => {
    // Returns full, rich domain object to the application
    return await fetchProductFromDb(productId);
  },
  // The LLM only receives a concise summary to save tokens and prevent distraction
  toModelOutput: (output) => {
    return {
      type: 'text',
      value: `Product: ${output.name} (${output.sku}) - Price: $${output.price}. Status: ${output.stockCount > 0 ? 'In Stock' : 'Out of Stock'}.`
    };
  }
})
```

---

## 2. Tool Count Guidelines Per Agent

### Context & Tradeoffs
LLMs evaluate tool descriptions and input schemas in their system prompt. Increasing the tool count leads to:
1. **Context Window Bloat**: More tools = more tokens in the prompt, increasing latency and cost.
2. **Tool Selection Fatigue / Distraction**: LLMs have decreased accuracy in selecting the correct tool as the pool of tools grows (typically degrading when exceeding 15 tools).
3. **Execution Limits**: Dynamic execution checks like `checks.maxToolCalls(5)` (seen in `reference-workflows-workflow-state-reader.md`) guard against infinite tool loop cycles.

### Architectural Best Practices

*   **Optimal Range**: **5 to 12 tools per agent** is the recommended sweet spot for maximum reliability and low latency.
*   **Mitigation 1: Active Tools Filtering (`activeTools`)**:
    Dynamically restrict tool availability depending on the routing state or UI context.
    ```typescript
    // Source: node_modules/@mastra/core/dist/docs/references/reference-tools-create-tool.md
    const result = await agent.stream(messages, {
      activeTools: ['business-search', 'resolve-order-draft'], // Limits toolset for this execution
    })
    ```
*   **Mitigation 2: Specialized Sub-Agents**:
    Instead of one generic "Enterprise Agent" containing 30 tools, split them into domains:
    - `BillingAgent` (Invoices, payments, pricing engine)
    - `InventoryAgent` (Products, stock levels)
    - `ProductionAgent` (Task boards, stages)
    A router agent can delegate requests to these sub-agents.

---

## 3. Domain-Specific Objects vs. Generic Records

### Context & Requirements
When a tool returns data, it can either map directly to a database schema/domain model (domain-specific) or return a generic structure (e.g. `{ key: string, value: any }`).

### Best Practices

*   **Prefer Domain-Specific Objects**:
    In transaction-heavy ERPs like Pabriq, tools should return domain-specific schemas (`ResolvedLineItem`, `OrderDraftResolution`). This allows the LLM to understand distinct domain relations and lets the frontend render type-safe components.
*   **Use Generic Records for Cross-Domain Search**:
    For general search utilities, map results to a unified interface with constrained metadata.

### Pabriq Implementation Comparison

#### A. Domain-Specific (Preferred)
*Source: `src/mastra/tools/business-tools.ts` (`resolveOrderDraftTool`)*

```typescript
export const resolveOrderDraftTool = createTool({
  id: 'resolve-order-draft',
  description: 'Resolve free-form product hints and quantities into priced line items for a draft order...',
  inputSchema: z.object({
    candidates: z.array(z.object({
      productHint: z.string(),
      quantity: z.number().int().positive(),
    })),
    customerHint: z.string().optional(),
  }),
  outputSchema: z.object({
    status: z.enum(['resolved', 'ambiguous', 'invalid']),
    lineItems: z.array(z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
      minQuantity: z.number(),
    })).optional(),
    total: z.number(),
  }),
  // ...
})
```

#### B. Generic Record (Utility Exception)
*Source: `src/mastra/tools/business-tools.ts` (`businessSearchTool`)*

```typescript
export const businessSearchTool = createTool({
  id: 'business-search',
  description: 'Search Pabriq business records...',
  outputSchema: z.object({
    records: z.array(z.object({
      domain: z.enum(assistantDomains),
      id: z.string(),
      title: z.string(),
      subtitle: z.string().nullable(),
      href: z.string().nullable(),
      metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
    })),
    omittedDomains: z.array(z.enum(assistantDomains)),
  }),
  // ...
})
```

---

## 4. Error Handling Patterns

### Context & Requirements
When a tool throws a raw JavaScript exception inside `execute`, the LLM agent's generation stream fails completely, causing poor user experience. 

### Recommended Patterns

1. **Status Enum Fields for Expected/Business Failures**:
   For errors that the user can resolve (e.g. invalid coupon, ambiguous product name, product out of stock), return a status enum field (`ambiguous`, `invalid`, `not_found`) inside a valid output schema payload. The LLM can read this status and ask the user for clarifying inputs.
2. **Context Schema Failures**:
   Use `requestContextSchema` to validate execution contexts before the tool is executed. In Mastra, context validation failures return a structured validation error object instead of throwing.
3. **Transient/System Failures**:
   If an infrastructure dependency fails (e.g. Database connection timed out), allow the tool to throw a standard exception. These should be caught at the orchestration layer (the agent stream consumer) to output a generic user-friendly system alert.

### Code Example: Status-Based Error Handing
*Source: `src/mastra/tools/business-tools.ts` (`proposeOrderDraftTool`)*

```typescript
export const proposeOrderDraftTool = createTool({
  id: 'propose-order-draft',
  outputSchema: z.object({
    status: z.enum(['resolved', 'ambiguous', 'invalid']), // Structuring outcome states
    actionId: z.string().optional(),
    missing: z.array(z.object({
      productHint: z.string(),
      quantity: z.number(),
      matchedProductIds: z.array(z.string()),
    })).optional(),
    total: z.number(),
  }),
  execute: async (inputData, context) => {
    try {
      return await proposeOrderDraft({
        orgId: toolContext.orgId,
        candidates: inputData.candidates,
      });
    } catch (err) {
      // Map business/domain exceptions to structured errors
      if (err instanceof AmbiguousProductError) {
        return {
          status: 'ambiguous',
          missing: err.missingProducts,
          total: 0,
        };
      }
      // Re-throw unexpected system exceptions
      throw err;
    }
  }
})
```

---

## 5. Authorization & Org-Scoping (Multi-Tenant Protection)

### Context & Requirements
In multi-tenant systems like Pabriq ERP, tools must NEVER execute actions or read data across organizations. All operations must be strictly scoped to the authenticated user's `orgId`.

### Design Pattern

1. **Enforce Scoped Execution Context**:
   Mastra tools receive execution metadata in the second argument of `execute` via `ToolExecuteContext`. The request-specific data is contained in `context.requestContext`.
2. **Extract with Context Helper**:
   Create a reusable helper (`readAssistantToolContext`) to safely extract and type-assert authentication metadata.
3. **Use `requestContextSchema`**:
   Optionally define a `requestContextSchema` on the tool properties to validate the runtime context before executing.

### Code Example: Request Context Authorization
*Source: `src/mastra/tools/business-tools.ts` and `node_modules/@mastra/core/dist/tools/tool.d.ts`*

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

// Helper to extract and validate multi-tenant scope
function readAssistantToolContext(context: unknown): AssistantToolContext {
  const ctx = context as Record<string, unknown> | undefined
  const requestContext = ctx?.requestContext as { get(key: string): unknown } | undefined

  if (!requestContext) {
    throw new Error('Assistant request context is missing')
  }

  const orgId = requestContext.get('orgId')
  const userId = requestContext.get('userId')
  const role = requestContext.get('role')

  if (
    typeof orgId !== 'string' ||
    typeof userId !== 'string' ||
    (role !== 'owner' && role !== 'admin' && role !== 'member')
  ) {
    throw new Error('Assistant request context is invalid')
  }

  return { orgId, userId, role }
}

export const confirmOrderDraftTool = createTool({
  id: 'confirm-order-draft',
  description: 'Confirm a previously proposed order draft and create the actual order.',
  inputSchema: z.object({
    actionId: z.string().trim().min(1),
  }),
  outputSchema: z.object({
    status: z.enum(['confirmed', 'expired', 'not_found']),
    orderId: z.string().optional(),
  }),
  // Optional pre-execute validation schema
  requestContextSchema: z.object({
    orgId: z.string(),
    userId: z.string(),
  }),
  execute: async (inputData, context) => {
    // 1. Extract context safely (throws early if missing/unauthorized)
    const toolContext = readAssistantToolContext(context)

    // 2. Perform the database operation bound strictly to the orgId
    return confirmOrderDraft({
      actionId: inputData.actionId,
      orgId: toolContext.orgId,
      userId: toolContext.userId,
    })
  },
})
```

---

## Citations & Sources

*   **Mastra Core Documentation**: `node_modules/@mastra/core/dist/docs/references/reference-tools-create-tool.md` (APIs, parameters, hooks, schemas, examples).
*   **Mastra Type Definitions**: `node_modules/@mastra/core/dist/tools/tool.d.ts` and `types.d.ts` (signatures of `ToolExecuteContext`, `createTool`, Standard JSON Schemas).
*   **Pabriq Tools Implementation**: `src/mastra/tools/business-tools.ts` (Search, Overview, Order draft proposal, resolution, and confirmation implementation patterns).
*   **Pabriq Domain Types**: `src/features/assistant/model.ts` (Domain definitions for `AssistantToolContext`, `OrderDraftResolution`, domains list).
*   **Mastra Common Errors Skill Guide**: `.agents/skills/mastra/references/common-errors.md` (tool validation patterns, troubleshooting).
