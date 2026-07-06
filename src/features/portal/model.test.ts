import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '#/db/index'
import {
  addresses,
  assets,
  assetVariants,
  biteshipAreas,
  customers as customersTable,
  invoices,
  orderLineItems,
  orders,
  organization,
  payments,
  productionStages,
  productionTasks,
  products,
  taskActivity,
} from '#/db/schema'
import {
  confirmPortalOrder,
  generateOrderToken,
  getOrderTasksTimeline,
  getOrderTimeline,
  getPortalOrder,
  removePortalAsset,
  savePortalAddress,
  updatePortalLineItem,
} from './model'

const org1Id = '00000000-0000-0000-0000-000000000001'
const customer1Id = '00000000-0000-0000-0000-000000000002'
const product1Id = '00000000-0000-0000-0000-000000000003'
const order1Id = '00000000-0000-0000-0000-000000000004'
const lineItem1Id = '00000000-0000-0000-0000-000000000005'
const asset1Id = '00000000-0000-0000-0000-000000000010'
const guestOrderId = '00000000-0000-0000-0000-000000000011'
const matchedCustomerId = '00000000-0000-0000-0000-000000000012'
const createdCustomerId = '00000000-0000-0000-0000-000000000013'

beforeEach(async () => {
  await db.execute(sql`TRUNCATE organization, biteship_areas CASCADE`)

  const now = new Date()
  await db.insert(organization).values([
    {
      id: org1Id,
      name: 'Org 1',
      slug: 'org-1',
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(biteshipAreas).values({
    areaId: 'area-1',
    name: 'Cibis, Palmerah',
    subdistrict: 'Palmerah',
    district: 'Palmerah',
    city: 'Jakarta Barat',
    province: 'DKI Jakarta',
    postalCode: '11480',
  })

  await db.insert(customersTable).values([
    {
      id: customer1Id,
      orgId: org1Id,
      name: 'Customer 1',
      phone: '081234567890',
      active: true,
      isWni: true,
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(products).values([
    {
      id: product1Id,
      orgId: org1Id,
      name: 'Product 1',
      active: true,
      basePrice: 10000,
      productionDays: 1,
      minQuantity: 1,
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(orders).values([
    {
      id: order1Id,
      orgId: org1Id,
      customerId: customer1Id,
      status: 'draft',
      total: 10000,
      orderNumber: 'ORD-2026-001',
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(orderLineItems).values([
    {
      id: lineItem1Id,
      orgId: org1Id,
      orderId: order1Id,
      productId: product1Id,
      quantity: 1,
      unitPrice: 10000,
      total: 10000,
      productionDays: 1,
      deadline: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    },
  ])

  await db.insert(assets).values({
    id: asset1Id,
    orgId: org1Id,
    ownerType: 'order',
    ownerId: lineItem1Id,
    usage: 'attachment',
    assetKind: 'image',
    originalFilename: 'test.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    uploadedByUserId: 'system',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })

  await db.insert(assetVariants).values({
    id: crypto.randomUUID(),
    assetId: asset1Id,
    variantKey: 'original',
    storageKey: 'test/key/original.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
    createdAt: now,
  })
})

describe('generateOrderToken', () => {
  it('generates a token and stores it on the order', async () => {
    const token = await generateOrderToken(order1Id)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)

    const rows = await db
      .select({ orderToken: orders.orderToken })
      .from(orders)
      .where(eq(orders.id, order1Id))
      .limit(1)
    expect(rows[0]?.orderToken).toBe(token)
  })
})

describe('getPortalOrder', () => {
  it('returns notFound for invalid token', async () => {
    const result = await getPortalOrder('invalid-token')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notFound')
  })

  it('returns order for valid token', async () => {
    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.id).toBe(order1Id)
      expect(result.order.status).toBe('draft')
      expect(result.order.orderNumber).toBe('ORD-2026-001')
    }
  })

  it('returns customer name and phone', async () => {
    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.customerName).toBe('Customer 1')
      expect(result.order.customerPhone).toBe('081234567890')
    }
  })

  it('returns line items with product name', async () => {
    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.lineItems.length).toBe(1)
      expect(result.order.lineItems[0].productName).toBe('Product 1')
      expect(result.order.lineItems[0].quantity).toBe(1)
    }
  })

  it('returns line items with assetIds', async () => {
    await db
      .update(orderLineItems)
      .set({ assetId: asset1Id })
      .where(eq(orderLineItems.id, lineItem1Id))

    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.lineItems[0].assetIds).toContain(asset1Id)
    }
  })

  it('returns invoices with expected data', async () => {
    await db.insert(invoices).values({
      id: '00000000-0000-0000-0000-000000000014',
      orgId: org1Id,
      invoiceNumber: 'INV-2026-001',
      orderId: order1Id,
      customerId: customer1Id,
      customerName: 'Customer 1',
      status: 'unpaid',
      percentage: 100,
      subtotal: 10000,
      total: 10000,
      dueDate: '2026-08-01',
      issuedDate: '2026-07-01',
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    })
    const token = await generateOrderToken(order1Id)
    const result = await getPortalOrder(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.order.invoices).toBeDefined()
      expect(result.order.invoices.length).toBe(1)
      expect(result.order.invoices[0].invoiceNumber).toBe('INV-2026-001')
      expect(result.order.invoices[0].total).toBe(10000)
      expect(result.order.invoices[0].status).toBe('unpaid')
    }
  })
})

describe('confirmPortalOrder', () => {
  it('transitions draft order to pending', async () => {
    const token = await generateOrderToken(order1Id)
    await getPortalOrder(token)
    const result = await confirmPortalOrder({ orderId: order1Id })
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, order1Id))
      .limit(1)
    expect(rows[0]?.status).toBe('pending')
  })

  it('returns notFound for unknown order', async () => {
    const result = await confirmPortalOrder({ orderId: 'unknown-id' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notFound')
  })

  it('returns notDraft for non-draft order', async () => {
    await db
      .update(orders)
      .set({ status: 'pending' })
      .where(eq(orders.id, order1Id))
    const result = await confirmPortalOrder({ orderId: order1Id })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notDraft')
  })

  it('matches an existing customer by phone and updates their name', async () => {
    const now = new Date()

    await db.insert(orders).values({
      id: guestOrderId,
      orgId: org1Id,
      customerId: null,
      status: 'draft',
      total: 0,
      orderNumber: 'ORD-2026-002',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: matchedCustomerId,
      orgId: org1Id,
      name: 'Existing Guest',
      phone: '082233445566',
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    const result = await confirmPortalOrder({
      orderId: guestOrderId,
      guestName: 'Portal Guest',
      guestPhone: '0822-3344-5566',
    })

    expect(result.ok).toBe(true)

    const orderRows = await db
      .select({ customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, guestOrderId))
      .limit(1)
    expect(orderRows[0]?.customerId).toBe(matchedCustomerId)

    const customerRows = await db
      .select({ name: customersTable.name })
      .from(customersTable)
      .where(eq(customersTable.id, matchedCustomerId))
      .limit(1)
    expect(customerRows[0]?.name).toBe('Portal Guest')
  })

  it('backfills an empty customer name from the portal input', async () => {
    const now = new Date()

    await db.insert(orders).values({
      id: '00000000-0000-0000-0000-000000000014',
      orgId: org1Id,
      customerId: null,
      status: 'draft',
      total: 0,
      orderNumber: 'ORD-2026-004',
      createdAt: now,
      updatedAt: now,
    })
    await db.insert(customersTable).values({
      id: '00000000-0000-0000-0000-000000000015',
      orgId: org1Id,
      name: '',
      phone: '081100220033',
      active: true,
      createdAt: now,
      updatedAt: now,
    })

    const result = await confirmPortalOrder({
      orderId: '00000000-0000-0000-0000-000000000014',
      guestName: 'Filled In Name',
      guestPhone: '0811 0022 0033',
    })

    expect(result.ok).toBe(true)

    const customerRows = await db
      .select({ name: customersTable.name })
      .from(customersTable)
      .where(eq(customersTable.phone, '081100220033'))
      .limit(1)
    expect(customerRows[0]?.name).toBe('Filled In Name')
  })

  it('creates a customer when no matching phone exists', async () => {
    const now = new Date()

    await db.insert(orders).values({
      id: createdCustomerId,
      orgId: org1Id,
      customerId: null,
      status: 'draft',
      total: 0,
      orderNumber: 'ORD-2026-003',
      createdAt: now,
      updatedAt: now,
    })

    const result = await confirmPortalOrder({
      orderId: createdCustomerId,
      guestName: 'New Portal Guest',
      guestPhone: '0899 1111 2222',
    })

    expect(result.ok).toBe(true)

    const orderRows = await db
      .select({ customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, createdCustomerId))
      .limit(1)
    expect(orderRows[0]?.customerId).toBeTruthy()

    const customerRows = await db
      .select({ name: customersTable.name, phone: customersTable.phone })
      .from(customersTable)
      .where(eq(customersTable.id, orderRows[0]?.customerId ?? ''))
      .limit(1)
    expect(customerRows[0]?.name).toBe('New Portal Guest')
    expect(customerRows[0]?.phone).toBe('0899 1111 2222')
  })
})

describe('updatePortalLineItem', () => {
  it('updates designName and notes', async () => {
    const result = await updatePortalLineItem(lineItem1Id, {
      designName: 'Custom Name',
      notes: 'Custom notes',
    })
    expect(result.ok).toBe(true)

    const rows = await db
      .select({
        designName: orderLineItems.designName,
        notes: orderLineItems.notes,
      })
      .from(orderLineItems)
      .where(eq(orderLineItems.id, lineItem1Id))
      .limit(1)
    expect(rows[0]?.designName).toBe('Custom Name')
    expect(rows[0]?.notes).toBe('Custom notes')
  })

  it('updates assetId', async () => {
    const result = await updatePortalLineItem(lineItem1Id, {
      assetId: asset1Id,
    })
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ assetId: orderLineItems.assetId })
      .from(orderLineItems)
      .where(eq(orderLineItems.id, lineItem1Id))
      .limit(1)
    expect(rows[0]?.assetId).toBe(asset1Id)
  })

  it('can clear assetId by setting null', async () => {
    await db
      .update(orderLineItems)
      .set({ assetId: asset1Id })
      .where(eq(orderLineItems.id, lineItem1Id))

    const result = await updatePortalLineItem(lineItem1Id, { assetId: null })
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ assetId: orderLineItems.assetId })
      .from(orderLineItems)
      .where(eq(orderLineItems.id, lineItem1Id))
      .limit(1)
    expect(rows[0]?.assetId).toBeNull()
  })

  it('returns notFound for unknown item', async () => {
    const result = await updatePortalLineItem('unknown-id', {
      designName: 'Test',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('notFound')
  })
})

describe('savePortalAddress', () => {
  it('saves address and links to customer and order', async () => {
    const result = await savePortalAddress(order1Id, {
      areaId: 'area-1',
      areaName: 'Cibis, Palmerah',
      streetAddress: 'Jl. Raya Palmerah No. 123',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const addressId = result.addressId
      expect(typeof addressId).toBe('string')

      const customerRows = await db
        .select({ addressId: customersTable.addressId })
        .from(customersTable)
        .where(eq(customersTable.id, customer1Id))
        .limit(1)
      expect(customerRows[0]?.addressId).toBe(addressId)

      const orderRows = await db
        .select({ shippingAddress: orders.shippingAddress })
        .from(orders)
        .where(eq(orders.id, order1Id))
        .limit(1)
      expect(orderRows[0]?.shippingAddress).toBeTruthy()
    }
  })
})

describe('removePortalAsset', () => {
  it('marks a portal asset as deleted', async () => {
    const token = await generateOrderToken(order1Id)

    const result = await removePortalAsset(token, asset1Id)
    expect(result.ok).toBe(true)

    const rows = await db
      .select({ status: assets.status })
      .from(assets)
      .where(eq(assets.id, asset1Id))
      .limit(1)

    expect(rows[0]?.status).toBe('deleted')
  })
})

describe('getPortalCustomerAddress', () => {
  it('returns null when customer has no saved address', async () => {
    const { getPortalCustomerAddress } = await import('./model')
    const result = await getPortalCustomerAddress(customer1Id, org1Id)
    expect(result).toBeNull()
  })

  it('returns saved address for customer', async () => {
    const addressId = '00000000-0000-0000-0000-000000000020'
    await db.insert(addresses).values({
      id: addressId,
      orgId: org1Id,
      areaId: 'area-1',
      areaName: 'Cibis, Palmerah',
      streetAddress: 'Jl. Sudirman No. 456',
      isDefault: true,
    })

    await db
      .update(customersTable)
      .set({ addressId })
      .where(eq(customersTable.id, customer1Id))

    const { getPortalCustomerAddress } = await import('./model')
    const result = await getPortalCustomerAddress(customer1Id, org1Id)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.areaId).toBe('area-1')
      expect(result.streetAddress).toBe('Jl. Sudirman No. 456')
    }
  })
})
describe('getOrderTasksTimeline', () => {
  const stage1Id = '00000000-0000-0000-0000-000000000030'
  const stage2Id = '00000000-0000-0000-0000-000000000031'
  const task1Id = '00000000-0000-0000-0000-000000000040'
  const task2Id = '00000000-0000-0000-0000-000000000041'

  it('returns empty array when order has no tasks', async () => {
    const token = await generateOrderToken(order1Id)
    const result = await getOrderTasksTimeline(token)
    expect(result).toEqual([])
  })

  it('returns created/transition/completed events in chronological order for a single task', async () => {
    await db.insert(productionStages).values({
      id: stage1Id,
      orgId: org1Id,
      name: 'Cutting',
      board: 'pre_production',
      orderIndex: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(productionTasks).values({
      id: task1Id,
      orgId: org1Id,
      orderId: order1Id,
      board: 'pre_production',
      stageId: stage1Id,
      status: 'completed',
      taskNumber: 'T-001',
      lineItemId: lineItem1Id,
      context: {
        productName: 'Product 1',
        customerName: 'Customer 1',
        requirements: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const baseTime = new Date('2026-01-15T08:00:00Z')
    await db.insert(taskActivity).values([
      {
        id: 'act-created-1',
        orgId: org1Id,
        taskId: task1Id,
        type: 'created',
        fromStageId: null,
        toStageId: stage1Id,
        data: {},
        actorId: 'system',
        createdAt: baseTime,
      },
      {
        id: 'act-transition-1',
        orgId: org1Id,
        taskId: task1Id,
        type: 'stage_transition',
        fromStageId: null,
        toStageId: stage1Id,
        data: {},
        actorId: 'system',
        createdAt: new Date(baseTime.getTime() + 60_000),
      },
      {
        id: 'act-completed-1',
        orgId: org1Id,
        taskId: task1Id,
        type: 'completed',
        fromStageId: stage1Id,
        toStageId: null,
        data: {},
        actorId: 'system',
        createdAt: new Date(baseTime.getTime() + 120_000),
      },
    ])

    const token = await generateOrderToken(order1Id)
    const events = await getOrderTasksTimeline(token)

    expect(events).toHaveLength(3)
    expect(events[0].type).toBe('created')
    expect(events[0].id).toBe('act-created-1')
    expect(events[1].type).toBe('stage_transition')
    expect(events[1].fromStageName).toBeNull()
    expect(events[1].toStageName).toBe('Cutting')
    expect(events[2].type).toBe('completed')
    expect(events[2].fromStageName).toBe('Cutting')
    expect(events[2].toStageName).toBeNull()

    // Verify chronological order
    for (let i = 1; i < events.length; i++) {
      expect(events[i].createdAt.getTime()).toBeGreaterThanOrEqual(
        events[i - 1].createdAt.getTime(),
      )
    }
  })

  it('attaches requirement responses to the matching stage transition', async () => {
    await db.insert(productionStages).values({
      id: stage1Id,
      orgId: org1Id,
      name: 'Printing',
      board: 'pre_production',
      orderIndex: 0,
      active: true,
      requirements: [
        {
          id: 'req-design',
          label: 'Design File',
          type: 'upload',
          required: false,
        },
        { id: 'req-color', label: 'Color Code', type: 'text', required: false },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(productionTasks).values({
      id: task1Id,
      orgId: org1Id,
      orderId: order1Id,
      board: 'pre_production',
      stageId: stage1Id,
      status: 'in_progress',
      taskNumber: 'T-002',
      lineItemId: lineItem1Id,
      context: {
        productName: 'Product 1',
        customerName: 'Customer 1',
        requirements: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(taskActivity).values([
      {
        id: 'act-created-2',
        orgId: org1Id,
        taskId: task1Id,
        type: 'created',
        fromStageId: null,
        toStageId: stage1Id,
        data: {},
        actorId: 'system',
        createdAt: new Date('2026-01-15T08:00:00Z'),
      },
      {
        id: 'act-transition-2',
        orgId: org1Id,
        taskId: task1Id,
        type: 'stage_transition',
        fromStageId: null,
        toStageId: stage1Id,
        data: {
          responses: {
            'req-design': { assetIds: ['asset-abc'] },
            'req-color': { value: '#FF0000' },
          },
        },
        actorId: 'system',
        createdAt: new Date('2026-01-15T08:01:00Z'),
      },
    ])

    const token = await generateOrderToken(order1Id)
    const events = await getOrderTasksTimeline(token)

    const transitionEvent = events.find((e) => e.type === 'stage_transition')
    expect(transitionEvent).toBeDefined()
    expect(transitionEvent!.requirementResponses).toHaveLength(1)
    expect(transitionEvent!.requirementResponses![0].stageName).toBe('Printing')
    expect(transitionEvent!.requirementResponses![0].responses).toHaveLength(2)
    expect(
      transitionEvent!.requirementResponses![0].responses[0].requirementName,
    ).toBe('Design File')
    expect(
      transitionEvent!.requirementResponses![0].responses[0].assetIds,
    ).toEqual(['asset-abc'])
    expect(
      transitionEvent!.requirementResponses![0].responses[1].requirementName,
    ).toBe('Color Code')
    expect(transitionEvent!.requirementResponses![0].responses[1].value).toBe(
      '#FF0000',
    )
  })

  it('includes board transition events when activity rows exist', async () => {
    await db.insert(productionStages).values([
      {
        id: stage1Id,
        orgId: org1Id,
        name: 'Pre-Production',
        board: 'pre_production',
        orderIndex: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: stage2Id,
        orgId: org1Id,
        name: 'Production',
        board: 'production',
        orderIndex: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    await db.insert(productionTasks).values({
      id: task1Id,
      orgId: org1Id,
      orderId: order1Id,
      board: 'pre_production',
      stageId: stage2Id,
      status: 'in_progress',
      taskNumber: 'T-003',
      lineItemId: lineItem1Id,
      context: {
        productName: 'Widget',
        customerName: 'Customer 1',
        requirements: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(taskActivity).values([
      {
        id: 'act-created-3',
        orgId: org1Id,
        taskId: task1Id,
        type: 'created',
        fromStageId: null,
        toStageId: stage1Id,
        data: {},
        actorId: 'system',
        createdAt: new Date('2026-01-15T09:00:00Z'),
      },
      {
        id: 'act-transition-board',
        orgId: org1Id,
        taskId: task1Id,
        type: 'stage_transition',
        fromStageId: stage1Id,
        toStageId: stage2Id,
        data: {},
        actorId: 'system',
        createdAt: new Date('2026-01-15T09:30:00Z'),
      },
    ])

    const token = await generateOrderToken(order1Id)
    const events = await getOrderTasksTimeline(token)

    const transitionEvent = events.find((e) => e.type === 'stage_transition')
    expect(transitionEvent).toBeDefined()
    expect(transitionEvent!.fromStageName).toBe('Pre-Production')
    expect(transitionEvent!.toStageName).toBe('Production')
    expect(transitionEvent!.id).toBe('act-transition-board')
  })

  it('sorts multi-task timelines by event date', async () => {
    await db.insert(productionStages).values({
      id: stage1Id,
      orgId: org1Id,
      name: 'Cutting',
      board: 'pre_production',
      orderIndex: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(productionTasks).values([
      {
        id: task1Id,
        orgId: org1Id,
        orderId: order1Id,
        board: 'pre_production',
        stageId: stage1Id,
        status: 'completed',
        taskNumber: 'T-010',
        lineItemId: lineItem1Id,
        context: {
          productName: 'Product A',
          customerName: 'Customer 1',
          requirements: null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: task2Id,
        orgId: org1Id,
        orderId: order1Id,
        board: 'pre_production',
        stageId: stage1Id,
        status: 'in_progress',
        taskNumber: 'T-011',
        lineItemId: lineItem1Id,
        context: {
          productName: 'Product B',
          customerName: 'Customer 1',
          requirements: null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    // Task 2 created earlier than Task 1 completed — test cross-task sorting
    await db.insert(taskActivity).values([
      {
        id: 'act-t2-created',
        orgId: org1Id,
        taskId: task2Id,
        type: 'created',
        fromStageId: null,
        toStageId: stage1Id,
        data: {},
        actorId: 'system',
        createdAt: new Date('2026-01-15T10:00:00Z'),
      },
      {
        id: 'act-t1-created',
        orgId: org1Id,
        taskId: task1Id,
        type: 'created',
        fromStageId: null,
        toStageId: stage1Id,
        data: {},
        actorId: 'system',
        createdAt: new Date('2026-01-15T10:30:00Z'),
      },
      {
        id: 'act-t1-completed',
        orgId: org1Id,
        taskId: task1Id,
        type: 'completed',
        fromStageId: stage1Id,
        toStageId: null,
        data: {},
        actorId: 'system',
        createdAt: new Date('2026-01-15T11:00:00Z'),
      },
    ])

    const token = await generateOrderToken(order1Id)
    const events = await getOrderTasksTimeline(token)

    expect(events).toHaveLength(3)
    // Events should be sorted by createdAt across tasks
    expect(events[0].id).toBe('act-t2-created')
    expect(events[0].taskId).toBe(task2Id)
    expect(events[1].id).toBe('act-t1-created')
    expect(events[1].taskId).toBe(task1Id)
    expect(events[2].id).toBe('act-t1-completed')
    expect(events[2].taskId).toBe(task1Id)

    for (let i = 1; i < events.length; i++) {
      expect(events[i].createdAt.getTime()).toBeGreaterThanOrEqual(
        events[i - 1].createdAt.getTime(),
      )
    }
  })
})

describe('getOrderTimeline', () => {
  const timelineOrgId = '00000000-0000-0000-0000-000000000020'
  const timelineCustomerId = '00000000-0000-0000-0000-000000000021'
  const timelineProductId = '00000000-0000-0000-0000-000000000022'

  it('returns all 11 milestones as completed for a completed order', async () => {
    const completedOrderId = '00000000-0000-0000-0000-000000000023'
    const dpInvoiceId = '00000000-0000-0000-0000-000000000030'
    const finalInvoiceId = '00000000-0000-0000-0000-000000000031'
    const dpPaymentId = '00000000-0000-0000-0000-000000000040'
    const finalPaymentId = '00000000-0000-0000-0000-000000000041'
    const taskId = '00000000-0000-0000-0000-000000000050'
    const stageId = '00000000-0000-0000-0000-000000000060'
    const taskActivityId = '00000000-0000-0000-0000-000000000070'

    await db.insert(organization).values({
      id: timelineOrgId,
      name: 'Timeline Org',
      slug: 'timeline-org',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(biteshipAreas).values({
      areaId: 'area-timeline-1',
      name: 'Area Timeline',
      subdistrict: 'Palmerah',
      district: 'Palmerah',
      city: 'Jakarta Barat',
      province: 'DKI Jakarta',
      postalCode: '11480',
    })

    await db.insert(customersTable).values({
      id: timelineCustomerId,
      orgId: timelineOrgId,
      name: 'Timeline Customer',
      phone: '081234567890',
      active: true,
      isWni: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(products).values({
      id: timelineProductId,
      orgId: timelineOrgId,
      name: 'Timeline Product',
      active: true,
      basePrice: 10000,
      productionDays: 1,
      minQuantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(orders).values({
      id: completedOrderId,
      orgId: timelineOrgId,
      customerId: timelineCustomerId,
      status: 'completed',
      total: 100000,
      orderNumber: 'ORD-TL-001',
      approvedAt: new Date('2026-01-02T00:00:00Z'),
      shippedAt: new Date('2026-01-20T00:00:00Z'),
      deliveredAt: new Date('2026-01-25T00:00:00Z'),
      courier: 'JNE',
      trackingNumber: 'TRACK-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-25T00:00:00Z'),
    })

    await db.insert(invoices).values({
      id: dpInvoiceId,
      orgId: timelineOrgId,
      orderId: completedOrderId,
      customerId: timelineCustomerId,
      customerName: 'Timeline Customer',
      invoiceNumber: 'INV-DP-001',
      status: 'partially_paid',
      percentage: 50,
      subtotal: 50000,
      total: 50000,
      dueDate: '2026-01-10',
      paidAt: null,
      createdAt: new Date('2026-01-03T00:00:00Z'),
      updatedAt: new Date('2026-01-03T00:00:00Z'),
    })

    await db.insert(invoices).values({
      id: finalInvoiceId,
      orgId: timelineOrgId,
      orderId: completedOrderId,
      customerId: timelineCustomerId,
      customerName: 'Timeline Customer',
      invoiceNumber: 'INV-FINAL-001',
      status: 'paid',
      percentage: 50,
      subtotal: 50000,
      total: 50000,
      dueDate: '2026-01-25',
      paidAt: new Date('2026-01-21T00:00:00Z'),
      createdAt: new Date('2026-01-18T00:00:00Z'),
      updatedAt: new Date('2026-01-21T00:00:00Z'),
    })

    await db.insert(payments).values({
      id: dpPaymentId,
      orgId: timelineOrgId,
      invoiceId: dpInvoiceId,
      amount: 50000,
      method: 'bank_transfer',
      status: 'confirmed',
      confirmedAt: new Date('2026-01-04T00:00:00Z'),
      createdAt: new Date('2026-01-04T00:00:00Z'),
      updatedAt: new Date('2026-01-04T00:00:00Z'),
    })

    await db.insert(payments).values({
      id: finalPaymentId,
      orgId: timelineOrgId,
      invoiceId: finalInvoiceId,
      amount: 50000,
      method: 'bank_transfer',
      status: 'confirmed',
      confirmedAt: new Date('2026-01-19T00:00:00Z'),
      createdAt: new Date('2026-01-19T00:00:00Z'),
      updatedAt: new Date('2026-01-19T00:00:00Z'),
    })

    await db.insert(productionStages).values({
      id: stageId,
      orgId: timelineOrgId,
      name: 'Cutting',
      board: 'pre_production',
      orderIndex: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(productionTasks).values({
      id: taskId,
      orgId: timelineOrgId,
      orderId: completedOrderId,
      board: 'pre_production',
      stageId,
      status: 'completed',
      taskNumber: 'T-TL-001',
      lineItemId: lineItem1Id,
      context: {
        productName: 'Timeline Product',
        customerName: 'Timeline Customer',
        requirements: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(taskActivity).values({
      id: taskActivityId,
      orgId: timelineOrgId,
      taskId,
      type: 'board_transition',
      fromStageId: null,
      toStageId: stageId,
      data: {},
      actorId: 'system',
      createdAt: new Date(),
    })

    const token = await generateOrderToken(completedOrderId)
    const events = await getOrderTimeline(token)

    expect(events.map((e) => e.type)).toEqual([
      'draft_created',
      'draft_confirmed',
      'order_approved',
      'dp_invoice_created',
      'dp_payment_confirmed',
      'production_started',
      'final_invoice_created',
      'final_payment_confirmed',
      'production_finished',
      'shipment_confirmed',
      'order_completed',
    ])

    for (const event of events) {
      expect(event.status).toBe('completed')
    }

    expect(events.some((e) => (e.type as string) === 'production_stage')).toBe(false)

    const dpPaymentEvent = events.find(
      (e) => e.type === 'dp_payment_confirmed',
    )
    expect(dpPaymentEvent).toBeDefined()
    expect(dpPaymentEvent?.completedAt).toEqual(
      new Date('2026-01-04T00:00:00.000Z'),
    )

    const finalPaymentEvent = events.find(
      (e) => e.type === 'final_payment_confirmed',
    )
    expect(finalPaymentEvent).toBeDefined()
    expect(finalPaymentEvent?.completedAt).toEqual(
      new Date('2026-01-19T00:00:00.000Z'),
    )
  })

  it('marks dp_payment_confirmed as current for approved order with unpaid DP invoice', async () => {
    const approvedOrderId = '00000000-0000-0000-0000-000000000024'
    const dpInvoiceId = '00000000-0000-0000-0000-000000000032'

    await db.insert(organization).values({
      id: timelineOrgId,
      name: 'Timeline Org',
      slug: 'timeline-org',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(biteshipAreas).values({
      areaId: 'area-timeline-1',
      name: 'Area Timeline',
      subdistrict: 'Palmerah',
      district: 'Palmerah',
      city: 'Jakarta Barat',
      province: 'DKI Jakarta',
      postalCode: '11480',
    })

    await db.insert(customersTable).values({
      id: timelineCustomerId,
      orgId: timelineOrgId,
      name: 'Timeline Customer',
      phone: '081234567890',
      active: true,
      isWni: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(products).values({
      id: timelineProductId,
      orgId: timelineOrgId,
      name: 'Timeline Product',
      active: true,
      basePrice: 10000,
      productionDays: 1,
      minQuantity: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.insert(orders).values({
      id: approvedOrderId,
      orgId: timelineOrgId,
      customerId: timelineCustomerId,
      status: 'approved',
      total: 100000,
      orderNumber: 'ORD-TL-002',
      approvedAt: new Date('2026-01-02T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-02T00:00:00Z'),
    })

    await db.insert(invoices).values({
      id: dpInvoiceId,
      orgId: timelineOrgId,
      orderId: approvedOrderId,
      customerId: timelineCustomerId,
      customerName: 'Timeline Customer',
      invoiceNumber: 'INV-DP-002',
      status: 'unpaid',
      percentage: 50,
      subtotal: 50000,
      total: 50000,
      dueDate: '2026-01-10',
      paidAt: null,
      createdAt: new Date('2026-01-03T00:00:00Z'),
      updatedAt: new Date('2026-01-03T00:00:00Z'),
    })

    const token = await generateOrderToken(approvedOrderId)
    const events = await getOrderTimeline(token)

    const types = events.map((e) => e.type)
    expect(types).toEqual([
      'draft_created',
      'draft_confirmed',
      'order_approved',
      'dp_invoice_created',
      'dp_payment_confirmed',
      'production_started',
      'final_invoice_created',
      'final_payment_confirmed',
      'production_finished',
      'shipment_confirmed',
      'order_completed',
    ])

    const completedTypes = events
      .filter((e) => e.status === 'completed')
      .map((e) => e.type)
    expect(completedTypes).toEqual([
      'draft_created',
      'draft_confirmed',
      'order_approved',
      'dp_invoice_created',
    ])

    const dpPaymentEvent = events.find(
      (e) => e.type === 'dp_payment_confirmed',
    )
    expect(dpPaymentEvent).toBeDefined()
    expect(dpPaymentEvent?.status).toBe('current')

    const upcomingTypes = events
      .filter((e) => e.status === 'upcoming')
      .map((e) => e.type)
    expect(upcomingTypes).toEqual([
      'production_started',
      'final_invoice_created',
      'final_payment_confirmed',
      'production_finished',
      'shipment_confirmed',
      'order_completed',
    ])
  })
})
