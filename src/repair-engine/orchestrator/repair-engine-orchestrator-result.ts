/**
 * RE-9: Machine-readable orchestration result.
 */

import type { RepairEngineEvent } from '../contracts/repair-engine-event';
import type { RepairEngineEventIntakeResult } from '../contracts/repair-engine-event-intake-result';
import type { RepairQueueEntry } from '../queue-entry/repair-queue-entry';
import type { RepairStrategyCandidate } from '../contracts/repair-strategy-candidate';
import type { RepairRun } from '../run/repair-run';
import type { RepairRunLifecycleState } from '../run/repair-run-lifecycle';
import type { RepairEngineEvaluation } from '../contracts/repair-engine-evaluation';
import type { ConfidenceScore } from '../contracts/confidence';
import type { RepairVerdictResult } from '../contracts/repair-verdict-result';
import type { RepairOperatorDecision } from '../routing/repair-operator-decision';
import type { OrchestrationRoutingOutcome } from './resolve-orchestration-routing-outcome';
import type { OrchestratorStatus } from './orchestrator-status';
import type { RepairEngineOrchestratorTraceEntry } from './repair-engine-orchestrator-trace-entry';
import type { RepairEngineOrchestratorInput } from './repair-engine-orchestrator-input';

export type RepairEngineOrchestratorResult = {
  readonly input: RepairEngineOrchestratorInput;
  readonly event: RepairEngineEvent;
  readonly intake: RepairEngineEventIntakeResult;
  readonly queueEntry: RepairQueueEntry;
  readonly strategy: readonly RepairStrategyCandidate[];
  readonly run: RepairRun;
  readonly state: RepairEngineEvaluation;
  readonly confidence: ConfidenceScore;
  readonly verdict: RepairVerdictResult;
  readonly routing: OrchestrationRoutingOutcome;
  readonly status: OrchestratorStatus;
  readonly trace: readonly RepairEngineOrchestratorTraceEntry[];
};
