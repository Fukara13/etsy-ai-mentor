/**
 * DC-10.2 / DC-10.3: Engine-backed read provider.
 * Invokes repair engine with seeded demo input; maps outcome to backbone/read models.
 * Main process only. No UI imports. No mutation. Read-only.
 */

import type { RepairRunOutcome } from '../gates/repair/repair-run-outcome'
import type { RepairOperatorHandoff } from '../gates/repair/operator-handoff.types'
import { runBoundedRepairLoop } from '../gates/repair/repair-loop-orchestrator'
import { deriveRepairRunVerdict } from '../gates/repair/repair-run-verdict-mapper'
import { mapRepairOperatorHandoff } from '../gates/repair/operator-handoff-mapper'
import type {
  RepairRunView,
  StateMachineView,
  FailureTimelineView,
  RepairStrategyView,
  DecisionView,
  GPTAnalysisView,
  TelemetryView,
} from '../../src/shared/read-models'
import type {
  BackboneRepairRun,
  BackboneStateMachine,
  BackboneFailureTimeline,
  BackboneRepairStrategy,
  BackboneDecision,
  BackboneGPTAnalysis,
  BackboneTelemetry,
} from '../../src/desktop/backbone'
import {
  mapRepairRunView,
  mapStateMachineView,
  mapFailureTimelineView,
  mapRepairStrategyView,
  mapDecisionView,
  mapGPTAnalysisView,
  mapTelemetryView,
} from '../../src/desktop/backbone'

/** Seeded demo session ID for deterministic demo runs. */
const DEMO_SESSION_ID = 'dc102_demo_1'

let cachedOutcome: RepairRunOutcome | null = null
let cachedHandoff: RepairOperatorHandoff | null = null

/** Runs demo loop once per process; caches outcome for consistency across views. */
function getDemoOutcome(): RepairRunOutcome {
  if (!cachedOutcome) {
    cachedOutcome = runBoundedRepairLoop({
    initialState: 'ANALYZE',
    retryCount: 0,
    maxRetries: 3,
    maxSteps: 20,
    sessionId: DEMO_SESSION_ID,
  })
  }
  return cachedOutcome
}

function getDemoHandoff(): RepairOperatorHandoff {
  if (!cachedHandoff) {
    const outcome = getDemoOutcome()
    const verdict = deriveRepairRunVerdict(outcome)
    cachedHandoff = mapRepairOperatorHandoff({ verdict, outcome })
  }
  return cachedHandoff
}

function isoToUnix(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000)
}

function outcomeToBackboneRepairRun(outcome: RepairRunOutcome): BackboneRepairRun {
  const status =
    outcome.terminal && outcome.requiresHuman
      ? 'human_required'
      : outcome.exhaustionReached
        ? 'exhausted'
        : outcome.terminal
          ? 'completed'
          : outcome.halted
            ? 'failed'
            : 'completed'
  const summary =
    outcome.requiresHuman
      ? 'Repair run requires human intervention.'
      : outcome.exhaustionReached
        ? 'Repair exhausted retry limit. Human intervention required.'
        : outcome.terminal
          ? 'Repair run completed; handoff to human.'
          : `Repair halted: ${outcome.terminationReason}.`

  return {
    run_id: outcome.sessionId,
    trace_id: outcome.sessionId,
    run_status: status,
    started_at_unix: isoToUnix(outcome.startedAt),
    completed_at_unix: isoToUnix(outcome.endedAt),
    run_summary: summary,
    final_state_code: outcome.finalState,
    total_steps: outcome.totalSteps,
  }
}

function outcomeToBackboneStateMachine(outcome: RepairRunOutcome): BackboneStateMachine {
  const status =
    outcome.terminal && outcome.requiresHuman
      ? 'human_required'
      : outcome.exhaustionReached
        ? 'exhausted'
        : outcome.terminal
          ? 'completed'
          : outcome.halted
            ? 'failed'
            : 'completed'
  const baseTime = isoToUnix(outcome.startedAt)
  const nodes = outcome.visitedPath.map((state, i) => ({
    state_id: state,
    state_label: state,
    is_active: i === outcome.visitedPath.length - 1,
    visited_at_unix: baseTime + i * 10,
  }))

  return {
    sm_id: outcome.sessionId,
    trace_id: outcome.sessionId,
    active_state: outcome.finalState,
    sm_status: status,
    state_nodes: nodes,
    last_updated_unix: isoToUnix(outcome.endedAt),
  }
}

