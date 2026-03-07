/**
 * Gate-S12: Context Resolver — Bağlam çözücü
 * Assembles bridge context from supplied inputs.
 * Pure function, deterministic, no GitHub API.
 */

import type { BridgeContext } from './bridge-types';

const MAX_RETRY = 3 as const;

export type ContextResolverInput = {
  readonly prNumber?: number;
  readonly retryCount?: number;
  readonly hasGateReviewLabel?: boolean;
  readonly isExhausted?: boolean;
  readonly julesMode?: 'frozen' | 'active' | 'unknown';
  readonly sourceWorkflow?: string;
  readonly lastKnownPhase?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type ResolveContextResult =
  | { readonly ok: true; readonly context: BridgeContext }
  | { readonly ok: false; readonly error: string };

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0 || value === null || value === undefined) return false;
  return Boolean(value);
}

function clampRetry(count: number): number {
  return Math.min(Math.max(0, Math.floor(count)), MAX_RETRY);
}

/** Resolve bridge context from supplied inputs. Validates retryCount, normalizes booleans. */
export function resolveContext(input: ContextResolverInput = {}): ResolveContextResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Context input must be a non-null object' };
  }

  const rawRetry = input.retryCount;
  const retryCount =
    typeof rawRetry === 'number' && Number.isInteger(rawRetry) && rawRetry >= 0
      ? clampRetry(rawRetry)
      : 0;

  const prNumber =
    typeof input.prNumber === 'number' && Number.isInteger(input.prNumber) && input.prNumber > 0
      ? input.prNumber
      : undefined;

  const hasGateReviewLabel = normalizeBoolean(input.hasGateReviewLabel);
  const isExhausted = normalizeBoolean(input.isExhausted);

  const julesMode =
    input.julesMode === 'frozen' || input.julesMode === 'active' || input.julesMode === 'unknown'
      ? input.julesMode
      : 'unknown';

  const sourceWorkflow =
    typeof input.sourceWorkflow === 'string' && input.sourceWorkflow.trim()
      ? input.sourceWorkflow.trim()
      : undefined;

  const lastKnownPhase =
    typeof input.lastKnownPhase === 'string' && input.lastKnownPhase.trim()
      ? input.lastKnownPhase.trim()
      : undefined;

  const metadata =
    input.metadata && typeof input.metadata === 'object' ? input.metadata : undefined;

  const context: BridgeContext = {
    prNumber,
    retryCount,
    hasGateReviewLabel,
    isExhausted,
    julesMode,
    sourceWorkflow,
    lastKnownPhase,
    metadata,
  };

  return { ok: true, context };
}
