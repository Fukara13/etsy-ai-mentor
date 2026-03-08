/**
 * DC-4: Raw backbone data shapes.
 * These represent incoming data from backbone sources.
 * They must NOT match DC-3 read-model contracts directly.
 */

export type BackboneRepairRun = {
  run_id: string
  trace_id: string
  run_status: string
  started_at_unix: number
  completed_at_unix?: number
  run_summary: string
  final_state_code?: string
  total_steps?: number
}

export type BackboneStateMachine = {
  sm_id: string
  trace_id: string
  active_state: string
  sm_status: string
  state_nodes: Array<{
    state_id: string
    state_label: string
    is_active: boolean
    visited_at_unix?: number
  }>
  last_updated_unix: number
}

export type BackboneFailureTimeline = {
  timeline_id: string
  trace_id: string
  event_list: Array<{
    event_id: string
    event_ts_unix: number
    event_label: string
    event_type: 'repair' | 'ci' | 'workflow' | 'human'
    event_summary?: string
  }>
  range_start_unix: number
  range_end_unix: number
}

export type BackboneGPTAnalysis = {
  analysis_id: string
  trace_id: string
  failure_type: string
  root_cause: string
  suggested_fix: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  confidence_score: number
  finding_list: Array<{
    finding_id: string
    finding_title: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    finding_summary: string
    evidence_ref?: string
  }>
  analyzed_at_unix: number
}

export type BackboneRepairStrategy = {
  strategy_id: string
  trace_id: string
  handoff_intent: string
  next_action_text: string
  operator_message: string
  step_list: Array<{
    step_id: string
    step_label: string
    step_status: string
    step_summary?: string
  }>
  strategy_status: string
  updated_at_unix: number
}

export type BackboneTelemetry = {
  telemetry_id: string
  trace_id: string
  metric_list: Array<{
    metric_name: string
    metric_value: number
    metric_unit?: string
    recorded_at_unix: number
  }>
  run_count: number
  range_start_unix: number
  range_end_unix: number
}
