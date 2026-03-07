/**
 * Gate-S15: Repair Decision — Structured decision model.
 */

import type { FailureClass, FailureSignal } from './failure-classifier';
import { classifyFailure } from './failure-classifier';
import type { RepairStrategy } from './repair-strategy';
import { selectRepairStrategy } from './repair-strategy';

export interface RepairDecision {
  readonly failureClass: FailureClass;
  readonly strategy: RepairStrategy;
  readonly reason: string;
}

const REASONS: Record<FailureClass, string> = {
  test_flake: 'Failure classified as flaky/timeout-prone test behavior.',
  lint_error: 'Failure classified as lint error; patch candidate allowed.',
  compile_error: 'Failure classified as compile error; patch candidate allowed.',
  dependency_error: 'Failure classified as dependency error; patch candidate allowed.',
  policy_risk: 'Failure classified as policy risk; human escalation required.',
  unknown: 'Failure could not be classified safely; human escalation required.',
};

/** Build structured repair decision from failure signal. */
export function buildRepairDecision(signal: FailureSignal): RepairDecision {
  const failureClass = classifyFailure(signal);
  const strategy = selectRepairStrategy(failureClass);
  const reason = REASONS[failureClass];
  return { failureClass, strategy, reason };
}
