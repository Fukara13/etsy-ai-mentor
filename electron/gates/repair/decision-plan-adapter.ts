/**
 * Gate-S16: Decision Plan Adapter
 * Connects S15 repair decision to S13 action plan. Pure, deterministic.
 * No execution, no workflow calls, no authority expansion.
 */

import type { RepairDecision } from './repair-decision';
import type { ActionPlan, ActionPlanItemS13 } from './action-plan';

/** Map repair decision strategy to S13-compatible action plan. */
export function decisionToActionPlan(decision: RepairDecision): ActionPlan {
  if (!decision || typeof decision !== 'object') {
    return { items: [{ action: 'request_human_intervention', reason: 'Invalid decision input' }] };
  }

  const items = mapStrategyToItems(decision);
  return { items };
}

function mapStrategyToItems(decision: RepairDecision): readonly ActionPlanItemS13[] {
  switch (decision.strategy) {
    case 'retry':
      return [{ action: 'retry_ci', reason: decision.reason }];
    case 'human_escalation':
      return [{ action: 'request_human_intervention', reason: decision.reason }];
    case 'patch_candidate':
      return [{ action: 'request_human_intervention', reason: decision.reason }];
    case 'noop':
      return [{ action: 'noop' }];
    default: {
      const _exhaustive: never = decision.strategy;
      return [{ action: 'request_human_intervention', reason: 'Unknown strategy; human escalation required.' }];
    }
  }
}
