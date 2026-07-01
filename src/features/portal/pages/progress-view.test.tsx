import { render, screen } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { describe, expect, it, vi } from 'vitest'
import type { PortalOrder } from '../model'
import { ProgressView } from './progress-view'

vi.mock('../hooks', () => ({
  useOrderTimeline: vi.fn(() => ({ data: [] })),
  usePortalGetInvoiceUploadUrl: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useSubmitPaymentProof: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

const messages = {
  portal: {
    orderSummary: 'Ringkasan Pesanan',
    lineItems: 'Item',
    orderTotal: 'Total',
    completedThanks: 'Terima kasih',
    noStageTransitions: 'Belum ada perpindahan tahap',
    taskTimeline: 'Timeline Tugas',
    notes: 'Catatan',
    attachment: 'Lampiran',
    currentStage: 'Tahap Saat Ini',
    progressOverview: 'Ringkasan cepat',
    progressStatusApprovedHelp:
      'Pesanan Anda sudah disetujui. Penjual sedang menyiapkannya untuk produksi.',
    progressStatusProductionHelp:
      'Pesanan Anda sedang diproduksi. Buka setiap item untuk melihat timeline tahap, catatan, dan lampiran.',
    progressStatusDeliveryHelp:
      'Pesanan Anda sedang dikirim atau disiapkan untuk serah terima.',
    progressStatusCompletedHelp:
      'Pesanan Anda selesai. Hubungi penjual jika masih perlu bantuan.',
    progressStatusFallbackHelp:
      'Pantau detail pesanan dan pembaruan produksi terbaru di sini.',
    nextStep: 'Langkah berikutnya',
    nextStepPayment:
      'Selesaikan invoice yang belum dibayar agar penjual dapat melanjutkan pesanan.',
    nextStepProduction:
      'Pantau kartu item di bawah untuk melihat pembaruan tahap dari tim produksi.',
    nextStepDelivery: 'Tunggu informasi serah terima pengiriman dari penjual.',
    nextStepCompleted: 'Simpan halaman ini sebagai catatan pesanan Anda.',
    estimatedCompletionLabel: 'Estimasi selesai',
    completedOnLabel: 'Selesai pada',
    estimatedCompletionUnavailable: 'Belum ada estimasi selesai',
    activeStages: 'Tahap aktif',
    activeStagesEmpty: 'Belum ada tahap produksi aktif',
    activeStagesMore: '{stages} + {count} lagi',
    productionScope: 'Cakupan produksi',
    productionScopeValue:
      '{items, plural, one {# item} other {# item}} · {quantity, plural, one {# unit} other {# unit}}',
    productionScopeEmpty: 'Belum ada item produksi',
    paymentSummary: 'Pembayaran',
    paymentSummaryNoInvoice: 'Belum ada invoice',
    paymentSummaryUnpaid:
      '{count, plural, one {# invoice belum dibayar} other {# invoice belum dibayar}} · {amount}',
    paymentSummaryAllPaid: 'Semua invoice telah dibayar',
    lineItemsHelp: 'Buka item untuk melihat timeline, catatan, dan lampiran.',
    productionDaysLabel:
      '{days, plural, one {# hari produksi} other {# hari produksi}}',
    chatOnWhatsApp: 'Chat via WhatsApp',
    whatsappOrderMessage: 'Halo, terkait pesanan {order}',
    invoiceDialogTitle: 'Invoice',
    invoiceDialogEmpty: 'Belum ada invoice',
    invoiceShipmentFee: 'Biaya pengiriman',
    invoiceViewAll: 'Lihat semua invoice',
    invoiceSummary: '{count} invoice · {amount}',
    invoiceSummaryUnpaid: '{count} belum dibayar · {amount}',
    progressHeroLabel: 'Status pesanan',
    progressChecklistTitle: 'Yang perlu Anda perhatikan',
    obligationPayTitle: 'Selesaikan invoice yang belum dibayar',
    obligationPayBody: '{count} invoice menunggu bukti pembayaran Anda',
    obligationNextTitle: 'Selanjutnya',
    itemsSectionTitle: 'Item dalam pesanan',
    itemsSectionDescription: 'Setiap item menampilkan timeline, catatan, dan lampiran.',
    itemTaskNumber: 'Tugas',
    itemShowTimeline: 'Lihat timeline',
    itemHideTimeline: 'Sembunyikan timeline',
    itemProductionDaysInline: 'Produksi {days} hari',
    itemDeadlineLabel: 'Deadline {date}',
    itemAttachmentsLabel: 'Lampiran',
    itemNoEvents: 'Belum ada pembaruan tahap',
    shippingAddress: 'Alamat Pengiriman',
    noShippingAddress: 'Belum ada alamat pengiriman',
    customerInfo: 'Informasi Pelanggan',
    quantity: 'Jml',
    itemName: 'Nama Item',
    itemNamePlaceholder: 'Masukkan nama item',
    itemNotes: 'Catatan',
    itemNotesPlaceholder: 'Tambahkan catatan',
    invoiceShowAll: 'Lihat semua ({count})',
    invoiceShowLess: 'Sembunyikan',
    invoicePaidOn: 'Lunas',
    invoiceUnpaidNoDue: 'Belum dibayar',
    invoiceDueLabel: 'Jatuh tempo {date}',
    invoiceOverdueOn: 'Terlambat {date}',
    invoiceBankCopy: 'Salin nomor rekening',
    invoiceBankCopied: 'Tersalin',
    invoiceProofPending: 'Menunggu konfirmasi',
    invoicePaymentInstructions: 'Instruksi',
    invoicesSectionTitle: 'Invoice dan pembayaran',
    invoicesSectionDescription: 'Unduh invoice dan unggah bukti pembayaran di sini.',
    stageTrackerLabel: 'Tahap produksi',
    stagesUnknown: 'Belum ada pembaruan tahap',
  },
  status: {
    production: 'Dalam Produksi',
    paid: 'Lunas',
    unpaid: 'Belum Dibayar',
  },
  invoices: {
    title: 'Invoice',
    overdue: 'Terlambat',
    pendingConfirmation: 'Menunggu Konfirmasi',
    dueDate: 'Jatuh tempo',
    uploadProof: 'Unggah Bukti',
    uploadFailed: 'Gagal mengunggah',
    downloadInvoice: 'Unduh Invoice',
  },
}

function makeOrder(overrides: Partial<PortalOrder> = {}): PortalOrder {
  return {
    id: 'ord-1',
    orgId: 'org-1',
    orgName: 'Test Org',
    orgLogoAssetId: null,
    orgPhone: null,
    status: 'production',
    orderNumber: 'ORD-2026-001',
    total: 100000,
    shippingAddress: null,
    customerId: null,
    customerName: null,
    customerPhone: null,
    customerIsWni: null,
    customerPhotoAssetId: null,
    lineItems: [
      {
        id: 'li-1',
        taskId: 't1',
        taskNumber: 'TSK-1',
        name: 'Custom T-Shirt',
        productName: 'T-Shirt',
        quantity: 10,
        unitPrice: 10000,
        total: 100000,
        notes: null,
        currentStageName: 'Cutting',
        assetIds: [],
        assets: [],
        createdAt: new Date('2026-01-01'),
        productionDays: 5,
        deadline: new Date('2026-01-10'),
      },
    ],
    invoices: [],
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }
}

function renderProgressView(order = makeOrder()) {
  return render(
    <IntlProvider locale="id" messages={messages}>
      <ProgressView order={order} token="token-1" />
    </IntlProvider>,
  )
}

describe('ProgressView', () => {
  it('renders the estimated completion from the max line item deadline', () => {
    renderProgressView()
    expect(screen.getAllByText(/10 Jan 2026/).length).toBeGreaterThanOrEqual(1)
  })


  it('does not render estimated completion when there are no line items', () => {
    renderProgressView(makeOrder({ lineItems: [] }))
    expect(screen.queryByText(/10 Jan 2026/)).not.toBeInTheDocument()
  })

  it('renders customer progress overview and next step details', () => {
    renderProgressView(
      makeOrder({
        status: 'production',
        lineItems: [
          {
            id: 'li-1',
            taskId: 't1',
            taskNumber: 'TSK-1',
            name: 'Custom T-Shirt',
            productName: 'T-Shirt',
            quantity: 10,
            unitPrice: 10000,
            total: 100000,
            notes: null,
            currentStageName: 'Cutting',
            assetIds: [],
            assets: [],
            createdAt: new Date('2026-01-01'),
            productionDays: 5,
            deadline: new Date('2026-01-15'),
          },
          {
            id: 'li-2',
            taskId: 't2',
            taskNumber: 'TSK-2',
            name: 'Custom Pants',
            productName: 'Pants',
            quantity: 2,
            unitPrice: 5000,
            total: 10000,
            notes: null,
            currentStageName: 'Sewing',
            assetIds: [],
            assets: [],
            createdAt: new Date('2026-01-02'),
            productionDays: 3,
            deadline: new Date('2026-01-10'),
          },
        ],
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-1',
            total: 50000,
            percentage: null,
            dueDate: '2099-01-10',
            status: 'unpaid',
            paymentMethodName: null,
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            shippingFee: 5000,
          },
          {
            id: 'inv-2',
            invoiceNumber: 'INV-2',
            total: 50000,
            percentage: null,
            dueDate: '2099-01-10',
            status: 'paid',
            paymentMethodName: null,
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            shippingFee: null,
          },
        ],
      }),
    )

    expect(screen.getByText('Estimasi selesai')).toBeInTheDocument()
    expect(screen.getAllByText(/15 Jan 2026/).length).toBeGreaterThanOrEqual(1)
  })

  it('renders inline invoice panel with summary', () => {
    renderProgressView(
      makeOrder({
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-1',
            total: 50000,
            percentage: null,
            dueDate: '2099-01-10',
            status: 'unpaid',
            paymentMethodName: null,
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            shippingFee: 5000,
          },
          {
            id: 'inv-2',
            invoiceNumber: 'INV-2',
            total: 50000,
            percentage: null,
            dueDate: '2099-01-10',
            status: 'paid',
            paymentMethodName: null,
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            shippingFee: null,
          },
        ],
      }),
    )

    expect(screen.getByText('Invoice dan pembayaran')).toBeInTheDocument()
    expect(screen.getByText(/1 belum dibayar/)).toBeInTheDocument()
  })
})
