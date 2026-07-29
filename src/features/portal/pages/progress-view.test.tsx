import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'use-intl'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { OrderTimelineEvent, PortalOrder } from '../model'
import { ProgressView } from './progress-view'

const { mockCreateSnapToken, mockRouterInvalidate } = vi.hoisted(() => ({
  mockCreateSnapToken: vi.fn(),
  mockRouterInvalidate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ invalidate: mockRouterInvalidate }),
}))

vi.mock('#/features/invoices/server', () => ({
  createSnapTokenFn: mockCreateSnapToken,
  reconcilePortalPaymentFn: vi.fn(),
}))

const mockUseOrderTimeline = vi.fn(() => ({
  data: [] as OrderTimelineEvent[],
}))
const mockUseOrderTasksTimeline = vi.fn(() => ({ data: [] }))

vi.mock('../hooks', () => ({
  useOrderTimeline: () => mockUseOrderTimeline(),
  useOrderTasksTimeline: () => mockUseOrderTasksTimeline(),
  usePortalGetInvoiceUploadUrl: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useSubmitPaymentProof: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}))

afterEach(() => {
  document.querySelector('script[data-midtrans-snap="true"]')?.remove()
  Reflect.deleteProperty(window, 'snap')
  vi.restoreAllMocks()
})

