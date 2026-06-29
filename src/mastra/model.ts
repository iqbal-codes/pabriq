import { PostgresStore } from '@mastra/pg'

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required for Mastra storage')
  return url
}

export function getMastraModel(): string {
  const model = process.env.MASTRA_MODEL
  if (!model?.includes('/')) {
    throw new Error('MASTRA_MODEL must be set using provider/model-name format')
  }
  return model
}

export const mastraStorage = new PostgresStore({
  id: 'pabriq-mastra-storage',
  connectionString: getDatabaseUrl(),
  schemaName: 'mastra',
})
