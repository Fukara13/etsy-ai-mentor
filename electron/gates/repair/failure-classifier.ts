/**
 * Gate-S15: Failure Classifier — Deterministic failure classification model.
 */

export type FailureClass =
  | 'test_flake'
  | 'lint_error'
  | 'compile_error'
  | 'dependency_error'
  | 'policy_risk'
  | 'unknown';

export interface FailureSignal {
  readonly summary?: string;
  readonly category?: string;
  readonly hasPolicyRisk?: boolean;
}

function safeLower(s: string | undefined): string {
  return typeof s === 'string' ? s.toLowerCase().trim() : '';
}

/** Classify CI failure from signal. Policy risk always wins. */
export function classifyFailure(signal: FailureSignal): FailureClass {
  if (!signal || typeof signal !== 'object') return 'unknown';
  if (signal.hasPolicyRisk === true) return 'policy_risk';

  const category = safeLower(signal.category);
  const summary = safeLower(signal.summary);

  if (category === 'test' && (summary.includes('flaky') || summary.includes('timeout'))) {
    return 'test_flake';
  }
  if (category === 'lint') return 'lint_error';
  if (category === 'compile') return 'compile_error';
  if (category === 'dependency') return 'dependency_error';

  return 'unknown';
}
