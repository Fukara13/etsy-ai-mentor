/**
 * OC-2: Structured result for webhook signature verification.
 */

export type WebhookVerificationReason =
  | 'missing-secret'
  | 'missing-signature'
  | 'malformed-signature'
  | 'invalid-signature';

export type WebhookSignatureVerificationResult =
  | { status: 'accepted'; accepted: true }
  | { status: 'rejected'; accepted: false; reason: WebhookVerificationReason };
