import { Mastra } from '@mastra/core'
import { PinoLogger } from '@mastra/loggers'
import { createBusinessAssistantAgent } from '#/mastra/agents/business-assistant-agent'
import { createMastraStore, ensureMastraSchemaSeparation } from '#/mastra/model'
import {
  businessOverviewTool,
  businessSearchTool,
  resolveOrderDraftTool,
} from '#/mastra/tools/business-tools'

await ensureMastraSchemaSeparation()
const mastraStorage = createMastraStore()
const businessAssistantAgent = createBusinessAssistantAgent(mastraStorage)

export const mastra = new Mastra({
  agents: { businessAssistantAgent },
  tools: { businessSearchTool, businessOverviewTool, resolveOrderDraftTool },
  storage: mastraStorage,
  logger: new PinoLogger({
    name: 'Pabriq Mastra',
    level: (process.env.LOG_LEVEL ?? 'info') as
      | 'debug'
      | 'info'
      | 'warn'
      | 'error',
  }),
})