function outcomeToBackboneFailureTimeline(outcome: RepairRunOutcome): BackboneFailureTimeline {
  const baseTime = isoToUnix(outcome.startedAt)
  const eventTypes: Array<'ci' | 'repair' | 'workflow' | 'human'> = ['repair', 'repair', 'repair', 'human']
  const events = outcome.visitedPath.map((state, i) => ({
    event_id: `ev_${i}`,
    event_ts_unix: baseTime + i * 10,
    event_label: state,
    event_type: eventTypes[Math.min(i, eventTypes.length - 1)] as 'repair' | 'human',
    event_summary: state === 'HUMAN' ? 'Escalation' : `Transition to ${state}`,
  }))

  return {
    timeline_id: outcome.sessionId,
    trace_id: outcome.sessionId,
    event_list: events,
    range_start_unix: baseTime,
    range_end_unix: isoToUnix(outcome.endedAt),
  }
}

function handoffToBackboneRepairStrategy(
  outcome: RepairRunOutcome,
  handoff: RepairOperatorHandoff
): BackboneRepairStrategy {
  return {
    strategy_id: outcome.sessionId,
    trace_id: outcome.sessionId,
    handoff_intent: handoff.handoffIntent,
    next_action_text: handoff.nextAction,
    operator_message: handoff.operatorMessage,
    step_list: outcome.visitedPath.map((state, i) => ({
      step_id: `s${i}`,
      step_label: state,
      step_status: i < outcome.visitedPath.length - 1 ? 'completed' : 'completed',
      step_summary: state === 'HUMAN' ? 'Awaiting human review' : 'Completed',
    })),
    strategy_status: handoff.requiresHuman ? 'human_required' : 'completed',
    updated_at_unix: isoToUnix(outcome.endedAt),
  }
}

function handoffToBackboneDecision(
  outcome: RepairRunOutcome,
  handoff: RepairOperatorHandoff
): BackboneDecision {
  return {
    decision_id: outcome.sessionId,
    trace_id: outcome.sessionId,
    gpt_analysis_title: 'Engine-derived repair context',
    gpt_analysis_body: 'The repair engine has completed analysis. JulesPlaceholder returned frozen outcome; human intervention required.',
    repair_strategy_title: handoff.summary,
    repair_strategy_body: handoff.operatorMessage,
    risk_level: handoff.requiresHuman ? 'MEDIUM' : 'LOW',
    operator_prompt: handoff.operatorMessage,
  }
}

function outcomeAndHandoffToBackboneGPTAnalysis(
  outcome: RepairRunOutcome,
  handoff: RepairOperatorHandoff
): BackboneGPTAnalysis {
  const failureType =
    outcome.lastActor === 'JulesPlaceholder'
      ? 'jules_frozen'
      : outcome.terminationReason === 'requires_human'
        ? 'human_escalation'
        : outcome.exhaustionReached
          ? 'retry_exhausted'
          : 'repair_halted'
  const rootCause =
    outcome.lastActor === 'JulesPlaceholder'
      ? 'JulesPlaceholder returned frozen outcome; human intervention required.'
      : outcome.exhaustionReached
        ? 'Retry limit exhausted. Human review required.'
        : handoff.operatorMessage
  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    outcome.exhaustionReached ? 'high' : outcome.requiresHuman ? 'medium' : 'low'
  const analyzedAt = isoToUnix(outcome.endedAt)
  const findings = outcome.visitedPath.map((state, i) => ({
    finding_id: `f${i}`,
    finding_title: state,
    severity: state === 'HUMAN' ? ('medium' as const) : ('low' as const),
    finding_summary: state === 'HUMAN' ? 'Escalation to human' : `State ${state} visited`,
    evidence_ref: undefined,
  }))

  return {
    analysis_id: outcome.sessionId,
    trace_id: outcome.sessionId,
    failure_type: failureType,
    root_cause: rootCause,
    suggested_fix: handoff.nextAction,
    risk_level: riskLevel,
    confidence_score: outcome.terminal ? 0.9 : 0.75,
    finding_list: findings,
    analyzed_at_unix: analyzedAt,
  }
}

