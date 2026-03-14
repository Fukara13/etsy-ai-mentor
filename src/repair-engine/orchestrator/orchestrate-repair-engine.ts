/**
 * RE-9: Public orchestrator. Connects repair-engine modules into one pipeline.
 * Pure, deterministic, no I/O, no mutation.
 */

import type { RepairEngineOrchestratorInput } from './repair-engine-orchestrator-input';
import type { RepairEngineOrchestratorResult } from './repair-engine-orchestrator-result';
import type { RepairEngineOrchestratorTraceEntry } from './repair-engine-orchestrator-trace-entry';
import type { OrchestratorStageName } from './orchestrator-stage-name';
import type { OrchestratorStatus } from './orchestrator-status';
import { runRepairEnginePipeline } from './run-repair-engine-pipeline';
import {
  resolveOrchestrationRoutingOutcome,
  type OrchestrationRoutingOutcome,
} from './resolve-orchestration-routing-outcome';

function addTraceEntry(
  stage: OrchestratorStageName,
  order: number,
  summary: string
): RepairEngineOrchestratorTraceEntry {
  return Object.freeze({ stage, order, summary });
}

function deriveStatus(routing: OrchestrationRoutingOutcome): OrchestratorStatus {
  if (routing.finalChannel === 'ESCALATION') return 'COMPLETED_WITH_ESCALATION';
  if (routing.finalChannel === 'OPERATOR_REVIEW') return 'COMPLETED_WITH_OPERATOR_REVIEW';
  return 'COMPLETED';
}

/**
 * Orchestrates the repair engine pipeline end-to-end.
 */
export function orchestrateRepairEngine(
  input: RepairEngineOrchestratorInput
): RepairEngineOrchestratorResult {
  const { event } = input;
  const trace: RepairEngineOrchestratorTraceEntry[] = [];

  trace.push(
    addTraceEntry('INPUT_ACCEPTED', 1, `Event accepted: ${event.type} ${event.subjectId}`)
  );

  const pipeline = runRepairEnginePipeline(event);

  trace.push(addTraceEntry('INTAKE_NORMALIZED', 2, 'Intake normalized'));
  trace.push(addTraceEntry('QUEUE_ENTRY_DERIVED', 3, `Queue entry: ${pipeline.queueEntry.entryId}`));
  trace.push(
    addTraceEntry('STRATEGY_SELECTED', 4, `${pipeline.strategy.length} strategy candidate(s)`)
  );
  trace.push(addTraceEntry('RUN_INITIALIZED', 5, `Run: ${pipeline.run.runId}`));
  trace.push(
    addTraceEntry(
      'STATE_RESOLVED',
      6,
      `${pipeline.stateEvaluation.currentState} -> ${pipeline.stateEvaluation.nextState}`
    )
  );
  trace.push(
    addTraceEntry('CONFIDENCE_EVALUATED', 7, `Confidence: ${pipeline.confidence.value}`)
  );
  trace.push(
    addTraceEntry('VERDICT_PRODUCED', 8, `Verdict: ${pipeline.verdict.verdict}`)
  );

  const routing = resolveOrchestrationRoutingOutcome(
    pipeline.verdict,
    pipeline.operatorDecision
  );

  trace.push(
    addTraceEntry('ROUTING_RESOLVED', 9, `${routing.finalChannel}: ${routing.reason}`)
  );

  const status = deriveStatus(routing);

  trace.push(
    addTraceEntry('ORCHESTRATION_COMPLETED', 10, `Status: ${status}`)
  );

  return Object.freeze({
    input,
    event,
    intake: pipeline.intake,
    queueEntry: pipeline.queueEntry,
    strategy: Object.freeze([...pipeline.strategy]),
    run: pipeline.run,
    state: pipeline.stateEvaluation,
    confidence: pipeline.confidence,
    verdict: pipeline.verdict,
    routing,
    status,
    trace: Object.freeze(trace),
  });
}
