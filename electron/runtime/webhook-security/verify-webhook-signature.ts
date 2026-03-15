/**
 * OC-2: Deterministic webhook signature verification.
 * Uses Node crypto for HMAC-SHA256; behavior is explicit and testable.
 */

import * as crypto from 'crypto';
import { parseWebhookSignature } from './parse-webhook-signature';
import type { WebhookSignatureVerificationResult } from './webhook-signature-verification-result';

const GITHUB_SIGNATURE_HEADER = 'x-hub-signature-256';

function getHeader(
  headers: { get?: (name: string) => string | string[] | undefined },
  name: string
): string {
  const h = headers.get?.(name);
  if (h == null) return '';
  return Array.isArray(h) ? (h[0] ?? '') : h;
}

function hmacSha256Hex(secret: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies webhook signature. Call before intake; fail closed on any error case.
 */
export function verifyWebhookSignature(params: {
  headers: { get?: (name: string) => string | string[] | undefined };
  rawBody: string;
  getSecret: () => string | undefined;
}): WebhookSignatureVerificationResult {
  const secret = params.getSecret();
  if (!secret || String(secret).trim() === '') {
    return { status: 'rejected', accepted: false, reason: 'missing-secret' };
  }

  const headerValue = getHeader(params.headers, GITHUB_SIGNATURE_HEADER);
  if (!headerValue.trim()) {
    return { status: 'rejected', accepted: false, reason: 'missing-signature' };
  }

  const parsed = parseWebhookSignature(headerValue);
  if (!parsed) {
    return { status: 'rejected', accepted: false, reason: 'malformed-signature' };
  }

  const expected = hmacSha256Hex(secret, params.rawBody);
  if (!timingSafeEqual(parsed.digest, expected)) {
    return { status: 'rejected', accepted: false, reason: 'invalid-signature' };
  }

  return { status: 'accepted', accepted: true };
}
