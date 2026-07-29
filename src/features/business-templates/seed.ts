import { sql } from 'drizzle-orm'
import { db } from '#/db/index'
import { businessTemplates } from '#/db/schema'

export interface TemplateSeedProduct {
  key: string
  name: string
  description?: string
  category?: string
  basePrice: number
  productionDays: number
  minQuantity: number
  maxQuantity?: number
  pricingMode: 'interpolated' | 'flat'
  active: boolean
}

export interface TemplateSeedStage {
  key: string
  name: string
  board: 'pre_production' | 'production' | 'quality' | 'fulfillment'
  description?: string
  needApproval: boolean
  requirements: Array<{
    id: string
    label: string
    type:
      | 'text'
      | 'number'
      | 'select'
      | 'checkbox'
      | 'date'
      | 'measurement'
      | 'file'
      | 'photo'
    required: boolean
  }>
  orderIndex: number
}

export interface TemplateSeedMaterial {
  key: string
  name: string
  unit: string
  estimatedQuantity?: number
  wasteAllowance?: number
}
export interface TemplateSeedDocument {
  key: string
  name: string
  description?: string
  type: 'invoice' | 'quote' | 'delivery_note' | 'production_sheet' | 'other'
}

export interface TemplateSeedConfig {
  products: TemplateSeedProduct[]
  workflowStages: TemplateSeedStage[]
  materials: TemplateSeedMaterial[]
  documents: TemplateSeedDocument[]
  regionalDefaults: {
    timezone: string
    locale: string
    language: string
    currency: string
    moneyPrecision: number
  }
  fulfillmentDefaults: {
    shippingEnabled: boolean
    pickupEnabled: boolean
  }
  pricingConfig: {
    defaultMode: 'interpolated' | 'flat'
    defaultCurrency: string
  }
}

interface DefaultTemplate {
  slug: string
  name: string
  version: number
  description: string
  category: string
  capabilities: Record<string, unknown>
  configSnapshot: TemplateSeedConfig
}

const RUBBER_ACCESSORIES_TEMPLATE: DefaultTemplate = {
  slug: 'rubber-accessories',
  name: 'Rubber Accessories',
  version: 1,
  description:
    'Made-to-order rubber accessories including keychains, wristbands, patches, and molded items. Supports PVC and rubber production workflows.',
  category: 'rubber_accessories',
  capabilities: {
    productTypes: ['keychain', 'wristband', 'patch', 'molded_item', 'pin'],
    maxProducts: 20,
    supportsCustomMolds: true,
    supportsMulticolor: true,
    supports3DMolding: false,
    decorationMethods: ['screen_printing', 'embossing', 'debossing'],
  },
  configSnapshot: {
    products: [
      {
        key: 'rubber_keychain',
        name: 'Rubber Keychain',
        description:
          'Custom PVC/rubber keychain with printed or embossed design',
        category: 'keychain',
        basePrice: 5000,
        productionDays: 3,
        minQuantity: 100,
        maxQuantity: 10000,
        pricingMode: 'interpolated',
        active: true,
      },
      {
        key: 'rubber_wristband',
        name: 'Rubber Wristband',
        description: 'Custom rubber wristband for events or promotions',
        category: 'wristband',
        basePrice: 3000,
        productionDays: 3,
        minQuantity: 100,
        maxQuantity: 20000,
        pricingMode: 'interpolated',
        active: true,
      },
      {
        key: 'rubber_patch',
        name: 'Rubber Patch',
        description: 'Custom rubber patch with 2D or 3D relief',
        category: 'patch',
        basePrice: 8000,
        productionDays: 5,
        minQuantity: 50,
        maxQuantity: 5000,
        pricingMode: 'interpolated',
        active: true,
      },
    ],
    workflowStages: [
      {
        key: 'design_review',
        name: 'Design Review',
        board: 'pre_production',
        description: 'Review customer artwork and specifications',
        needApproval: true,
        requirements: [
          {
            id: 'design_file',
            label: 'Design File',
            type: 'file',
            required: true,
          },
          {
            id: 'color_spec',
            label: 'Color Specification',
            type: 'text',
            required: true,
          },
        ],
        orderIndex: 0,
      },
      {
        key: 'mold_preparation',
        name: 'Mold Preparation',
        board: 'pre_production',
        description: 'Prepare or verify mold for production',
        needApproval: false,
        requirements: [
          {
            id: 'mold_check',
            label: 'Mold Condition Check',
            type: 'checkbox',
            required: true,
          },
        ],
        orderIndex: 1,
      },
      {
        key: 'production',
        name: 'Production',
        board: 'production',
        description: 'Main production run',
        needApproval: false,
        requirements: [
          {
            id: 'batch_quantity',
            label: 'Batch Quantity',
            type: 'number',
            required: true,
          },
        ],
        orderIndex: 2,
      },
      {
        key: 'quality_check',
        name: 'Quality Check',
        board: 'quality',
        description: 'Quality inspection and defect sorting',
        needApproval: true,
        requirements: [
          {
            id: 'qc_pass',
            label: 'QC Pass',
            type: 'checkbox',
            required: true,
          },
          {
            id: 'defect_count',
            label: 'Defect Count',
            type: 'number',
            required: false,
          },
          {
            id: 'qc_photo',
            label: 'QC Photo',
            type: 'photo',
            required: false,
          },
        ],
        orderIndex: 3,
      },
      {
        key: 'packaging',
        name: 'Packaging',
        board: 'fulfillment',
        description: 'Package and prepare for delivery',
        needApproval: false,
        requirements: [
          {
            id: 'package_count',
            label: 'Package Count',
            type: 'number',
            required: true,
          },
        ],
        orderIndex: 4,
      },
    ],
    materials: [
      {
        key: 'pvc_resin',
        name: 'PVC Resin',
        unit: 'kg',
        estimatedQuantity: 1,
        wasteAllowance: 0.05,
      },
      {
        key: 'pigment',
        name: 'Color Pigment',
        unit: 'g',
        estimatedQuantity: 50,
        wasteAllowance: 0.03,
      },
      {
        key: 'keyring_attachment',
        name: 'Keyring Attachment',
        unit: 'pcs',
        estimatedQuantity: 1,
      },
    ],
    documents: [],
    regionalDefaults: {
      timezone: 'Asia/Jakarta',
      locale: 'id-ID',
      language: 'id',
      currency: 'IDR',
      moneyPrecision: 0,
    },
    fulfillmentDefaults: {
      shippingEnabled: true,
      pickupEnabled: true,
    },
    pricingConfig: {
      defaultMode: 'interpolated',
      defaultCurrency: 'IDR',
    },
  },
}

