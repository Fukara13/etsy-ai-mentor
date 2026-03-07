/**
 * Gate-S12: Event Normalizer — Olay normalizer katmanı
 * Converts raw external event input into canonical repair events.
 * Pure function, deterministic, no network.
 */

import type { CanonicalRepairEvent } from './bridge-types';

/** Raw event input — minimal adapter contract. Keeps GitHub payload out of core. */
export type RawEventInput = {
  readonly event?: string;
  readonly source?: string;
  readonly prNumber?: number;
  readonly workflowName?: string;
  readonly correlationId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

export type NormalizeResult =
  | { readonly ok: true; readonly event: CanonicalRepairEvent }
  | { readonly ok: false; readonly error: string };

/** Options for deterministic tests (e.g. timestamp override). */
export type NormalizeOptions = { readonly timestampOverride?: string };

const CI_FAILED_VARIANTS = ['ci_failed', 'ci-failed', 'CI_FAILED'] as const;

function isCIFailure(event: string | undefined): boolean {
  if (!event || typeof event !== 'string') return false;
  return CI_FAILED_VARIANTS.includes(event as (typeof CI_FAILED_VARIANTS)[number]);
}

/** Validate required fields for CI failure. */
function validateCIFailureInput(input: RawEventInput): string | null {
  if (!input || typeof input !== 'object') return 'Input must be a non-null object';
  if (!input.source || typeof input.source !== 'string')
    return 'source is required and must be a non-empty string';
  if (input.source.trim() === '') return 'source cannot be empty';
  return null;
}

/**
 * Normalize raw event input into a canonical repair event.
 * Supports CI failure style input → CI_FAILED.
 */
export function normalizeEvent(input: RawEventInput, options?: NormalizeOptions): NormalizeResult {
  const validationError = validateCIFailureInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  if (isCIFailure(input.event)) {
    const timestamp = options?.timestampOverride ?? new Date().toISOString();
    const event: CanonicalRepairEvent = {
      type: 'CI_FAILED',
      source: String(input.source).trim(),
      timestamp,
      prNumber: typeof input.prNumber === 'number' && Number.isInteger(input.prNumber)
        ? input.prNumber
        : undefined,
      workflowName:
        typeof input.workflowName === 'string' && input.workflowName.trim()
          ? input.workflowName.trim()
          : undefined,
      correlationId:
        typeof input.correlationId === 'string' && input.correlationId.trim()
          ? input.correlationId.trim()
          : undefined,
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : undefined,
    };
    return { ok: true, event };
  }

  return {
    ok: false,
    error: `Unsupported event type: ${String(input.event ?? 'undefined')}. Supported: ci_failed, ci-failed, CI_FAILED`,
  };
}
