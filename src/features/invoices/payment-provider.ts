/**
 * Provider-neutral payment adapter for customer invoice payments.
 *
 * Customer invoice payments use this adapter interface. SaaS Subscription
 * billing is handled separately and MUST NOT reuse customer payment adapters.
 */
import type { PaymentMethod } from '#/features/invoices/model'
import { createMidtransTransaction } from '#/features/invoices/model'
/** Payment creation parameters passed to a provider adapter. */
export interface CreatePaymentParams {
  invoiceId: string
  orgId: string
  amount: number
  reference?: string
  proofAssetId?: string
}

/** Result from a provider's payment creation. */
export interface CreatePaymentResult {
  /** Provider-specific payment identifier (e.g. Midtrans order_id). */
  providerPaymentId: string | null
  /** Human-readable payment instructions for the customer. */
  instructions: string | null
  /** URL to redirect the customer to for payment (e.g. Midtrans Snap). */
  redirectUrl: string | null
}

/** Payment status as reported by the provider. */
export type ProviderPaymentStatus =
  | 'pending'
  | 'settled'
  | 'failed'
  | 'expired'
  | 'refunded'
  | 'unknown'

/** Result of a provider payment status check. */
export interface ProviderPaymentStatusResult {
  status: ProviderPaymentStatus
  grossAmount: number | null
  providerTransactionId: string | null
  paymentType: string | null
  settlementTime: Date | null
}

/**
 * Payment provider adapter interface.
 *
 * Each provider (bank_transfer, midtrans) implements this interface.
 * The adapter is responsible for provider-specific logic while the
 * core payment ledger and invoice state machine remain provider-agnostic.
 */
export interface PaymentProviderAdapter {
  /** Unique provider identifier matching the payment method type. */
  readonly providerType: string

  /**
   * Initialize a payment with the provider.
   * For bank_transfer this returns payment instructions.
   * For midtrans this creates a Snap transaction and returns a redirect URL.
   */
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>

  /**
   * Get payment instructions for display to the customer.
   * For bank_transfer this includes bank name, account number, etc.
   * For midtrans this may return null (handled by redirect).
   */
  getPaymentInstructions(paymentMethod: PaymentMethod): string | null
}

// ── Bank Transfer Adapter ──────────────────────────────────────────

/**
 * Bank transfer adapter for manual bank-transfer payments.
 *
 * Payments are recorded in the ledger and confirmed manually by admins
 * after verifying the bank transfer receipt/proof.
 */
export class BankTransferAdapter implements PaymentProviderAdapter {
  readonly providerType = 'bank_transfer'

  async createPayment(
    _params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    return {
      providerPaymentId: null,
      instructions: null,
      redirectUrl: null,
    }
  }

  getPaymentInstructions(paymentMethod: PaymentMethod): string | null {
    if (paymentMethod.instructions) return paymentMethod.instructions

    const parts: string[] = []
    if (paymentMethod.bankName) parts.push(`Bank: ${paymentMethod.bankName}`)
    if (paymentMethod.accountNumber)
      parts.push(`Account: ${paymentMethod.accountNumber}`)
    if (paymentMethod.accountHolder)
      parts.push(`Holder: ${paymentMethod.accountHolder}`)
    return parts.length > 0 ? parts.join('\n') : null
  }
}

// ── Midtrans Adapter ───────────────────────────────────────────────

/**
 * Midtrans payment provider adapter.
 *
 * Handles Snap token creation for customer redirect payments.
 * Webhook processing and reconciliation use the existing model functions
 * directly (webhook endpoint, reconciliation endpoint), not this adapter.
 * Does NOT handle SaaS Subscription billing.
 */
export class MidtransAdapter implements PaymentProviderAdapter {
  readonly providerType = 'midtrans'

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    const result = await createMidtransTransaction(
      params.invoiceId,
      params.orgId,
    )

    return {
      providerPaymentId: null,
      instructions: null,
      redirectUrl: result.redirectUrl,
    }
  }

  getPaymentInstructions(_paymentMethod: PaymentMethod): string | null {
    // Midtrans uses redirect — no static instructions.
    return null
  }
}

// ── Adapter Registry ───────────────────────────────────────────────

const adapters = new Map<string, PaymentProviderAdapter>()

/** Register a payment provider adapter. */
export function registerPaymentAdapter(adapter: PaymentProviderAdapter): void {
  adapters.set(adapter.providerType, adapter)
}

/** Get a payment provider adapter by type. */
export function getPaymentAdapter(
  providerType: string,
): PaymentProviderAdapter | undefined {
  return adapters.get(providerType)
}

/** Initialize default adapters. Called once at application startup. */
export function initializePaymentAdapters(): void {
  if (adapters.size === 0) {
    registerPaymentAdapter(new BankTransferAdapter())
    registerPaymentAdapter(new MidtransAdapter())
  }
}
