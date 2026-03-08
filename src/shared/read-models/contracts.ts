/**
 * DC-3: Desktop read-model contracts.
 * Operator-facing, read-only, plain serializable shapes.
 * No write commands, action handlers, or mutation authority.
 */

import type {
  ViewStatus,
  SeverityLevel,
  TimelineEventView,
  StateNodeView,
  StrategyStepView,
  TelemetryMetricView,
  AnalysisFindingView,
} from './types'

export type RepairRunView = {
  id: string
  traceId: string
  status: ViewStatus
  startedAt: number
  completedAt?: number
  summary: string
  finalState?: string
  stepCount?: number
}

export type StateMachineView = {
  id: string
  traceId: string
  currentState: string
  status: ViewStatus
  nodes: StateNodeView[]
  updatedAt: number
}

export type FailureTimelineView = {
  id: string
  traceId: string
  events: TimelineEventView[]
  fromTime: number
  toTime: number
}

export type GPTAnalysisView = {
  id: string
  traceId: string
  failureType: string
  rootCause: string
  suggestedFix: string
  risk: SeverityLevel
  confidence: number
  findings: AnalysisFindingView[]
  analyzedAt: number
}

export type RepairStrategyView = {
  id: string
  traceId: string
  handoffIntent: string
  nextAction: string
  operatorMessage: string
  steps: StrategyStepView[]
  status: ViewStatus
  updatedAt: number
}

export type TelemetryView = {
  id: string
  traceId: string
  metrics: TelemetryMetricView[]
  runCount: number
  fromTime: number
  toTime: number
}
