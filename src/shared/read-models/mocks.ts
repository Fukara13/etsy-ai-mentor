/**
 * DC-3: Mock data for read-model shape verification and UI bootstrapping.
 * No live data; no adapters.
 */

import type {
  RepairRunView,
  StateMachineView,
  FailureTimelineView,
  GPTAnalysisView,
  RepairStrategyView,
  TelemetryView,
} from './contracts'

export const mockRepairRunView: RepairRunView = {
  id: 'run_mock_1',
  traceId: 'trace_mock_1',
  status: 'completed',
  startedAt: 1709900000,
  completedAt: 1709900060,
  summary: 'Repair run completed; handoff to human.',
  finalState: 'HUMAN',
  stepCount: 5,
}

export const mockStateMachineView: StateMachineView = {
  id: 'sm_mock_1',
  traceId: 'trace_mock_1',
  currentState: 'HUMAN',
  status: 'completed',
  nodes: [
    { id: 'IDLE', label: 'IDLE', isCurrent: false, visitedAt: 1709900000 },
    { id: 'ANALYZE', label: 'ANALYZE', isCurrent: false, visitedAt: 1709900010 },
    { id: 'COACH', label: 'COACH', isCurrent: false, visitedAt: 1709900020 },
    { id: 'HUMAN', label: 'HUMAN', isCurrent: true, visitedAt: 1709900060 },
  ],
  updatedAt: 1709900060,
}

export const mockFailureTimelineView: FailureTimelineView = {
  id: 'timeline_mock_1',
  traceId: 'trace_mock_1',
  events: [
    { id: 'e1', timestamp: 1709900000, label: 'CI Failed', type: 'ci', summary: 'Build failed' },
    { id: 'e2', timestamp: 1709900010, label: 'Analyze', type: 'repair', summary: 'Analysis started' },
    { id: 'e3', timestamp: 1709900060, label: 'Human Required', type: 'human', summary: 'Escalation' },
  ],
  fromTime: 1709900000,
  toTime: 1709900060,
}

export const mockGptAnalysisView: GPTAnalysisView = {
  id: 'gpt_mock_1',
  traceId: 'trace_mock_1',
  failureType: 'test_failure',
  rootCause: 'Flaky test timeout',
  suggestedFix: 'Increase timeout or fix test',
  risk: 'low',
  confidence: 0.85,
  findings: [
    { id: 'f1', title: 'Timeout', severity: 'low', summary: 'Test exceeded 30s limit', evidence: 'log line 42' },
  ],
  analyzedAt: 1709900015,
}

export const mockRepairStrategyView: RepairStrategyView = {
  id: 'strategy_mock_1',
  traceId: 'trace_mock_1',
  handoffIntent: 'review',
  nextAction: 'Review suggested fix and decide',
  operatorMessage: 'Repair exhausted; human review required.',
  steps: [
    { id: 's1', label: 'Analyze', status: 'completed', summary: 'Completed' },
    { id: 's2', label: 'Coach', status: 'completed', summary: 'Completed' },
    { id: 's3', label: 'Human', status: 'completed', summary: 'Awaiting review' },
  ],
  status: 'human_required',
  updatedAt: 1709900060,
}

export const mockTelemetryView: TelemetryView = {
  id: 'telemetry_mock_1',
  traceId: 'trace_mock_1',
  metrics: [
    { name: 'repair_steps', value: 5, unit: 'count', timestamp: 1709900060 },
    { name: 'duration_ms', value: 60000, unit: 'ms', timestamp: 1709900060 },
  ],
  runCount: 1,
  fromTime: 1709900000,
  toTime: 1709900060,
}