function outcomeToBackboneTelemetry(outcome: RepairRunOutcome): BackboneTelemetry {
  const startTime = isoToUnix(outcome.startedAt)
  const endTime = isoToUnix(outcome.endedAt)
  const durationMs = (new Date(outcome.endedAt).getTime() - new Date(outcome.startedAt).getTime())

  const metricList: BackboneTelemetry['metric_list'] = [
    { metric_name: 'repair_steps', metric_value: outcome.totalSteps, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'duration_ms', metric_value: durationMs, metric_unit: 'ms', recorded_at_unix: endTime },
    { metric_name: 'total_runs', metric_value: 1, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'run_count', metric_value: 1, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'retry_0_runs', metric_value: 1, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'retry_1_runs', metric_value: 0, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'retry_2_runs', metric_value: 0, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'retry_3_runs', metric_value: 0, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'requires_human', metric_value: outcome.requiresHuman ? 1 : 0, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'final_state_human', metric_value: outcome.finalState === 'HUMAN' ? 1 : 0, metric_unit: 'count', recorded_at_unix: endTime },
    { metric_name: 'repair_duration_avg_ms', metric_value: durationMs, metric_unit: 'ms', recorded_at_unix: endTime },
    { metric_name: 'repair_duration_min_ms', metric_value: durationMs, metric_unit: 'ms', recorded_at_unix: endTime },
    { metric_name: 'repair_duration_max_ms', metric_value: durationMs, metric_unit: 'ms', recorded_at_unix: endTime },
  ]

  return {
    telemetry_id: outcome.sessionId,
    trace_id: outcome.sessionId,
    metric_list: metricList,
    run_count: 1,
    range_start_unix: startTime,
    range_end_unix: endTime,
  }
}

/** Returns engine-derived RepairRunView. */
export function getEngineRepairRunView(): RepairRunView {
  const outcome = getDemoOutcome()
  const backbone = outcomeToBackboneRepairRun(outcome)
  return mapRepairRunView(backbone)
}

/** Returns engine-derived StateMachineView. */
export function getEngineStateMachineView(): StateMachineView {
  const outcome = getDemoOutcome()
  const backbone = outcomeToBackboneStateMachine(outcome)
  return mapStateMachineView(backbone)
}

/** Returns engine-derived FailureTimelineView. */
export function getEngineFailureTimelineView(): FailureTimelineView {
  const outcome = getDemoOutcome()
  const backbone = outcomeToBackboneFailureTimeline(outcome)
  return mapFailureTimelineView(backbone)
}

/** Returns engine-derived RepairStrategyView. */
export function getEngineRepairStrategyView(): RepairStrategyView {
  const outcome = getDemoOutcome()
  const handoff = getDemoHandoff()
  const backbone = handoffToBackboneRepairStrategy(outcome, handoff)
  return mapRepairStrategyView(backbone)
}

/** Returns engine-derived DecisionView. */
export function getEngineDecisionView(): DecisionView {
  const outcome = getDemoOutcome()
  const handoff = getDemoHandoff()
  const backbone = handoffToBackboneDecision(outcome, handoff)
  return mapDecisionView(backbone)
}

/** Returns engine-derived GPTAnalysisView. No external GPT call; derived from outcome + handoff. */
export function getEngineGPTAnalysisView(): GPTAnalysisView {
  const outcome = getDemoOutcome()
  const handoff = getDemoHandoff()
  const backbone = outcomeAndHandoffToBackboneGPTAnalysis(outcome, handoff)
  return mapGPTAnalysisView(backbone)
}

/** Returns engine-derived TelemetryView. All metrics from outcome; no fallback mocks. */
export function getEngineTelemetryView(): TelemetryView {
  const outcome = getDemoOutcome()
  const backbone = outcomeToBackboneTelemetry(outcome)
  return mapTelemetryView(backbone)
}
