/**
 * DC-4: Map backbone raw data to DC-3 read models.
 * Deterministic and side-effect free.
 */

import type { ViewStatus } from '../../shared/read-models'
import type {
  RepairRunView,
  StateMachineView,
  FailureTimelineView,
  GPTAnalysisView,
  RepairStrategyView,
  TelemetryView,
  DecisionView,
} from '../../shared/read-models'
import type {
  BackboneRepairRun,
  BackboneStateMachine,
  BackboneFailureTimeline,
  BackboneGPTAnalysis,
  BackboneRepairStrategy,
  BackboneTelemetry,
  BackboneDecision,
} from './backbone-read.types'

const STATUS_MAP: Record<string, ViewStatus> = {
  idle: 'idle',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
  exhausted: 'exhausted',
  human_required: 'human_required',
}

function toViewStatus(s: string): ViewStatus {
  return STATUS_MAP[s] ?? 'idle'
}

export function mapRepairRunView(raw: BackboneRepairRun): RepairRunView {
  return {
    id: raw.run_id,
    traceId: raw.trace_id,
    status: toViewStatus(raw.run_status),
    startedAt: raw.started_at_unix,
    completedAt: raw.completed_at_unix,
    summary: raw.run_summary,
    finalState: raw.final_state_code,
    stepCount: raw.total_steps,
  }
}

export function mapStateMachineView(raw: BackboneStateMachine): StateMachineView {
  return {
    id: raw.sm_id,
    traceId: raw.trace_id,
    currentState: raw.active_state,
    status: toViewStatus(raw.sm_status),
    nodes: raw.state_nodes.map((n) => ({
      id: n.state_id,
      label: n.state_label,
      isCurrent: n.is_active,
      visitedAt: n.visited_at_unix,
    })),
    updatedAt: raw.last_updated_unix,
  }
}

export function mapFailureTimelineView(raw: BackboneFailureTimeline): FailureTimelineView {
  return {
    id: raw.timeline_id,
    traceId: raw.trace_id,
    events: raw.event_list.map((e) => ({
      id: e.event_id,
      timestamp: e.event_ts_unix,
      label: e.event_label,
      type: e.event_type,
      summary: e.event_summary,
    })),
    fromTime: raw.range_start_unix,
    toTime: raw.range_end_unix,
  }
}

export function mapGPTAnalysisView(raw: BackboneGPTAnalysis): GPTAnalysisView {
  return {
    id: raw.analysis_id,
    traceId: raw.trace_id,
    failureType: raw.failure_type,
    rootCause: raw.root_cause,
    suggestedFix: raw.suggested_fix,
    risk: raw.risk_level,
    confidence: raw.confidence_score,
    findings: raw.finding_list.map((f) => ({
      id: f.finding_id,
      title: f.finding_title,
      severity: f.severity,
      summary: f.finding_summary,
      evidence: f.evidence_ref,
    })),
    analyzedAt: raw.analyzed_at_unix,
  }
}

export function mapRepairStrategyView(raw: BackboneRepairStrategy): RepairStrategyView {
  return {
    id: raw.strategy_id,
    traceId: raw.trace_id,
    handoffIntent: raw.handoff_intent,
    nextAction: raw.next_action_text,
    operatorMessage: raw.operator_message,
    steps: raw.step_list.map((s) => ({
      id: s.step_id,
      label: s.step_label,
      status: toViewStatus(s.step_status),
      summary: s.step_summary,
    })),
    status: toViewStatus(raw.strategy_status),
    updatedAt: raw.updated_at_unix,
  }
}

export function mapTelemetryView(raw: BackboneTelemetry): TelemetryView {
  return {
    id: raw.telemetry_id,
    traceId: raw.trace_id,
    metrics: raw.metric_list.map((m) => ({
      name: m.metric_name,
      value: m.metric_value,
      unit: m.metric_unit,
      timestamp: m.recorded_at_unix,
    })),
    runCount: raw.run_count,
    fromTime: raw.range_start_unix,
    toTime: raw.range_end_unix,
  }
}

export function mapDecisionView(raw: BackboneDecision): DecisionView {
  return {
    id: raw.decision_id,
    traceId: raw.trace_id,
    gptAnalysisTitle: raw.gpt_analysis_title,
    gptAnalysisBody: raw.gpt_analysis_body,
    repairStrategyTitle: raw.repair_strategy_title,
    repairStrategyBody: raw.repair_strategy_body,
    riskLevel: raw.risk_level,
    operatorPrompt: raw.operator_prompt,
  }
}
