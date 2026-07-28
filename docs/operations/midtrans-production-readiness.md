# Midtrans Production Readiness

## Rollout Checklist

- [ ] Confirm the organization is using the intended Midtrans sandbox or production mode.
- [ ] Confirm `midtransIsProduction` matches the selected Midtrans environment.
- [ ] Set the production webhook URL to `https://<app-host>/api/midtrans-notification`.
- [ ] Verify the configured server key and client key belong to the same Midtrans environment.
- [ ] Rotate credentials through the organization payment settings when a key is exposed or changed.
- [ ] Confirm `MIDTRANS_RECONCILIATION_SECRET` is configured for the scheduled reconciliation request.
- [ ] Run reconciliation and investigate mismatches, orphaned attempts, and review-required transactions.
- [ ] Confirm logs are searchable by the `correlationId` field and alerts are routed from error-level payment events.
- [ ] Record the operator and timestamp for the rollout.

## Sandbox Smoke Test

1. Select sandbox mode and confirm the displayed client key belongs to the sandbox account.
2. Create an invoice with Midtrans as the payment provider.
3. Start payment from the invoice and confirm Snap token creation succeeds.
4. Complete a sandbox payment using a Midtrans test instrument.
5. Confirm the notification reaches `/api/midtrans-notification` and returns `200 OK`.
6. Search application logs using the returned `x-correlation-id` and verify no server key or raw payload is logged.
7. Confirm the transaction attempt is settled and the payment is `confirmed` with `confirmedBy=midtrans-webhook`.
8. Confirm the invoice reaches the expected paid or partially-paid state.
9. Run the authenticated reconciliation endpoint with `x-reconciliation-secret` and confirm the attempt remains idempotent.
10. For refund testing, issue a sandbox refund and verify the payment and invoice move to the explicit refund state.

## Recovery Checks

- A `403` signature response must be investigated as an authorization or credential mismatch.
- A `404` unknown transaction response must be correlated with the originating order and reviewed by an operator.
- A `400` amount mismatch must remain unresolved until the specific attempt is reconciled or manually reviewed.
- A reconciliation `500` response must be retried using the same correlation ID when investigating the failure.
- Error logs must contain event type, organization-safe identifiers, and correlation ID, but never server keys or raw gateway payloads.
