/**
 * RE-13: Minimal HTTP server for webhook intake.
 */

import * as http from 'http';
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

export function createWebhookServer(options?: {
  path?: string;
  port?: number;
  cwd?: string;
}): http.Server {
  const path = options?.path ?? DEFAULT_PATH;
  const cwd = options?.cwd ?? process.cwd();

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

    const response = webhookIntakeHandler({
      method,
      headers: toHeadersRecord(req),
      rawBody,
      cwd,
    });

    res.writeHead(response.statusCode);
    res.end(response.body ?? '');
  });
}