const APPAREL_DECORATION_TEMPLATE: DefaultTemplate = {
  slug: 'apparel-decoration',
  name: 'Apparel Decoration',
  version: 1,
  description:
    'Decoration services for sourced jerseys and T-shirts including screen printing, embroidery, DTF, and heat transfer. For decoration-only on customer-supplied or sourced garments.',
  category: 'apparel_decoration',
  capabilities: {
    productTypes: ['jersey_decoration', 'tshirt_decoration'],
    maxProducts: 15,
    supportsCustomMolds: false,
    supportsMulticolor: true,
    supports3DMolding: false,
    decorationMethods: [
      'screen_printing',
      'embroidery',
      'dtf',
      'heat_transfer',
      'sublimation',
    ],
    supportsSourcing: true,
  },
  configSnapshot: {
    products: [
      {
        key: 'jersey_screen_print',
        name: 'Jersey Screen Print',
        description:
          'Screen printing decoration on sourced jersey, up to 4 colors',
        category: 'jersey_decoration',
        basePrice: 35000,
        productionDays: 5,
        minQuantity: 12,
        maxQuantity: 1000,
        pricingMode: 'interpolated',
        active: true,
      },
      {
        key: 'jersey_embroidery',
        name: 'Jersey Embroidery',
        description: 'Machine embroidery on jersey',
        category: 'jersey_decoration',
        basePrice: 45000,
        productionDays: 7,
        minQuantity: 12,
        maxQuantity: 500,
        pricingMode: 'interpolated',
        active: true,
      },
      {
        key: 'tshirt_screen_print',
        name: 'T-Shirt Screen Print',
        description: 'Screen printing on sourced T-shirt',
        category: 'tshirt_decoration',
        basePrice: 25000,
        productionDays: 4,
        minQuantity: 24,
        maxQuantity: 2000,
        pricingMode: 'interpolated',
        active: true,
      },
      {
        key: 'tshirt_dtf',
        name: 'T-Shirt DTF Print',
        description: 'Direct-to-film transfer on T-shirt',
        category: 'tshirt_decoration',
        basePrice: 20000,
        productionDays: 3,
        minQuantity: 12,
        maxQuantity: 1000,
        pricingMode: 'interpolated',
        active: true,
      },
    ],
    workflowStages: [
      {
        key: 'artwork_review',
        name: 'Artwork Review',
        board: 'pre_production',
        description: 'Review and prepare customer artwork for production',
        needApproval: true,
        requirements: [
          {
            id: 'artwork_file',
            label: 'Artwork File',
            type: 'file',
            required: true,
          },
          {
            id: 'placement_spec',
            label: 'Placement Specification',
            type: 'text',
            required: true,
          },
          {
            id: 'size_spec',
            label: 'Size Breakdown',
            type: 'text',
            required: true,
          },
        ],
        orderIndex: 0,
      },
      {
        key: 'sample_approval',
        name: 'Sample Approval',
        board: 'pre_production',
        description: 'Produce and approve decoration sample',
        needApproval: true,
        requirements: [
          {
            id: 'sample_photo',
            label: 'Sample Photo',
            type: 'photo',
            required: true,
          },
          {
            id: 'customer_approval',
            label: 'Customer Approval',
            type: 'checkbox',
            required: true,
          },
        ],
        orderIndex: 1,
      },
      {
        key: 'decoration_production',
        name: 'Decoration Production',
        board: 'production',
        description: 'Main decoration run',
        needApproval: false,
        requirements: [
          {
            id: 'batch_quantity',
            label: 'Batch Quantity',
            type: 'number',
            required: true,
          },
        ],
        orderIndex: 2,
      },
      {
        key: 'quality_inspection',
        name: 'Quality Inspection',
        board: 'quality',
        description: 'Inspect decoration quality and consistency',
        needApproval: true,
        requirements: [
          {
            id: 'color_match',
            label: 'Color Match OK',
            type: 'checkbox',
            required: true,
          },
          {
            id: 'placement_check',
            label: 'Placement Check',
            type: 'checkbox',
            required: true,
          },
          {
            id: 'qc_photo',
            label: 'QC Photo',
            type: 'photo',
            required: false,
          },
        ],
        orderIndex: 3,
      },
      {
        key: 'finishing_packing',
        name: 'Finishing & Packing',
        board: 'fulfillment',
        description: 'Final fold, tag, and pack',
        needApproval: false,
        requirements: [
          {
            id: 'package_count',
            label: 'Package Count',
            type: 'number',
            required: true,
          },
        ],
        orderIndex: 4,
      },
    ],
    materials: [
      {
        key: 'plastisol_ink',
        name: 'Plastisol Ink',
        unit: 'ml',
        estimatedQuantity: 30,
        wasteAllowance: 0.1,
      },
      {
        key: 'embroidery_thread',
        name: 'Embroidery Thread',
        unit: 'm',
        estimatedQuantity: 5,
        wasteAllowance: 0.05,
      },
      {
        key: 'dtf_film',
        name: 'DTF Transfer Film',
        unit: 'sheets',
        estimatedQuantity: 1,
        wasteAllowance: 0.02,
      },
      {
        key: 'backing_material',
        name: 'Embroidery Backing',
        unit: 'sheets',
        estimatedQuantity: 1,
      },
    ],
    documents: [],
    regionalDefaults: {
      timezone: 'Asia/Jakarta',
      locale: 'id-ID',
      language: 'id',
      currency: 'IDR',
      moneyPrecision: 0,
    },
    fulfillmentDefaults: {
      shippingEnabled: true,
      pickupEnabled: true,
    },
    pricingConfig: {
      defaultMode: 'interpolated',
      defaultCurrency: 'IDR',
    },
  },
}

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  RUBBER_ACCESSORIES_TEMPLATE,
  APPAREL_DECORATION_TEMPLATE,
]

export async function seedDefaultTemplates(): Promise<void> {
  for (const template of DEFAULT_TEMPLATES) {
    const id = crypto.randomUUID()
    await db
      .insert(businessTemplates)
      .values({
        id,
        slug: template.slug,
        name: template.name,
        version: template.version,
        description: template.description,
        category: template.category,
        status: 'published',
        capabilities: template.capabilities as unknown as Record<
          string,
          unknown
        >,
        configSnapshot: template.configSnapshot as unknown as Record<
          string,
          unknown
        >,
        publishedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [businessTemplates.slug, businessTemplates.version],
        set: {
          name: template.name,
          description: template.description,
          category: template.category,
          capabilities: template.capabilities as unknown as Record<
            string,
            unknown
          >,
          configSnapshot: template.configSnapshot as unknown as Record<
            string,
            unknown
          >,
          updatedAt: sql`now()`,
        },
      })
  }
}
