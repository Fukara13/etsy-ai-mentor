/**
 * OC-2: Tests for parseWebhookSignature.
 */

import { describe, it, expect } from 'vitest';
import { parseWebhookSignature } from './parse-webhook-signature';

describe('parseWebhookSignature', () => {
  it('accepts valid sha256 hex string', () => {
    const hex = 'a'.repeat(64);
    expect(parseWebhookSignature('sha256=' + hex)).toEqual({ algorithm: 'sha256', digest: hex });
  });

  it('normalizes digest to lowercase', () => {
    const hex = 'A'.repeat(64);
    expect(parseWebhookSignature('sha256=' + hex)).toEqual({
      algorithm: 'sha256',
      digest: 'a'.repeat(64),
    });
  });

  it('returns null for undefined', () => {
    expect(parseWebhookSignature(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseWebhookSignature('')).toBeNull();
  });

  it('returns null for wrong prefix', () => {
    expect(parseWebhookSignature('sha1=abc')).toBeNull();
    expect(parseWebhookSignature('sha256')).toBeNull();
  });

  it('returns null for non-hex digest', () => {
    expect(parseWebhookSignature('sha256=' + 'g'.repeat(64))).toBeNull();
    expect(parseWebhookSignature('sha256=abc')).toBeNull();
  });

  it('returns null for wrong length digest', () => {
    expect(parseWebhookSignature('sha256=' + 'a'.repeat(63))).toBeNull();
    expect(parseWebhookSignature('sha256=' + 'a'.repeat(65))).toBeNull();
  });
});
