/**
 * DC-3: Supporting types for Desktop read-model contracts.
 * Operator-facing, read-only, serializable.
 */

export type ViewStatus =
  | 'idle'
  | 'running'
  | 'completed'
  | 'failed'
  | 'exhausted'
  | 'human_required'

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'

export type TimelineEventView = {
  id: string
  timestamp: number
  label: string
  type: 'repair' | 'ci' | 'workflow' | 'human'
  summary?: string
}

export type StateNodeView = {
  id: string
  label: string
  isCurrent: boolean
  visitedAt?: number
}

export type StrategyStepView = {
  id: string
  label: string
  status: ViewStatus
  summary?: string
}

export type TelemetryMetricView = {
  name: string
  value: number
  unit?: string
  timestamp: number
}

export type AnalysisFindingView = {
  id: string
  title: string
  severity: SeverityLevel
  summary: string
  evidence?: string
}
