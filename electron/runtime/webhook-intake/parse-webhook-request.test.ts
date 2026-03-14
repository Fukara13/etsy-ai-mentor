/**
 * RE-13: Tests for parseWebhookRequest.
 */

import { describe, it, expect } from 'vitest';
import { parseWebhookRequest } from './parse-webhook-request';

describe('parseWebhookRequest', () => {
  it('POST with valid headers and body returns webhook', () => {
    const result = parseWebhookRequest({
      method: 'POST',
      headers: {
        get: (n) => (n === 'x-github-event' ? 'workflow_run' : n === 'x-github-delivery' ? 'deliv-1' : ''),
      },
      rawBody: '{"action":"completed"}',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.webhook.eventKind).toBe('workflow_run');
      expect(result.webhook.deliveryId).toBe('deliv-1');
      expect(result.webhook.payload).toEqual({ action: 'completed' });
    }
  });

  it('GET returns 405', () => {
    const result = parseWebhookRequest({
      method: 'GET',
      headers: { get: () => 'workflow_run' },
      rawBody: '{}',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(405);
  });

  it('invalid JSON returns 400', () => {
    const result = parseWebhookRequest({
      method: 'POST',
      headers: {
        get: (n) => (n === 'x-github-event' ? 'workflow_run' : n === 'x-github-delivery' ? 'd' : ''),
      },
      rawBody: 'not json',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(400);
  });

  it('missing event header returns 400', () => {
    const result = parseWebhookRequest({
      method: 'POST',
      headers: { get: () => '' },
      rawBody: '{}',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(400);
  });

  it('empty body returns 400', () => {
    const result = parseWebhookRequest({
      method: 'POST',
      headers: {
        get: (n) => (n === 'x-github-event' ? 'workflow_run' : ''),
      },
      rawBody: '',
    });
    expect(result.ok).toBe(false);
  });
});
