/**
 * Gate-S13: Controlled Execution Boundary
 * Policy-gated conversion: Action Plan → Executable Steps.
 * Validates and translates; does not plan.
 */

import type { ActionPlan, ActionPlanItemS13 } from './action-plan';
import type { ExecutableStep } from './executable-step';

export type ExecutionBoundaryStatus = 'allowed' | 'rejected';

export type ExecutionBoundaryResult = {
  readonly status: ExecutionBoundaryStatus;
  readonly executableSteps?: readonly ExecutableStep[];
  readonly reason?: string;
};

const REJECT_HUMAN_INTERVENTION =
  'request_human_intervention must not become automated; human handoff required';
const REJECT_UNKNOWN = 'Unknown or forbidden action type';

/**
 * Convert Action Plan to Executable Steps. Only allowed actions become steps.
 * request_human_intervention is explicitly rejected (never automated).
 */
export function toExecutableSteps(plan: ActionPlan): ExecutionBoundaryResult {
  if (!plan || !Array.isArray(plan.items)) {
    return { status: 'rejected', reason: 'Invalid action plan' };
  }

  const steps: ExecutableStep[] = [];

  for (const item of plan.items as ActionPlanItemS13[]) {
    const result = mapItem(item);
    if (result.status === 'rejected') return result;
    if (result.step) steps.push(result.step);
  }

  return { status: 'allowed', executableSteps: steps };
}

type MapResult =
  | { status: 'allowed'; step?: ExecutableStep }
  | { status: 'rejected'; reason: string };

function mapItem(item: ActionPlanItemS13): MapResult {
  switch (item.action) {
    case 'retry_ci': {
      const step: ExecutableStep = {
        kind: 'dispatch_workflow',
        workflow: 'retry_ci',
        payload: item.metadata
          ? {
              prNumber:
                typeof item.metadata.prNumber === 'number' ? item.metadata.prNumber : undefined,
              correlationId:
                typeof item.metadata.correlationId === 'string'
                  ? item.metadata.correlationId
                  : undefined,
            }
          : undefined,
      };
      return { status: 'allowed', step };
    }
    case 'noop':
      return { status: 'allowed' };
    case 'request_human_intervention':
      return { status: 'rejected', reason: REJECT_HUMAN_INTERVENTION };
    default:
      return {
        status: 'rejected',
        reason: `${REJECT_UNKNOWN}: ${String((item as { action?: unknown }).action)}`,
      };
  }
}
