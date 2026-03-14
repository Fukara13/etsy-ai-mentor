/**
 * RE-9: Derives final routing channel from verdict and operator decision.
 * Pure, deterministic.
 */

import type { RepairVerdictResult } from '../contracts/repair-verdict-result';
import type { RepairOperatorDecision } from '../routing/repair-operator-decision';

export type OrchestrationRoutingOutcome = {
  readonly requiresOperatorReview: boolean;
  readonly isEscalated: boolean;
  readonly isRoutable: boolean;
  readonly finalChannel: 'CONTINUE' | 'OPERATOR_REVIEW' | 'ESCALATION';
  readonly reason: string;
};

const ESCALATION_VERDICTS = ['escalate', 'blocked'] as const;
const OPERATOR_REVIEW_VERDICTS = [
  'strategy_ready',
  'manual_investigation',
  'blocked',
  'insufficient_signal',
] as const;

function requiresOperatorReviewFromVerdict(verdict: string): boolean {
  return (OPERATOR_REVIEW_VERDICTS as readonly string[]).includes(verdict);
}

function isEscalatedFromDecision(verdict: string, decision: RepairOperatorDecision): boolean {
  if (verdict === 'escalate') return true;
  const hasEscalationAction = decision.actions.some(
    (a) => a.actionType === 'escalate_to_human' && a.recommended
  );
  return verdict === 'blocked' && hasEscalationAction;
}

/**
 * Resolves the final human/operator path from verdict result and operator decision.
 */
export function resolveOrchestrationRoutingOutcome(
  verdictResult: RepairVerdictResult,
  operatorDecision: RepairOperatorDecision
): OrchestrationRoutingOutcome {
  const { verdict } = verdictResult;
  const requiresOperatorReview = requiresOperatorReviewFromVerdict(verdict);
  const isEscalated = isEscalatedFromDecision(verdict, operatorDecision);

  let finalChannel: OrchestrationRoutingOutcome['finalChannel'];
  let reason: string;

  if (isEscalated) {
    finalChannel = 'ESCALATION';
    reason = 'Escalation required';
  } else if (requiresOperatorReview) {
    finalChannel = 'OPERATOR_REVIEW';
    reason = 'Operator review required';
  } else {
    finalChannel = 'CONTINUE';
    reason = 'No operator intervention required';
  }

  const isRoutable = finalChannel === 'CONTINUE';

  return {
    requiresOperatorReview,
    isEscalated,
    isRoutable,
    finalChannel,
    reason,
  };
}
