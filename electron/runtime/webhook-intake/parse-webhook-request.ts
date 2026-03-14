/**
 * RE-13: Parse HTTP request data into GitHubWebhookInput or failure result.
 * Adapter-level only. No domain logic.
 */

import type { GitHubWebhookInput } from '../../../src/github/event-intake/github-webhook-input';

export type ParseWebhookResult =
  | { ok: true; webhook: GitHubWebhookInput }
  | { ok: false; statusCode: 400 | 405; reason: string };

const GITHUB_EVENT_HEADER = 'x-github-event';

function getHeader(headers: { get?: (name: string) => string | string[] | undefined }, name: string): string {
  const h = headers.get?.(name);
  if (h == null) return '';
  return Array.isArray(h) ? h[0] ?? '' : h;
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Parses request data into GitHubWebhookInput.
 * Rejects invalid JSON or unsupported method.
 */
export function parseWebhookRequest(params: {
  method: string;
  headers: { get?: (name: string) => string | string[] | undefined };
  rawBody: string;
}): ParseWebhookResult {
  const method = (params.method || '').toUpperCase().trim();
  if (method !== 'POST') {
    return { ok: false, statusCode: 405, reason: 'Method not allowed' };
  }

  const eventKind = getHeader(params.headers, GITHUB_EVENT_HEADER).trim();
  if (!eventKind) {
    return { ok: false, statusCode: 400, reason: 'Missing X-GitHub-Event header' };
  }

  const rawBody = params.rawBody?.trim() ?? '';
  if (!rawBody) {
    return { ok: false, statusCode: 400, reason: 'Empty body' };
  }

  const payload = safeParseJson(rawBody);
  if (payload == null || typeof payload !== 'object') {
    return { ok: false, statusCode: 400, reason: 'Invalid JSON' };
  }

  const deliveryId = getHeader(params.headers, 'x-github-delivery').trim() || 'delivery-unknown';
  const webhook: GitHubWebhookInput = Object.freeze({
    eventKind,
    deliveryId,
    payload: Object.freeze(payload as Record<string, unknown>),
  });

  return { ok: true, webhook };
}
