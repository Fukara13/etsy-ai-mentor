/**
 * RE-9: Internal pure pipeline runner. Calls existing modules in order.
 * No I/O, no mutation, no new decision engines.
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
import type { RepairLifecycleState } from '../contracts/repair-lifecycle-state';

import { RepairEngineEventIntake } from '../intake/repair-engine-event-intake';
import { selectRepairStrategyCandidates } from '../strategy/repair-strategy-selector';
import { buildRepairRun } from '../run/repair-run-builder';
import { deriveRepairRunLifecycleState } from '../run/repair-run-lifecycle';
import { RepairStateMachine } from '../state-machine/repair-state-machine';
import { deriveConfidenceFromSignals } from '../confidence/derive-confidence-from-signals';
import { evaluateRepairItemForVerdict } from '../verdict/repair-verdict-engine';
import { RepairVerdictRouter } from '../routing/repair-verdict-router';
import type { RepairItem } from '../queue/repair-item';
import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentTimelineEntry } from '../timeline/incident-timeline-entry';

const EPOCH_ISO = '2000-01-01T00:00:00.000Z';

function eventToIntakeInput(event: RepairEngineEvent): Parameters<RepairEngineEventIntake['intake']>[0] {
  return {
    type: event.type,
    subjectId: event.subjectId,
    summary: event.summary,
    attemptCount: event.attemptCount,
    source: event.source,
    metadata: event.metadata ? { ...event.metadata } : undefined,
  };
}

function eventToQueueEntry(event: RepairEngineEvent): RepairQueueEntry {
  const entryId = `re:${event.subjectId}:${event.type}`;
  return Object.freeze({
    entryId,
    source: 'GITHUB' as const,
    status: 'PENDING' as const,
    externalEventId: event.subjectId,
    subjectId: event.subjectId,
    trigger: event.type,
    summary: event.summary,
    createdFromReason: event.summary,
    riskFlag: false,
    metadata: Object.freeze({
      sourceEventType: event.type,
      sourceEventSource: event.source,
    }),
  });
}

function buildMinimalTimeline(event: RepairEngineEvent): IncidentTimeline {
  const incidentId = event.subjectId;
  const correlationId = event.subjectId;
  const entry: IncidentTimelineEntry = Object.freeze({
    incidentId,
    correlationId,
    timestamp: EPOCH_ISO,
    entryType: 'operator_decision',
    summary: event.summary,
    notes: [],
    sourceEventId: event.subjectId,
    operatorId: 'orchestrator',
  });
  return Object.freeze({
    incidentId,
    correlationId,
    startedAt: EPOCH_ISO,
    lastUpdatedAt: EPOCH_ISO,
    status: 'open',
    entries: Object.freeze([entry]),
  });
}

function deriveNextState(current: RepairLifecycleState): RepairLifecycleState {
  if (current === 'FAILURE_DETECTED') return 'ANALYZING';
  if (current === 'ANALYZING') return 'STRATEGY_READY';
  return 'STRATEGY_READY';
}

export type PipelineOutput = {
  intake: RepairEngineEventIntakeResult;
  queueEntry: RepairQueueEntry;
  strategy: readonly RepairStrategyCandidate[];
  run: RepairRun;
  lifecycleState: RepairRunLifecycleState;
  stateEvaluation: RepairEngineEvaluation;
  confidence: ConfidenceScore;
  verdict: RepairVerdictResult;
  operatorDecision: RepairOperatorDecision;
};

/**
 * Runs the repair engine pipeline. Pure, deterministic.
 * Assumes intake accepts (input.event is pre-validated).
 */
export function runRepairEnginePipeline(event: RepairEngineEvent): PipelineOutput {
  const intake = new RepairEngineEventIntake();
  const intakeInput = eventToIntakeInput(event);
  const intakeResult = intake.intake(intakeInput);

  if (!intakeResult.accepted || !intakeResult.normalizedEvent) {
    throw new Error(
      `Orchestrator requires accepted intake; got: ${intakeResult.reasonCodes.join(', ')}`
    );
  }

  const queueEntry = eventToQueueEntry(event);
  const strategy = selectRepairStrategyCandidates(event);
  const timeline = buildMinimalTimeline(event);
  const run = buildRepairRun(timeline);
  const lifecycleState = deriveRepairRunLifecycleState(run);

  const stateMachine = new RepairStateMachine();
  const currentState = intakeResult.recommendedInitialState;
  const nextState = deriveNextState(currentState);
  const stateEvaluation = stateMachine.evaluate({
    currentState,
    nextState,
    attemptCount: event.attemptCount,
  });

  const confidence = deriveConfidenceFromSignals({
    strategyOutcome: 'SUCCEEDED',
    eventLog: { entries: [] },
  });

  const item: RepairItem = Object.freeze({
    id: queueEntry.entryId,
    eventType: event.type,
    normalizedEvent: event,
    strategyCandidates: strategy,
    lifecycleState: currentState,
    status: 'processing',
    createdAt: EPOCH_ISO,
    updatedAt: EPOCH_ISO,
  });

  const verdict = evaluateRepairItemForVerdict({ item });
  const router = new RepairVerdictRouter();
  const operatorDecision = router.route(verdict);

  return {
    intake: intakeResult,
    queueEntry,
    strategy,
    run,
    lifecycleState,
    stateEvaluation,
    confidence,
    verdict,
    operatorDecision,
  };
}
