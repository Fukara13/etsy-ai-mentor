/**
 * Gate-S19: Pure state transition. No side effects, no actors.
 */

import type { RepairState } from './repair-state';
import type { RepairEvent } from './repair-event';

/** transition(currentState, event) => nextState. Invalid transitions -> HUMAN. */
export function transition(
  currentState: RepairState,
  event: RepairEvent
): RepairState {
  const escalate = (): RepairState => 'HUMAN';

  switch (currentState) {
    case 'IDLE':
      return event === 'CI_FAILURE_START' ? 'ANALYZE' : escalate();

    case 'ANALYZE':
      if (event === 'ANALYSIS_COMPLETED') return 'COACH';
      if (event === 'HUMAN_ESCALATION' || event === 'PLAN_REQUIRES_HUMAN') return 'HUMAN';
      return escalate();

    case 'COACH':
      if (event === 'COACH_COMPLETED') return 'JULES_PENDING';
      if (event === 'HUMAN_ESCALATION' || event === 'PLAN_REQUIRES_HUMAN') return 'HUMAN';
      return escalate();

    case 'JULES_PENDING':
      if (event === 'JULES_FROZEN_OUTCOME') return 'HUMAN';
      if (event === 'JULES_PATCH_PRODUCED') return 'GUARDIAN_CHECK';
      if (event === 'HUMAN_ESCALATION' || event === 'PLAN_REQUIRES_HUMAN') return 'HUMAN';
      return escalate();

    case 'GUARDIAN_CHECK':
      if (event === 'GUARDIAN_COMPLETED') return 'EVALUATOR_CHECK';
      if (event === 'HUMAN_ESCALATION' || event === 'PLAN_REQUIRES_HUMAN') return 'HUMAN';
      return escalate();

    case 'EVALUATOR_CHECK':
      if (event === 'EVALUATOR_PASSED') return 'HUMAN';
      if (event === 'EVALUATOR_FAILED') return 'CI_RETRY';
      if (event === 'RETRY_LIMIT_REACHED') return 'EXHAUSTED';
      if (event === 'HUMAN_ESCALATION' || event === 'PLAN_REQUIRES_HUMAN') return 'HUMAN';
      return escalate();

    case 'CI_RETRY':
      if (event === 'CI_RETRY_COMPLETED') return 'ANALYZE';
      if (event === 'RETRY_LIMIT_REACHED') return 'EXHAUSTED';
      if (event === 'HUMAN_ESCALATION' || event === 'PLAN_REQUIRES_HUMAN') return 'HUMAN';
      return escalate();

    case 'EXHAUSTED':
      return event === 'HUMAN_ESCALATION' ? 'HUMAN' : 'EXHAUSTED';

    case 'HUMAN':
      return 'HUMAN';

    default: {
      const _: never = currentState;
      return escalate();
    }
  }
}