const messages = {
  portal: {
    orderSummary: 'Ringkasan Pesanan',
    lineItems: 'Item',
    orderTotal: 'Total',
    completedThanks: 'Terima kasih',
    noStageTransitions: 'Belum ada perpindahan tahap',
    taskTimeline: 'Timeline Tugas',
    notes: 'Catatan',
    attachment: 'Masukkan File Desain',
    currentStage: 'Tahap Saat Ini',
    progressOverview: 'Ringkasan cepat',
    progressStatusApprovedHelp:
      'Pesanan Anda sudah disetujui. tim {org_name} sedang melakukan proses {first_preproduction_stage_name}',
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
    itemsSectionTitle: 'Daftar Pesanan',
    itemShowTimeline: 'Lihat timeline',
    itemHideTimeline: 'Sembunyikan timeline',
    itemProductionDaysInline: 'Produksi {days} hari kerja',
    itemDeadlineLabel: 'Deadline {date}',
    itemAttachmentsLabel: 'Design Pesanan',
    itemNoEvents: 'Belum ada pembaruan tahap',
    shippingAddress: 'Alamat Pengiriman',
    noShippingAddress: 'Belum ada alamat pengiriman',
    customerInfo: 'Informasi Pelanggan',
    quantity: 'Jml',
    itemName: 'Nama Desain',
    itemNamePlaceholder: 'Masukkan nama desain',
    itemNotes: 'Catatan',
    itemNotesPlaceholder: 'Tambahkan catatan',
    invoiceShowAll: 'Lihat semua ({count})',
    invoiceShowLess: 'Sembunyikan',
    invoicePaidOn: 'Lunas',
    invoiceDownPayment: 'Down Payment',
    invoiceFinalPayment: 'Pelunasan',
    invoiceUnpaidNoDue: 'Belum dibayar',
    invoiceDueLabel: 'Jatuh tempo {date}',
    invoiceOverdueOn: 'Terlambat {date}',
    invoiceBankCopy: 'Salin nomor rekening',
    invoiceBankCopied: 'Tersalin',
    invoiceProofPending: 'Menunggu konfirmasi',
    invoicePaymentInstructions: 'Instruksi',
    invoicesSectionTitle: 'Invoice',
    invoicesSectionDescription:
      'Unduh invoice dan unggah bukti pembayaran di sini.',
    shipmentTracking: 'Pelacakan Pengiriman',
    trackShipment: 'Lacak pengiriman',
    orderTimelineSectionTitle: 'Riwayat Pesanan',
    timelineLastUpdatePrefix: 'Update Terakhir: ',
    timelineExpand: 'Lihat selengkapnya',
    timelineCollapse: 'Sembunyikan',
    orderTimelineEmpty: 'Belum ada pembaruan',
    timelineDraftCreated: 'Draft pesanan dibuat',
    timelineDraftConfirmed: 'Draft pesanan dikonfirmasi, menunggu review',
    timelineOrderApproved: 'Pesanan disetujui admin',
    timelineDpInvoiceCreated: 'Invoice DP dibuat',
    timelinePaymentDpConfirmed: 'Pembayaran DP dikonfirmasi',
    timelineProductionStarted: 'Produksi dimulai',
    timelineFinalInvoiceCreated: 'Invoice pelunasan dibuat',
    timelinePaymentFinalConfirmed: 'Pembayaran pelunasan dikonfirmasi',
    timelineProductionFinished: 'Produksi selesai, siap dikirim',
    timelineShipmentConfirmed: 'Pengiriman dikonfirmasi',
    timelineOrderCompleted: 'Selesai',
    timelineStepCompleted: 'Selesai',
    timelineStepCurrent: 'Saat ini',
    timelineStepUpcoming: 'Menunggu',
    timelineDateUnavailable: 'Tanggal belum tercatat',
    statusCompleted: 'Selesai',
    payNow: 'Bayar Sekarang',
    paymentCancelled: 'Pembayaran dibatalkan',
    paymentSuccess: 'Pembayaran berhasil',
    paymentFailed: 'Pembayaran gagal',
    midtransSdkNotLoaded: 'SDK Midtrans belum dimuat',
    processingPayment: 'Memproses',
    paymentVerifying: 'Memverifikasi pembayaran',
    paymentConfirmTimeout: 'Konfirmasi pembayaran tertunda',
  },
  status: {
    production: 'Dalam Produksi',
    paid: 'Lunas',
    unpaid: 'Belum Dibayar',
    completed: 'Siap Kirim',
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
  common: {
    download: 'Unduh',
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
    specifications: [],
    lineItems: [
      {
        id: 'li-1',
        taskId: 't1',
        taskNumber: 'TSK-1',
        designName: 'Custom T-Shirt',
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
    approvedAt: null,
    shippedAt: null,
    deliveredAt: null,
    courier: null,
    trackingNumber: null,
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
  it('opens Midtrans Snap on the first click after the SDK loads', async () => {
    const appendScript = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node) => node)
    const pay = vi.fn()
    mockCreateSnapToken.mockResolvedValue({
      ok: true,
      snapToken: 'snap-token-1',
      clientKey: 'client-key-1',
      isProduction: false,
    })
    renderProgressView(
      makeOrder({
        invoices: [
          {
            id: 'inv-midtrans',
            invoiceNumber: 'INV-MIDTRANS',
            total: 100000,
            percentage: 100,
            dueDate: '2099-01-10',
            status: 'unpaid',
            paymentMethodName: 'Midtrans',
            paymentProvider: 'midtrans',
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            midtransOrderId: null,
            paidAt: null,
            shippingFee: null,
          },
        ],
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Bayar Sekarang' }))

    const script = await waitFor(() => {
      expect(appendScript).toHaveBeenCalledTimes(1)
      const appendedNode = appendScript.mock.calls[0]?.[0]
      expect(appendedNode).toBeInstanceOf(HTMLScriptElement)
      return appendedNode as HTMLScriptElement
    })
    expect(pay).not.toHaveBeenCalled()

    window.snap = { pay }
    script.dispatchEvent(new Event('load'))

    await waitFor(() =>
      expect(pay).toHaveBeenCalledWith('snap-token-1', expect.any(Object)),
    )
    expect(mockCreateSnapToken).toHaveBeenCalledTimes(1)
  })

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
            designName: 'Custom T-Shirt',
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
            designName: 'Custom Pants',
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
            paymentProvider: 'bank_transfer',
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            midtransOrderId: null,
            paidAt: null,
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
            paymentProvider: 'bank_transfer',
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            midtransOrderId: null,
            paidAt: '2026-01-08T10:00:00.000Z',
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
            paymentProvider: 'bank_transfer',
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            midtransOrderId: null,
            paidAt: null,
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
            paymentProvider: 'bank_transfer',
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            midtransOrderId: null,
            paidAt: '2026-01-08T10:00:00.000Z',
            shippingFee: null,
          },
        ],
      }),
    )

    expect(screen.getByText('Invoice')).toBeInTheDocument()
    expect(screen.getByText(/1 belum dibayar/)).toBeInTheDocument()
    expect(screen.getByText('Down Payment')).toBeInTheDocument()
    expect(screen.getByText('Pelunasan')).toBeInTheDocument()
  })
  it('renders Down Payment badge for a single invoice with percentage < 100', () => {
    renderProgressView(
      makeOrder({
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-1',
            total: 50000,
            percentage: 50,
            dueDate: '2099-01-10',
            status: 'unpaid',
            paymentMethodName: null,
            paymentProvider: 'bank_transfer',
            paymentMethodBankName: null,
            paymentMethodAccountNumber: null,
            paymentMethodAccountHolder: null,
            paymentMethodInstructions: null,
            hasPaymentProof: false,
            midtransOrderId: null,
            paidAt: null,
            shippingFee: null,
          },
        ],
      }),
    )

    expect(screen.getByText('Down Payment')).toBeInTheDocument()
    expect(screen.queryByText('Pelunasan')).not.toBeInTheDocument()
  })

  it('renders all 11 order timeline milestones with Indonesian labels', () => {
    mockUseOrderTimeline.mockReturnValue({
      data: [
        {
          id: 'e1',
          type: 'draft_created',
          status: 'completed',
          completedAt: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'e2',
          type: 'draft_confirmed',
          status: 'completed',
          completedAt: null,
        },
        {
          id: 'e3',
          type: 'order_approved',
          status: 'completed',
          completedAt: new Date('2026-01-02T00:00:00Z'),
        },
        {
          id: 'e4',
          type: 'dp_invoice_created',
          status: 'completed',
          completedAt: new Date('2026-01-03T00:00:00Z'),
          invoiceId: 'inv-dp',
          invoiceNumber: 'INV-DP-1',
          amount: 50000,
        },
        {
          id: 'e5',
          type: 'dp_payment_confirmed',
          status: 'completed',
          completedAt: new Date('2026-01-04T00:00:00Z'),
          amount: 50000,
        },
        {
          id: 'e6',
          type: 'production_started',
          status: 'completed',
          completedAt: null,
        },
        {
          id: 'e7',
          type: 'final_invoice_created',
          status: 'completed',
          completedAt: new Date('2026-01-18T00:00:00Z'),
          invoiceId: 'inv-final',
          invoiceNumber: 'INV-FINAL-1',
          amount: 50000,
        },
        {
          id: 'e8',
          type: 'final_payment_confirmed',
          status: 'completed',
          completedAt: new Date('2026-01-19T00:00:00Z'),
          amount: 50000,
        },
        {
          id: 'e9',
          type: 'production_finished',
          status: 'completed',
          completedAt: new Date('2026-01-20T00:00:00Z'),
        },
        {
          id: 'e10',
          type: 'shipment_confirmed',
          status: 'completed',
          completedAt: new Date('2026-01-20T00:00:00Z'),
        },
        {
          id: 'e11',
          type: 'order_completed',
          status: 'completed',
          completedAt: new Date('2026-01-25T00:00:00Z'),
        },
      ],
    })
    renderProgressView()
    expect(screen.getByText('Riwayat Pesanan')).toBeInTheDocument()
    expect(screen.getByText('Draft pesanan dibuat')).toBeInTheDocument()
    expect(
      screen.getByText('Draft pesanan dikonfirmasi, menunggu review'),
    ).toBeInTheDocument()
    expect(screen.getByText('Pesanan disetujui admin')).toBeInTheDocument()
    expect(screen.getByText('Invoice DP dibuat')).toBeInTheDocument()
    expect(screen.getByText('Pembayaran DP dikonfirmasi')).toBeInTheDocument()
    expect(screen.getByText('Produksi dimulai')).toBeInTheDocument()
    expect(screen.getByText('Invoice pelunasan dibuat')).toBeInTheDocument()
    expect(
      screen.getByText('Pembayaran pelunasan dikonfirmasi'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Produksi selesai, siap dikirim'),
    ).toBeInTheDocument()
    expect(screen.getByText('Pengiriman dikonfirmasi')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()
  })

  it('does not show product/stage workflow text in the order timeline section', () => {
    mockUseOrderTimeline.mockReturnValue({
      data: [
        {
          id: 'e1',
          type: 'draft_created',
          status: 'completed',
          completedAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
    })
    renderProgressView()
    expect(
      screen.queryByText('Custom T-Shirt: Cutting'),
    ).not.toBeInTheDocument()
  })

  it('renders empty state for the order timeline when there are no events', () => {
    mockUseOrderTimeline.mockReturnValue({ data: [] })
    renderProgressView()
    expect(screen.getByText('Belum ada pembaruan')).toBeInTheDocument()
  })

  it('renders completed portal status as Selesai instead of Siap Kirim', () => {
    renderProgressView(makeOrder({ status: 'completed' }))

    expect(screen.getByText('Selesai')).toBeInTheDocument()
    expect(screen.getByText('Selesai pada')).toBeInTheDocument()
    expect(screen.queryByText('Siap Kirim')).not.toBeInTheDocument()
  })

  it('toggles line item timeline visibility when clicking the toggle button', () => {
    renderProgressView()

    // Find the toggle button
    const toggleButton = screen.getByRole('button', { name: 'Lihat timeline' })
    expect(toggleButton).toBeInTheDocument()

    // Click the toggle button to expand
    fireEvent.click(toggleButton)
    expect(
      screen.getByRole('button', { name: 'Sembunyikan timeline' }),
    ).toBeInTheDocument()

    // Click the toggle button to collapse again
    fireEvent.click(
      screen.getByRole('button', { name: 'Sembunyikan timeline' }),
    )
    expect(
      screen.getByRole('button', { name: 'Lihat timeline' }),
    ).toBeInTheDocument()
  })
})
