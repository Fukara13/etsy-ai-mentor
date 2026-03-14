/**
 * RE-13.1: Bootstrap webhook server when enabled via env.
 * Adapter layer only. No trunk changes.
 */

import { createWebhookServer } from './create-webhook-server';

const DEFAULT_PORT = 3141;
const DEFAULT_HOST = '127.0.0.1';

function isEnabled(): boolean {
  const v = process.env.ENABLE_WEBHOOK_SERVER ?? '';
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true';
}

function parsePort(): number {
  const v = process.env.WEBHOOK_PORT ?? '';
  const n = parseInt(String(v).trim(), 10);
  if (Number.isNaN(n) || n < 1 || n > 65535) return DEFAULT_PORT;
  return n;
}

/**
 * Starts the webhook server if ENABLE_WEBHOOK_SERVER is "1" or "true".
 * Handles listen errors without throwing. Does nothing when disabled.
 */
export function startWebhookServerIfEnabled(): void {
  if (!isEnabled()) {
    console.log('[webhook] disabled (ENABLE_WEBHOOK_SERVER not set or not "1"/"true")');
    return;
  }

  const port = parsePort();
  const server = createWebhookServer({ cwd: process.cwd() });

  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error('[webhook] server error:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error('[webhook] port', port, 'already in use');
    }
  });

  server.listen(port, DEFAULT_HOST, () => {
    console.log('[webhook] listening on', DEFAULT_HOST + ':' + port);
  });
}
