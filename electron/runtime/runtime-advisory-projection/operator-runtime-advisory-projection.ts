/**
 * OC-5: Canonical operator-facing advisory projection. Informational only; no authority.
 */

/** Single advisory item visible to operator. No execution or identity authority. */
export type OperatorAdvisoryItem = {
  readonly summary: string;
  readonly rationaleExcerpt: string;
  readonly confidence?: number;
  readonly recommendedNextStep?: string;
  readonly supportingSignalSummaries?: readonly string[];
};

/** Status of the advisory run for display. */
export type OperatorAdvisoryStatus = 'completed' | 'skipped' | 'partial' | 'failed';

/**
 * Operator-visible projection of runtime advisory results.
 * Safe, minimal, deterministic. Never implies action authority.
 */
export type OperatorRuntimeAdvisoryProjection = {
  readonly source: 'hero-runtime';
  readonly status: OperatorAdvisoryStatus;
  readonly advisorySummaries: readonly OperatorAdvisoryItem[];
  readonly failureSummary?: string;
};
