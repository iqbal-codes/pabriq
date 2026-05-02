import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { pgTable, text } from 'drizzle-orm/pg-core'

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  logoAssetId: text('logo_asset_id').references((): AnyPgColumn => assets.id),
})

export const assets = pgTable('assets', {
  id: text('id').primaryKey(),
  orgId: text('org_id').references(() => organization.id),
})
