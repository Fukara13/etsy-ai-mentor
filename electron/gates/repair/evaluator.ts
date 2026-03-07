/**
 * Gate-S10: Evaluator Quality Gate
 * CI passed alone is NOT sufficient. Policy and quality flags must also pass.
 */

import type { EvaluatorDecision, GuardianDecision } from './types';

export type EvaluatorInput = {
  /** Whether CI has passed. */
  ciPassed: boolean;
  /** Guardian decision (policy checks). */
  guardian: GuardianDecision;
  /** Optional: any additional quality flags. */
  noSuspiciousEdits?: boolean;
};

/**
 * Evaluator rejects if any of:
 * - CI did not pass
 * - Guardian did not allow
 * - Suspicious edits detected (if flag provided)
 */
export function runEvaluator(input: EvaluatorInput): EvaluatorDecision {
  const policyOk = input.guardian.allowed;
  const noSuspicious = input.noSuspiciousEdits ?? true;

  const passed = input.ciPassed && policyOk && noSuspicious;

  let reason: string;
  if (!input.ciPassed) {
    reason = 'CI did not pass';
  } else if (!policyOk) {
    reason = 'Guardian policy failed';
  } else if (!noSuspicious) {
    reason = 'Suspicious edits detected';
  } else {
    reason = 'All quality gates passed';
  }

  return {
    passed,
    reason,
    qualityFlags: {
      ciPassed: input.ciPassed,
      policyOk,
      noSuspiciousEdits: noSuspicious,
    },
  };
}
