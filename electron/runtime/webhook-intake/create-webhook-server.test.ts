/**
 * RE-13 + OC-2: Tests for createWebhookServer with signature guard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as http from 'http';
import * as crypto from 'crypto';

const handlerMock = vi.fn<typeof import('./webhook-intake-handler').webhookIntakeHandler>();

vi.mock('./webhook-intake-handler', () => ({
  webhookIntakeHandler: (...args: unknown[]) => handlerMock(...args),
}));

async function createServerAndListen(
  getWebhookSecret: () => string | undefined
): Promise<{ server: http.Server; port: number }> {
  const { createWebhookServer } = await import('./create-webhook-server');
  const server = createWebhookServer({
    getWebhookSecret,
    path: '/webhook',
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr !== null && 'port' in addr ? addr.port : 0;
      resolve({ server, port });
    });
  });
}

function request(
  port: number,
  opts: { method?: string; path?: string; headers?: Record<string, string>; body?: string }
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: opts.path ?? '/webhook',
        method: opts.method ?? 'POST',
        headers: opts.headers ?? {},
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () =>
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        );
      }
    );
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function hmac(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

describe('createWebhookServer with OC-2 guard', () => {
  beforeEach(() => {
    handlerMock.mockReset();
    handlerMock.mockReturnValue({ statusCode: 202 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects missing signature with 401 and does not call handler', async () => {
    const secret = 'test-secret';
    const { server, port } = await createServerAndListen(() => secret);
    try {
      const rawBody = '{"action":"completed","repository":{"full_name":"o/r"}}';
      const res = await request(port, {
        method: 'POST',
        headers: {
          'x-github-event': 'workflow_run',
          'x-github-delivery': 'd1',
        },
        body: rawBody,
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body)).toEqual({ status: 'rejected', reason: 'missing-signature' });
      expect(handlerMock).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it('rejects invalid signature with 401 and does not call handler', async () => {
    const secret = 'test-secret';
    const { server, port } = await createServerAndListen(() => secret);
    try {
      const rawBody = '{"action":"completed"}';
      const res = await request(port, {
        method: 'POST',
        headers: {
          'x-github-event': 'workflow_run',
          'x-github-delivery': 'd1',
          'x-hub-signature-256': 'sha256=' + 'f'.repeat(64),
        },
        body: rawBody,
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).reason).toBe('invalid-signature');
      expect(handlerMock).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it('rejects missing secret with 401 and does not call handler', async () => {
    const rawBody = '{"action":"completed"}';
    const { server, port } = await createServerAndListen(() => undefined);
    try {
      const sig = hmac('any-secret', rawBody);
      const res = await request(port, {
        method: 'POST',
        headers: {
          'x-github-event': 'workflow_run',
          'x-github-delivery': 'd1',
          'x-hub-signature-256': 'sha256=' + sig,
        },
        body: rawBody,
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).reason).toBe('missing-secret');
      expect(handlerMock).not.toHaveBeenCalled();
    } finally {
      server.close();
    }
  });

  it('accepts valid signature and calls handler', async () => {
    const secret = 'test-secret';
    const rawBody = '{"action":"completed","repository":{"full_name":"o/r"}}';
    const { server, port } = await createServerAndListen(() => secret);
    try {
      const sig = hmac(secret, rawBody);
      const res = await request(port, {
        method: 'POST',
        headers: {
          'x-github-event': 'workflow_run',
          'x-github-delivery': 'd1',
          'x-hub-signature-256': 'sha256=' + sig,
        },
        body: rawBody,
      });
      expect(res.statusCode).toBe(202);
      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(handlerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          rawBody,
        })
      );
    } finally {
      server.close();
    }
  });
});
