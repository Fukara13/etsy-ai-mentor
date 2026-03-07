/**
 * Gate-S17: Plan Validation Layer
 * Structural validation only. No risk/cost/policy scoring.
 */

import type { ActionPlan } from './action-plan';

const ALLOWED_ACTIONS = new Set(['retry_ci', 'request_human_intervention', 'noop'] as const);

export type PlanValidationResult = {
  readonly valid: boolean;
  readonly reason?: string;
};

/** Validate action plan. Structural checks only. */
export function validateActionPlan(plan: ActionPlan): PlanValidationResult {
  if (!plan || typeof plan !== 'object') {
    return { valid: false, reason: 'Plan is null or not an object' };
  }
  if (!Array.isArray(plan.items) || plan.items.length === 0) {
    return { valid: false, reason: 'Plan items is empty or not an array' };
  }

  const seen = new Set<string>();
  for (const item of plan.items) {
    const action = (item as { action?: string })?.action;
    if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action as 'retry_ci' | 'request_human_intervention' | 'noop')) {
      return { valid: false, reason: `Unknown or disallowed action: ${String(action)}` };
    }
    if (seen.has(action)) {
      return { valid: false, reason: `Duplicate action: ${action}` };
    }
    seen.add(action);
  }

  return { valid: true };
}
