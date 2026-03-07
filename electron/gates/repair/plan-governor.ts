/**
 * Gate-S18: Plan Governance Layer
 * Evaluates validated plans. Does not mutate. Fail-safe to human.
 */

import type { ActionPlan } from './action-plan';

export type GovernanceVerdict = 'allow' | 'require_human';

export type GovernanceReason =
  | 'safe_retry'
  | 'manual_only'
  | 'unknown_risk';

export type PlanGovernanceResult = {
  readonly verdict: GovernanceVerdict;
  readonly reason: GovernanceReason;
};

/** Governor expects validated plan. Does not re-validate. */
export function governActionPlan(plan: ActionPlan): PlanGovernanceResult {
  const actions = plan.items.map((i) => (i as { action: string }).action);

  if (actions.length === 0) {
    return { verdict: 'require_human', reason: 'unknown_risk' };
  }

  const hasRetry = actions.includes('retry_ci');
  const hasHuman = actions.includes('request_human_intervention');
  const hasNoop = actions.includes('noop');

  if (actions.length === 1 && hasRetry) {
    return { verdict: 'allow', reason: 'safe_retry' };
  }

  if (hasHuman) {
    return { verdict: 'require_human', reason: 'manual_only' };
  }

  if (actions.length === 1 && hasNoop) {
    return { verdict: 'require_human', reason: 'unknown_risk' };
  }

  return { verdict: 'require_human', reason: 'unknown_risk' };
}
