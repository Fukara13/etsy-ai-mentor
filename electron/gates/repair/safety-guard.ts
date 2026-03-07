/**
 * Gate-S20: Safety Guard Layer. Read-only policy evaluation.
 * Does not mutate plans. Does not execute. Fails safe.
 */

import type { ActionPlan } from './action-plan';
import type { PlanGovernanceResult } from './plan-governor';
import type { GuardDecision, GuardOutcome, GuardReasonCode } from './guard-decision';
import {
  isForbiddenAction,
  isAllowedAction,
  isTerminalState,
  DEFAULT_MAX_RETRIES,
} from './safety-policy';

export type SafetyEvaluationInput = {
  readonly currentState: string;
  readonly governanceOutcome: PlanGovernanceResult;
  readonly retryCount: number;
  readonly maxRetries?: number;
  readonly plan: ActionPlan;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

function decision(
  outcome: GuardOutcome,
  reasonCode: GuardReasonCode,
  details: string
): GuardDecision {
  return { outcome, reasonCode, details };
}

function getPlanActions(plan: ActionPlan): string[] {
  if (!plan?.items || !Array.isArray(plan.items)) return [];
  return plan.items.map((i) => String((i as { action?: string }).action ?? ''));
}

/** Evaluate whether a validated and governed plan is safe to execute. */
export function evaluateSafety(input: SafetyEvaluationInput): GuardDecision {
  const { currentState, governanceOutcome, plan, retryCount } = input;
  const maxRetries = input.maxRetries ?? DEFAULT_MAX_RETRIES;
  const actions = getPlanActions(plan);

  if (actions.length === 0) {
    return decision('require_human', 'unknown_risk', 'Empty plan');
  }

  for (const action of actions) {
    if (isForbiddenAction(action)) {
      return decision('block', 'forbidden_privilege', `Forbidden action: ${action}`);
    }
    if (!isAllowedAction(action)) {
      return decision('block', 'unknown_action', `Unknown action: ${action}`);
    }
  }

  if (governanceOutcome.verdict !== 'allow') {
    return decision('block', 'governance_conflict', 'Governance requires human');
  }

  if (isTerminalState(currentState) && actions.includes('retry_ci')) {
    return decision('block', 'terminal_state_protection', 'Retry not allowed in terminal state');
  }

  if (actions.includes('retry_ci') && retryCount >= maxRetries) {
    return decision('require_human', 'retry_limit_reached', 'Retry limit reached');
  }

  return decision('allow', 'safe_to_execute', 'Plan is safe to execute');
}
