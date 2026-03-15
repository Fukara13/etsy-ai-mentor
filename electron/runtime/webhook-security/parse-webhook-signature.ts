/**
 * OC-2: Parse signature header (e.g. X-Hub-Signature-256: sha256=<hex>).
 * Pure helper; only supports sha256.
 */

export type ParsedSignature = { algorithm: 'sha256'; digest: string };

const PREFIX = 'sha256=';

/**
 * Returns parsed { algorithm, digest } or null if missing or malformed.
 */
export function parseWebhookSignature(headerValue: string | undefined): ParsedSignature | null {
  const raw = (headerValue ?? '').trim();
  if (!raw || !raw.startsWith(PREFIX)) return null;
  const digest = raw.slice(PREFIX.length).trim().toLowerCase();
  if (!digest || digest.length !== 64 || !/^[a-f0-9]+$/.test(digest)) return null;
  return { algorithm: 'sha256', digest };
}
