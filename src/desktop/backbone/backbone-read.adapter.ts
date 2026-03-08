/**
 * DC-4: Read-only adapter for backbone data retrieval.
 * Uses mock data initially. No GitHub or external system connection.
 * Does not mutate any external system.
 */

import type {
  BackboneRepairRun,
  BackboneStateMachine,
  BackboneFailureTimeline,
  BackboneGPTAnalysis,
  BackboneRepairStrategy,
  BackboneTelemetry,
} from './backbone-read.types'

export interface BackboneReadAdapter {
  getRepairRun(): Promise<BackboneRepairRun | null>
  getStateMachine(): Promise<BackboneStateMachine | null>
  getFailureTimeline(): Promise<BackboneFailureTimeline | null>
  getGPTAnalysis(): Promise<BackboneGPTAnalysis | null>
  getRepairStrategy(): Promise<BackboneRepairStrategy | null>
  getTelemetry(): Promise<BackboneTelemetry | null>
}

const mockBackboneRepairRun: BackboneRepairRun = {
  run_id: 'run_bb_1',
  trace_id: 'trace_bb_1',
  run_status: 'completed',
  started_at_unix: 1709900000,
  completed_at_unix: 1709900060,
  run_summary: 'Repair run completed; handoff to human.',
  final_state_code: 'HUMAN',
  total_steps: 5,
}

const mockBackboneStateMachine: BackboneStateMachine = {
  sm_id: 'sm_bb_1',
  trace_id: 'trace_bb_1',
  active_state: 'HUMAN',
  sm_status: 'completed',
  state_nodes: [
    { state_id: 'IDLE', state_label: 'IDLE', is_active: false, visited_at_unix: 1709900000 },
    { state_id: 'ANALYZE', state_label: 'ANALYZE', is_active: false, visited_at_unix: 1709900010 },
    { state_id: 'COACH', state_label: 'COACH', is_active: false, visited_at_unix: 1709900020 },
    { state_id: 'HUMAN', state_label: 'HUMAN', is_active: true, visited_at_unix: 1709900060 },
  ],
  last_updated_unix: 1709900060,
}

const mockBackboneFailureTimeline: BackboneFailureTimeline = {
  timeline_id: 'tl_bb_1',
  trace_id: 'trace_bb_1',
  event_list: [
    { event_id: 'ev1', event_ts_unix: 1709900000, event_label: 'CI Failed', event_type: 'ci', event_summary: 'Build failed' },
    { event_id: 'ev2', event_ts_unix: 1709900010, event_label: 'Analyze', event_type: 'repair', event_summary: 'Analysis started' },
    { event_id: 'ev3', event_ts_unix: 1709900060, event_label: 'Human Required', event_type: 'human', event_summary: 'Escalation' },
  ],
  range_start_unix: 1709900000,
  range_end_unix: 1709900060,
}

const mockBackboneGPTAnalysis: BackboneGPTAnalysis = {
  analysis_id: 'gpt_bb_1',
  trace_id: 'trace_bb_1',
  failure_type: 'test_failure',
  root_cause: 'Flaky test timeout',
  suggested_fix: 'Increase timeout or fix test',
  risk_level: 'low',
  confidence_score: 0.85,
  finding_list: [
    { finding_id: 'f1', finding_title: 'Timeout', severity: 'low', finding_summary: 'Test exceeded 30s limit', evidence_ref: 'log line 42' },
  ],
  analyzed_at_unix: 1709900015,
}

const mockBackboneRepairStrategy: BackboneRepairStrategy = {
  strategy_id: 'strat_bb_1',
  trace_id: 'trace_bb_1',
  handoff_intent: 'review',
  next_action_text: 'Review suggested fix and decide',
  operator_message: 'Repair exhausted; human review required.',
  step_list: [
    { step_id: 's1', step_label: 'Analyze', step_status: 'completed', step_summary: 'Completed' },
    { step_id: 's2', step_label: 'Coach', step_status: 'completed', step_summary: 'Completed' },
    { step_id: 's3', step_label: 'Human', step_status: 'completed', step_summary: 'Awaiting review' },
  ],
  strategy_status: 'human_required',
  updated_at_unix: 1709900060,
}

const mockBackboneTelemetry: BackboneTelemetry = {
  telemetry_id: 'tel_bb_1',
  trace_id: 'trace_bb_1',
  metric_list: [
    { metric_name: 'repair_steps', metric_value: 5, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'duration_ms', metric_value: 60000, metric_unit: 'ms', recorded_at_unix: 1709900060 },
    { metric_name: 'total_runs', metric_value: 42, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'successful_runs', metric_value: 38, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'failed_runs', metric_value: 4, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'retry_0_runs', metric_value: 28, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'retry_1_runs', metric_value: 10, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'retry_2_runs', metric_value: 3, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'retry_3_runs', metric_value: 1, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'failure_test_failure', metric_value: 18, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'failure_build_failure', metric_value: 12, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'failure_lint_failure', metric_value: 8, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'failure_unknown_failure', metric_value: 4, metric_unit: 'count', recorded_at_unix: 1709900060 },
    { metric_name: 'repair_duration_avg_ms', metric_value: 1240, metric_unit: 'ms', recorded_at_unix: 1709900060 },
    { metric_name: 'repair_duration_min_ms', metric_value: 420, metric_unit: 'ms', recorded_at_unix: 1709900060 },
    { metric_name: 'repair_duration_max_ms', metric_value: 5200, metric_unit: 'ms', recorded_at_unix: 1709900060 },
  ],
  run_count: 42,
  range_start_unix: 1709900000,
  range_end_unix: 1709900060,
}

export function createMockBackboneReadAdapter(): BackboneReadAdapter {
  return {
    async getRepairRun() {
      return mockBackboneRepairRun
    },
    async getStateMachine() {
      return mockBackboneStateMachine
    },
    async getFailureTimeline() {
      return mockBackboneFailureTimeline
    },
    async getGPTAnalysis() {
      return mockBackboneGPTAnalysis
    },
    async getRepairStrategy() {
      return mockBackboneRepairStrategy
    },
    async getTelemetry() {
      return mockBackboneTelemetry
    },
  }
}
