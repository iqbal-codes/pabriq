import { relations } from 'drizzle-orm/relations'
import {
  account,
  activityEvents,
  addresses,
  assets,
  assetVariants,
  biteshipAreas,
  customers,
  customerTokens,
  invitation,
  invoiceLineItems,
  invoices,
  member,
  orderLineItems,
  orders,
  organization,
  organizationProfiles,
  paymentMethods,
  payments,
  pricingBreakpoints,
  productionTasks,
  products,
  productVariants,
  session,
  user,
  workflowStages,
} from './schema'

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  invitations: many(invitation),
  members: many(member),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}))

export const organizationRelations = relations(organization, ({ many }) => ({
  invitations: many(invitation),
  members: many(member),
  orders: many(orders),
  customers: many(customers),
  activityEvents: many(activityEvents),
  customerTokens: many(customerTokens),
  invoices: many(invoices),
  invoiceLineItems: many(invoiceLineItems),
  orderLineItems: many(orderLineItems),
  products: many(products),
  productVariants: many(productVariants),
  payments: many(payments),
  paymentMethods: many(paymentMethods),
  pricingBreakpoints: many(pricingBreakpoints),
  productionTasks: many(productionTasks),
  workflowStages: many(workflowStages),
  addresses: many(addresses),
  assets: many(assets),
  organizationProfiles: many(organizationProfiles),
}))

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  organization: one(organization, {
    fields: [orders.orgId],
    references: [organization.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  customerTokens: many(customerTokens),
  invoices: many(invoices),
  orderLineItems: many(orderLineItems),
  productionTasks: many(productionTasks),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
  orders: many(orders),
  invoices: many(invoices),
  organization: one(organization, {
    fields: [customers.orgId],
    references: [organization.id],
  }),
  address: one(addresses, {
    fields: [customers.addressId],
    references: [addresses.id],
  }),
}))

export const addressesRelations = relations(addresses, ({ one, many }) => ({
  customers: many(customers),
  organization: one(organization, {
    fields: [addresses.orgId],
    references: [organization.id],
  }),
  biteshipArea: one(biteshipAreas, {
    fields: [addresses.areaId],
    references: [biteshipAreas.areaId],
  }),
}))

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  organization: one(organization, {
    fields: [activityEvents.orgId],
    references: [organization.id],
  }),
}))

export const customerTokensRelations = relations(customerTokens, ({ one }) => ({
  organization: one(organization, {
    fields: [customerTokens.orgId],
    references: [organization.id],
  }),
  order: one(orders, {
    fields: [customerTokens.orderId],
    references: [orders.id],
  }),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  organization: one(organization, {
    fields: [invoices.orgId],
    references: [organization.id],
  }),
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [invoices.paymentMethodId],
    references: [paymentMethods.id],
  }),
  lineItems: many(invoiceLineItems),
}))

export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoiceId],
      references: [invoices.id],
    }),
  }),
)

export const paymentsRelations = relations(payments, ({ one }) => ({
  organization: one(organization, {
    fields: [payments.orgId],
    references: [organization.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  proofAsset: one(assets, {
    fields: [payments.proofAssetId],
    references: [assets.id],
  }),
}))

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  organization: one(organization, {
    fields: [paymentMethods.orgId],
    references: [organization.id],
  }),
}))

export const orderLineItemsRelations = relations(orderLineItems, ({ one }) => ({
  organization: one(organization, {
    fields: [orderLineItems.orgId],
    references: [organization.id],
  }),
  order: one(orders, {
    fields: [orderLineItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderLineItems.productId],
    references: [products.id],
  }),
  productVariant: one(productVariants, {
    fields: [orderLineItems.variantId],
    references: [productVariants.id],
  }),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
  orderLineItems: many(orderLineItems),
  organization: one(organization, {
    fields: [products.orgId],
    references: [organization.id],
  }),
  productVariants: many(productVariants),
  pricingBreakpoints: many(pricingBreakpoints),
}))

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    orderLineItems: many(orderLineItems),
    organization: one(organization, {
      fields: [productVariants.orgId],
      references: [organization.id],
    }),
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    pricingBreakpoints: many(pricingBreakpoints),
  }),
)

export const pricingBreakpointsRelations = relations(
  pricingBreakpoints,
  ({ one }) => ({
    organization: one(organization, {
      fields: [pricingBreakpoints.orgId],
      references: [organization.id],
    }),
    product: one(products, {
      fields: [pricingBreakpoints.productId],
      references: [products.id],
    }),
    productVariant: one(productVariants, {
      fields: [pricingBreakpoints.variantId],
      references: [productVariants.id],
    }),
  }),
)

export const productionTasksRelations = relations(
  productionTasks,
  ({ one }) => ({
    organization: one(organization, {
      fields: [productionTasks.orgId],
      references: [organization.id],
    }),
    order: one(orders, {
      fields: [productionTasks.orderId],
      references: [orders.id],
    }),
    workflowStage: one(workflowStages, {
      fields: [productionTasks.stageId],
      references: [workflowStages.id],
    }),
  }),
)

export const workflowStagesRelations = relations(
  workflowStages,
  ({ one, many }) => ({
    productionTasks: many(productionTasks),
    organization: one(organization, {
      fields: [workflowStages.orgId],
      references: [organization.id],
    }),
  }),
)

export const biteshipAreasRelations = relations(biteshipAreas, ({ many }) => ({
  addresses: many(addresses),
}))

export const assetsRelations = relations(assets, ({ one, many }) => ({
  organization: one(organization, {
    fields: [assets.orgId],
    references: [organization.id],
  }),
  assetVariants: many(assetVariants),
  organizationProfiles: many(organizationProfiles),
}))

export const assetVariantsRelations = relations(assetVariants, ({ one }) => ({
  asset: one(assets, {
    fields: [assetVariants.assetId],
    references: [assets.id],
  }),
}))

export const organizationProfilesRelations = relations(
  organizationProfiles,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationProfiles.orgId],
      references: [organization.id],
    }),
    asset: one(assets, {
      fields: [organizationProfiles.logoAssetId],
      references: [assets.id],
    }),
    address: one(addresses, {
      fields: [organizationProfiles.addressId],
      references: [addresses.id],
    }),
  }),
)
