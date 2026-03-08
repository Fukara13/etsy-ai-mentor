/**
 * DC-3: Shared read-model contracts and mocks.
 * Single export surface for Desktop read models.
 */

export type {
  RepairRunView,
  StateMachineView,
  FailureTimelineView,
  GPTAnalysisView,
  RepairStrategyView,
  TelemetryView,
} from './contracts'

export type {
  ViewStatus,
  SeverityLevel,
  TimelineEventView,
  StateNodeView,
  StrategyStepView,
  TelemetryMetricView,
  AnalysisFindingView,
} from './types'

export {
  mockRepairRunView,
  mockStateMachineView,
  mockFailureTimelineView,
  mockGptAnalysisView,
  mockRepairStrategyView,
  mockTelemetryView,
} from './mocks'
