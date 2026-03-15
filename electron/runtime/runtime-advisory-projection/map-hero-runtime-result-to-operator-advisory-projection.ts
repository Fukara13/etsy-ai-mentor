/**
 * OC-5: Centralized mapping from hero runtime result to operator advisory projection.
 */

import type { HeroRuntimeResult } from '../heroes-runtime/hero-runtime-result';
import type {
  OperatorRuntimeAdvisoryProjection,
  OperatorAdvisoryItem,
  OperatorAdvisoryStatus,
} from './operator-runtime-advisory-projection';

function entryToAdvisoryItem(entry: {
  readonly summary: string;
  readonly rationale: string;
  readonly confidence?: number;
  readonly recommendedNextStep?: string;
  readonly signals?: readonly string[];
}): OperatorAdvisoryItem {
  return Object.freeze({
    summary: entry.summary?.trim() || 'No summary',
    rationaleExcerpt: entry.rationale?.trim().slice(0, 500) || '',
    confidence: entry.confidence,
    recommendedNextStep: entry.recommendedNextStep?.trim() || undefined,
    supportingSignalSummaries:
      entry.signals?.length ? [...entry.signals] : undefined,
  });
}

function toFailureSummary(failureDetails: readonly { readonly error: string }[]): string {
  if (!failureDetails?.length) return '';
  if (failureDetails.length === 1) return failureDetails[0].error;
  return failureDetails.map((d) => d.error).join('; ');
}

/**
 * Maps hero runtime result to operator-visible advisory projection.
 * Single centralized mapper; deterministic and testable.
 */
export function mapHeroRuntimeResultToOperatorAdvisoryProjection(
  result: HeroRuntimeResult
): OperatorRuntimeAdvisoryProjection {
  const status: OperatorAdvisoryStatus = result.status;
  const advisorySummaries: OperatorAdvisoryItem[] = result.advisoryEntries.map((e) =>
    entryToAdvisoryItem(e)
  );
  const failureSummary =
    result.failureDetails?.length && (status === 'partial' || status === 'failed')
      ? toFailureSummary(result.failureDetails)
      : undefined;

  return Object.freeze({
    source: 'hero-runtime',
    status,
    advisorySummaries,
    ...(failureSummary !== undefined && failureSummary !== ''
      ? { failureSummary }
      : {}),
  });
}
