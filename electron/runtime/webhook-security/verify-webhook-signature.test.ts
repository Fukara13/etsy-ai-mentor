/**
 * OC-2: Deterministic tests for verifyWebhookSignature.
 */

import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { verifyWebhookSignature } from './verify-webhook-signature';

function hmac(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

function headers(sig: string): { get: (name: string) => string } {
  return {
    get: (name: string) =>
      name.toLowerCase() === 'x-hub-signature-256' ? sig : '',
  };
}

describe('verifyWebhookSignature', () => {
  const secret = 'test-secret';
  const rawBody = '{"event":"push"}';

  it('accepts valid signature', () => {
    const sig = hmac(secret, rawBody);
    const result = verifyWebhookSignature({
      headers: headers('sha256=' + sig),
      rawBody,
      getSecret: () => secret,
    });
    expect(result.status).toBe('accepted');
    expect(result.accepted).toBe(true);
  });

  it('rejects missing signature', () => {
    const result = verifyWebhookSignature({
      headers: headers(''),
      rawBody,
      getSecret: () => secret,
    });
    expect(result.accepted).toBe(false);
    expect(result.status).toBe('rejected');
    expect(result.reason).toBe('missing-signature');
  });

  it('rejects malformed signature', () => {
    const result = verifyWebhookSignature({
      headers: headers('not-sha256-format'),
      rawBody,
      getSecret: () => secret,
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('malformed-signature');
  });

  it('rejects invalid signature', () => {
    const result = verifyWebhookSignature({
      headers: headers('sha256=' + 'a'.repeat(64)),
      rawBody,
      getSecret: () => secret,
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('invalid-signature');
  });

  it('rejects missing secret safely', () => {
    const result = verifyWebhookSignature({
      headers: headers('sha256=' + hmac(secret, rawBody)),
      rawBody,
      getSecret: () => undefined,
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('missing-secret');
  });

  it('rejects empty string secret', () => {
    const result = verifyWebhookSignature({
      headers: headers('sha256=' + hmac(secret, rawBody)),
      rawBody,
      getSecret: () => '',
    });
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('missing-secret');
  });
});
