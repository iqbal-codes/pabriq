import { createHash, randomUUID } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '#/db/index'
import {
  activityEvents as activityEventsTable,
  shopFloorDevices as devicesTable,
  type ShopFloorDevice,
} from '#/db/schema'

export type RegisterDeviceInput = {
  orgId: string
  name: string
  code?: string
  allowedStageIds?: string[]
  actorId: string
}

export type RotateDeviceInput = {
  id: string
  orgId: string
  actorId: string
}

export type RevokeDeviceInput = {
  id: string
  orgId: string
  actorId: string
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function generateToken(): string {
  return `dev_tok_${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`
}

async function generateNextDeviceCode(orgId: string): Promise<string> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(devicesTable)
    .where(eq(devicesTable.orgId, orgId))

  const num = Number(result?.count ?? 0) + 1
  return `DEV-${String(num).padStart(3, '0')}`
}

export async function registerDevice(
  input: RegisterDeviceInput,
): Promise<{ device: ShopFloorDevice; plainTextToken: string }> {
  const id = randomUUID()
  const plainTextToken = generateToken()
  const secretHash = hashToken(plainTextToken)
  const code = input.code || (await generateNextDeviceCode(input.orgId))
  const now = new Date()

  const [device] = await db
    .insert(devicesTable)
    .values({
      id,
      orgId: input.orgId,
      name: input.name,
      code,
      secretHash,
      status: 'active',
      allowedStageIds: input.allowedStageIds ?? [],
      registeredBy: input.actorId,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  await db.insert(activityEventsTable).values({
    id: randomUUID(),
    orgId: input.orgId,
    actorId: input.actorId,
    targetType: 'shop_floor_device',
    targetId: id,
    action: 'registered',
    details: {
      deviceName: input.name,
      code,
      allowedStageIds: input.allowedStageIds ?? [],
    },
    createdAt: now,
  })

  return { device: device as ShopFloorDevice, plainTextToken }
}

export async function rotateDeviceToken(
  input: RotateDeviceInput,
): Promise<{ device: ShopFloorDevice; plainTextToken: string }> {
  const plainTextToken = generateToken()
  const secretHash = hashToken(plainTextToken)
  const now = new Date()

  const rows = await db
    .update(devicesTable)
    .set({
      secretHash,
      updatedAt: now,
    })
    .where(
      and(
        eq(devicesTable.id, input.id),
        eq(devicesTable.orgId, input.orgId),
        eq(devicesTable.status, 'active'),
      ),
    )
    .returning()

  if (rows.length === 0) {
    throw new Error('Device not found or is revoked')
  }

  const device = rows[0] as ShopFloorDevice

  await db.insert(activityEventsTable).values({
    id: randomUUID(),
    orgId: input.orgId,
    actorId: input.actorId,
    targetType: 'shop_floor_device',
    targetId: input.id,
    action: 'credential_rotated',
    details: {
      deviceName: device.name,
      code: device.code,
    },
    createdAt: now,
  })

  return { device, plainTextToken }
}

export async function revokeDevice(
  input: RevokeDeviceInput,
): Promise<ShopFloorDevice> {
  const now = new Date()

  const rows = await db
    .update(devicesTable)
    .set({
      status: 'revoked',
      revokedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(devicesTable.id, input.id), eq(devicesTable.orgId, input.orgId)),
    )
    .returning()

  if (rows.length === 0) {
    throw new Error('Device not found')
  }

  const device = rows[0] as ShopFloorDevice

  await db.insert(activityEventsTable).values({
    id: randomUUID(),
    orgId: input.orgId,
    actorId: input.actorId,
    targetType: 'shop_floor_device',
    targetId: input.id,
    action: 'revoked',
    details: {
      deviceName: device.name,
      code: device.code,
    },
    createdAt: now,
  })

  return device
}

export async function listDevices(orgId: string): Promise<ShopFloorDevice[]> {
  const rows = await db
    .select()
    .from(devicesTable)
    .where(eq(devicesTable.orgId, orgId))
    .orderBy(desc(devicesTable.createdAt))

  return rows as ShopFloorDevice[]
}

export async function getDevice(
  id: string,
  orgId: string,
): Promise<ShopFloorDevice | null> {
  const rows = await db
    .select()
    .from(devicesTable)
    .where(and(eq(devicesTable.id, id), eq(devicesTable.orgId, orgId)))
    .limit(1)

  if (rows.length === 0) return null
  return rows[0] as ShopFloorDevice
}

export async function verifyDeviceCredential(
  orgId: string,
  plainTextToken: string,
): Promise<ShopFloorDevice | null> {
  if (!plainTextToken) return null
  const secretHash = hashToken(plainTextToken)

  const rows = await db
    .select()
    .from(devicesTable)
    .where(
      and(
        eq(devicesTable.orgId, orgId),
        eq(devicesTable.secretHash, secretHash),
        eq(devicesTable.status, 'active'),
      ),
    )
    .limit(1)

  if (rows.length === 0) return null

  const device = rows[0] as ShopFloorDevice
  const now = new Date()

  await db
    .update(devicesTable)
    .set({ lastActiveAt: now })
    .where(eq(devicesTable.id, device.id))

  return { ...device, lastActiveAt: now }
}
