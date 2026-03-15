/**
 * RE-13: Minimal HTTP server for webhook intake.
 * OC-2: Signature verification guard runs before intake.
 */

import * as http from 'http';
import { verifyWebhookSignature } from '../webhook-security';
import { webhookIntakeHandler } from './webhook-intake-handler';

const DEFAULT_PATH = '/webhook';

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function toHeadersRecord(req: http.IncomingMessage): { get?: (name: string) => string | string[] | undefined } {
  return {
    get: (name: string) => req.headers[name.toLowerCase()],
  };
}

function getDefaultWebhookSecret(): string | undefined {
  const v = process.env.WEBHOOK_SECRET;
  return typeof v === 'string' ? v : undefined;
}

export function createWebhookServer(options?: {
  path?: string;
  port?: number;
  cwd?: string;
  getWebhookSecret?: () => string | undefined;
}): http.Server {
  const path = options?.path ?? DEFAULT_PATH;
  const cwd = options?.cwd ?? process.cwd();
  const getSecret = options?.getWebhookSecret ?? getDefaultWebhookSecret;

  return http.createServer(async (req, res) => {
    const url = req.url ?? '';
    const method = req.method ?? '';

    if (url !== path && url !== path + '/') {
      res.writeHead(404);
      res.end();
      return;
    }

    let rawBody = '';
    try {
      rawBody = await readBody(req);
    } catch {
      res.writeHead(500);
      res.end();
      return;
    }

    const verification = verifyWebhookSignature({
      headers: toHeadersRecord(req),
      rawBody,
      getSecret,
    });

    if (!verification.accepted) {
      const body = JSON.stringify({
        status: 'rejected',
        reason: verification.reason,
      });
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }

    const response = await webhookIntakeHandler({
      method,
      headers: toHeadersRecord(req),
      rawBody,
      cwd,
    });

    const resHeaders: Record<string, string> = {};
    if (response.body) resHeaders['Content-Type'] = 'application/json';
    res.writeHead(response.statusCode, resHeaders);
    res.end(response.body ?? '');
  });
}
