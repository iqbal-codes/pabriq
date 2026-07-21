import { Mastra } from '@mastra/core'
import { PinoLogger } from '@mastra/loggers'
import { createBusinessAssistantAgent } from '#/mastra/agents/business-assistant-agent'
import { createMastraStore, ensureMastraSchemaSeparation } from '#/mastra/model'
import {
  businessOverviewTool,
  businessSearchTool,
  confirmOrderDraftTool,
  proposeOrderDraftTool,
  resolveOrderDraftTool,
} from '#/mastra/tools/business-tools'

const mastraStorage = createMastraStore()

// Initialize Mastra storage: create all required tables (observational
// memory, scores, workflows, etc.) in the `mastra` schema. Must happen
// before any agent interaction — PostgresStore.init() is only called
// inside startWorkers(), which is not triggered on every code path.
await ensureMastraSchemaSeparation()
await mastraStorage.init()

// Workaround: @mastra/pg's dynamic createRequire("@mastra/core/storage") fails
// in Vite SSR (ESM context), so _omTableSchema is undefined and the
// observational memory table is never auto-created. Create it explicitly.
const omTable = '"mastra"."mastra_observational_memory"'
await mastraStorage.db.none(`
  CREATE TABLE IF NOT EXISTS ${omTable} (
    "id" text NOT NULL PRIMARY KEY,
    "lookupKey" text NOT NULL,
    "scope" text NOT NULL,
    "resourceId" text,
    "threadId" text,
    "activeObservations" text NOT NULL,
    "activeObservationsPendingUpdate" text,
    "originType" text NOT NULL,
    "config" text NOT NULL,
    "generationCount" integer NOT NULL,
    "lastObservedAt" timestamp,
    "lastReflectionAt" timestamp,
    "pendingMessageTokens" integer NOT NULL,
    "totalTokensObserved" integer NOT NULL,
    "observationTokenCount" integer NOT NULL,
    "isObserving" boolean NOT NULL,
    "isReflecting" boolean NOT NULL,
    "observedMessageIds" jsonb,
    "observedTimezone" text,
    "bufferedObservations" text,
    "bufferedObservationTokens" integer,
    "bufferedMessageIds" jsonb,
    "bufferedReflection" text,
    "bufferedReflectionTokens" integer,
    "bufferedReflectionInputTokens" integer,
    "reflectedObservationLineCount" integer,
    "bufferedObservationChunks" jsonb,
    "isBufferingObservation" boolean NOT NULL,
    "isBufferingReflection" boolean NOT NULL,
    "lastBufferedAtTokens" integer NOT NULL,
    "lastBufferedAtTime" timestamp,
    "metadata" jsonb,
    "createdAt" timestamp NOT NULL DEFAULT NOW(),
    "updatedAt" timestamp NOT NULL DEFAULT NOW()
  )
`)
console.log('[mastra] observational memory table ensured')

const businessAssistantAgent = createBusinessAssistantAgent(mastraStorage)

export const mastra = new Mastra({
  agents: { businessAssistantAgent },
  tools: {
    businessSearchTool,
    businessOverviewTool,
    resolveOrderDraftTool,
    proposeOrderDraftTool,
    confirmOrderDraftTool,
  },
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
