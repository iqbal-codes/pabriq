import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { PgVector, PostgresStore } from '@mastra/pg'
import { sql } from 'drizzle-orm'
import { db } from '#/db/index'

export const MASTRA_SCHEMA_NAME = 'mastra'

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required for Mastra storage')
  return url
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

function extractTableNames(result: unknown): string[] {
  if (!isRecord(result) || !Array.isArray(result.rows)) return []

  const names: string[] = []
  for (const row of result.rows) {
    if (isRecord(row) && typeof row.table_name === 'string') {
      names.push(row.table_name)
    }
  }
  return names
}

async function listMastraTables(schemaName: string): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = ${schemaName}
      AND table_name LIKE 'mastra\\_%' ESCAPE '\\'
    ORDER BY table_name
  `)
  return extractTableNames(result)
}

export async function ensureMastraSchemaSeparation(): Promise<void> {
  await db.execute(
    sql.raw(
      `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(MASTRA_SCHEMA_NAME)}`,
    ),
  )

  const publicTables = await listMastraTables('public')
  if (publicTables.length === 0) return

  const separatedTables = new Set(await listMastraTables(MASTRA_SCHEMA_NAME))
  for (const tableName of publicTables) {
    if (separatedTables.has(tableName)) continue
    await db.execute(
      sql.raw(
        `ALTER TABLE ${quoteIdentifier('public')}.${quoteIdentifier(tableName)} SET SCHEMA ${quoteIdentifier(MASTRA_SCHEMA_NAME)}`,
      ),
    )
  }
}

export function createMastraVector(): PgVector {
  return new PgVector({
    id: 'pabriq-mastra-vector',
    connectionString: getDatabaseUrl(),
    schemaName: MASTRA_SCHEMA_NAME,
  })
}

export function createMastraEmbedder() {
  return new ModelRouterEmbeddingModel({
    providerId: 'google',
    modelId: 'gemini-embedding-2',
  })
}

export function createMastraStore(): PostgresStore {
  return new PostgresStore({
    id: 'pabriq-mastra-storage',
    connectionString: getDatabaseUrl(),
    schemaName: MASTRA_SCHEMA_NAME,
  })
}

const SUPPORTED_MODEL_PREFIXES = ['openrouter/'] as const

export function getMastraModel(): string {
  const model = process.env.MASTRA_MODEL
  if (!model?.includes('/')) {
    throw new Error(
      'MASTRA_MODEL must be set using provider/model-name format (e.g. openrouter/openai/gpt-4o)',
    )
  }
  if (!SUPPORTED_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix))) {
    throw new Error(
      `MASTRA_MODEL must start with one of: ${SUPPORTED_MODEL_PREFIXES.join(', ')} (got "${model}")`,
    )
  }
  return model
}

export function getInjectionDetectorModel(): string {
  return (
    process.env.INJECTION_DETECTOR_MODEL ??
    'openrouter/nvidia/nemotron-3.5-content-safety:free'
  )
}
