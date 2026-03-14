/**
 * RE-10: Maps RepairEngineOrchestratorResult to Electron-facing runtime result.
 * RE-11: Projects governance.
 * RE-12: Projects project-understanding. Projection only, no derivation.
 */

import type { GovernanceBoundOrchestratorResult } from '../../../src/repair-engine/governance-runtime';
import type { ProjectUnderstandingBoundResult } from '../../../src/repair-engine/project-understanding-runtime';
import type { RepairRunOutcome, TerminationReason } from '../../gates/repair/repair-run-outcome';
import type { RepairOperatorHandoff } from '../../gates/repair/operator-handoff.types';
import type { RepairState } from '../../gates/repair/repair-state';
import { deriveRepairRunVerdict } from '../../gates/repair/repair-run-verdict-mapper';
import { mapRepairOperatorHandoff } from '../../gates/repair/operator-handoff-mapper';

export type ElectronGovernanceProjection = {
  readonly decision: string;
  readonly executionAllowed: boolean;
  readonly requiresOperatorReview: boolean;
  readonly requiresEscalation: boolean;
};

export type ElectronProjectUnderstandingProjection = {
  readonly artifactStatus: string;
  readonly architecturalLayer: string | null;
  readonly moduleName: string | null;
  readonly moduleOwner: string | null;
  readonly moduleHotspotScore: number | null;
  readonly moduleRiskLevel: string | null;
  readonly dependencyBlastRadius: number | null;
  readonly summarySignals: readonly string[];
};

export type ElectronRepairBridgeResult = {
  readonly outcome: RepairRunOutcome;
  readonly handoff: RepairOperatorHandoff;
  readonly status: string;
  readonly requiresOperatorReview: boolean;
  readonly isEscalated: boolean;
  readonly routingSummary: string;
  readonly traceStageCount: number;
  readonly governance: ElectronGovernanceProjection;
  readonly projectUnderstanding: ElectronProjectUnderstandingProjection;
};

function routingToFinalState(routing: RepairEngineOrchestratorResult['routing']): RepairState {
  if (routing.finalChannel === 'ESCALATION') return 'EXHAUSTED';
  return 'HUMAN';
}

function routingToTerminationReason(routing: RepairEngineOrchestratorResult['routing']): TerminationReason {
  if (routing.finalChannel === 'ESCALATION') return 'exhaustion_escalation';
  if (routing.finalChannel === 'OPERATOR_REVIEW') return 'requires_human';
  return 'terminal_state';
}

/**
 * Maps governance- and project-understanding-bound result to Electron runtime result.
 */
export function mapOrchestratorResultToElectronResult(
  result: ProjectUnderstandingBoundResult
): ElectronRepairBridgeResult {
  const { run, routing, status, trace } = result;
  const finalState = routingToFinalState(routing);
  const terminationReason = routingToTerminationReason(routing);

  const outcome: RepairRunOutcome = Object.freeze({
    sessionId: result.event.subjectId,
    initialState: 'ANALYZE',
    finalState,
    totalSteps: trace.length,
    visitedPath: Object.freeze(['ANALYZE', finalState]),
    halted: false,
    terminal: true,
    requiresHuman: routing.requiresOperatorReview || routing.isEscalated,
    exhaustionReached: routing.finalChannel === 'ESCALATION',
    terminationReason,
    lastTransitionEvent: 'ORCHESTRATION_COMPLETED',
    lastActor: 'RepairEngineOrchestrator',
    startedAt: run.startedAt,
    endedAt: run.lastUpdatedAt,
  });

  const verdict = deriveRepairRunVerdict(outcome);
  const handoff = mapRepairOperatorHandoff({ verdict, outcome });

  const governance: ElectronGovernanceProjection = Object.freeze({
    decision: result.governance.decision,
    executionAllowed: result.governance.executionAllowed,
    requiresOperatorReview: result.governance.requiresOperatorReview,
    requiresEscalation: result.governance.requiresEscalation,
  });

  const pu = result.projectUnderstanding;
  const projectUnderstanding: ElectronProjectUnderstandingProjection = Object.freeze({
    artifactStatus: pu.artifactStatus,
    architecturalLayer: pu.architecturalLayer,
    moduleName: pu.moduleName,
    moduleOwner: pu.moduleOwner,
    moduleHotspotScore: pu.moduleHotspotScore,
    moduleRiskLevel: pu.moduleRiskLevel,
    dependencyBlastRadius: pu.dependencyBlastRadius,
    summarySignals: pu.summarySignals,
  });

  return Object.freeze({
    outcome,
    handoff,
    status,
    requiresOperatorReview: routing.requiresOperatorReview,
    isEscalated: routing.isEscalated,
    routingSummary: `${routing.finalChannel}: ${routing.reason}`,
    traceStageCount: trace.length,
    governance,
    projectUnderstanding,
  });
}
