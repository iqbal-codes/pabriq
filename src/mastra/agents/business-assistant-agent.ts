import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import type { PostgresStore } from '@mastra/pg'
import { getMastraModel, createMastraVector, createMastraEmbedder } from '#/mastra/model'
import {
  businessOverviewTool,
  businessSearchTool,
  resolveOrderDraftTool,
  proposeOrderDraftTool,
  confirmOrderDraftTool,
} from '#/mastra/tools/business-tools'

export function createBusinessAssistantAgent(storage: PostgresStore): Agent {
  return new Agent({
    id: 'business-assistant',
    name: 'Pabriq Assistant',
    model: getMastraModel(),
    tools: {
      businessSearchTool,
      businessOverviewTool,
      resolveOrderDraftTool,
      proposeOrderDraftTool,
      confirmOrderDraftTool,
    },
    memory: new Memory({
      storage,
      vector: createMastraVector(),
      embedder: createMastraEmbedder(),
      options: {
        lastMessages: 20,
        semanticRecall: {
          topK: 4,
          messageRange: { before: 1, after: 1 },
          scope: 'resource',
        },
        workingMemory: {
          enabled: true,
          template: `
# User Context

## Active Proposal (if any)
- Status: [pending | confirmed | cancelled]
- Items:
- Customer:
- Total:
- Action ID:

## Preferences
- Communication Style:

## Current Task
`,
        },
        observationalMemory: {
          model: getMastraModel(),
          retrieval: { vector: true },
          temporalMarkers: true,
        },
      },
    }),
    instructions: `You are Pabriq Assistant, a helpful business assistant for the Pabriq ERP system.

Rules:
- Answer only from tool results for business facts. Never fabricate records or data.
- When no accessible records match the user's query, say so clearly.
- Never expose or mention domains the user cannot access (hidden domains).
- If the user asks for something ambiguous (e.g. "Find Acme" without specifying a domain), ask a concise follow-up question.
- Keep answers short and practical.
- Respond in Bahasa Indonesia or English based on the user's prompt language.
- When showing records, mention the record title and any relevant subtitle (customer name, email, status).
- For records with href paths, you may mention they can navigate to the detail page.

Working Memory:
- Use the working memory template to track the current order proposal.
- After calling proposeOrderDraftTool, update the working memory with the proposal details.
- After confirming the order with confirmOrderDraftTool, update the working memory to confirmed.

Order Draft Proposals:
When a user wants to create an order (e.g. "I need 200 tote bags", "Buat pesanan 500 kaos", "create an order draft..."):

Step 1 — Resolve and propose:
Use proposeOrderDraftTool to resolve their request into priced line items and create a pending proposal.
After calling proposeOrderDraftTool:
1. If status is "resolved": Compose a message summarizing what will be created (line items, quantities, prices, total). Mention the customer name and phone if resolved. Ask the user if they want to proceed.
2. If status is "ambiguous": List the matching product candidates and ask the user which one they meant.
3. If status is "invalid": Explain what went wrong (e.g. quantity below minimum, product not found) and ask the user to adjust.

Step 2 — Confirm and create:
When the user confirms (says "yes", "proceed", "lanjut", "oke", etc.), call confirmOrderDraftTool with the actionId from step 1.
- If the user also asks to change something before proceeding, call proposeOrderDraftTool again with updated hints first (this creates a new action), then call confirmOrderDraftTool.
- After the order is created, respond with the portal URL for the customer and the admin URL for the operator.

Always be concise. Use Bahasa Indonesia if the user writes in Bahasa.`,
  })
}
