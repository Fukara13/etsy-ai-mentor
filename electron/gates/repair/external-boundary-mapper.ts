/**
 * Gate-S26: External boundary mapper — Pure projection from handoff to transport-ready format.
 */

import type { RepairOperatorHandoff } from './operator-handoff.types';
import type { RepairRunOutcome } from './repair-run-outcome';
import type {
  RepairExternalProjection,
  ProjectionTarget,
  ProjectionStatus,
  RecommendedAction,
} from './external-boundary.types';

export type MapRepairExternalProjectionParams = {
  readonly handoff: RepairOperatorHandoff;
  readonly outcome?: RepairRunOutcome;
};

function projectionTarget(handoff: RepairOperatorHandoff): ProjectionTarget {
  if (handoff.requiresHuman) return 'human';
  return 'operator';
}

function projectionStatus(handoff: RepairOperatorHandoff): ProjectionStatus {
  return handoff.status;
}

function recommendedAction(handoff: RepairOperatorHandoff): RecommendedAction {
  return handoff.nextAction;
}

export function mapRepairExternalProjection(
  params: MapRepairExternalProjectionParams
): RepairExternalProjection {
  const { handoff, outcome } = params;

  const metadata =
    outcome != null
      ? { sessionId: outcome.sessionId, totalSteps: outcome.totalSteps }
      : undefined;

  return {
    projectionTarget: projectionTarget(handoff),
    projectionStatus: projectionStatus(handoff),
    projectionMessage: handoff.operatorMessage,
    recommendedAction: recommendedAction(handoff),
    requiresHuman: handoff.requiresHuman,
    safeToRetry: handoff.safeToRetry,
    safeToClose: handoff.safeToClose,
    finalState: handoff.finalState,
    reasonCode: handoff.reasonCode,
    summary: handoff.summary,
    metadata,
  };
}
