/**
 * OC-2: Webhook security — signature verification guard.
 */

export { parseWebhookSignature } from './parse-webhook-signature';
export type { ParsedSignature } from './parse-webhook-signature';
export { verifyWebhookSignature } from './verify-webhook-signature';
export type {
  WebhookSignatureVerificationResult,
  WebhookVerificationReason,
} from './webhook-signature-verification-result';
