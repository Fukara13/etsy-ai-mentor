/**
 * DC-4: Mapper unit tests.
 * Verifies deterministic mapping, correct field mapping, no mutation behavior.
 */

import { describe, it, expect } from 'vitest'
import {
  mapRepairRunView,
  mapStateMachineView,
  mapFailureTimelineView,
  mapGPTAnalysisView,
  mapRepairStrategyView,
  mapTelemetryView,
} from './backbone-read.mapper'
import type {
  BackboneRepairRun,
  BackboneStateMachine,
  BackboneFailureTimeline,
  BackboneGPTAnalysis,
  BackboneRepairStrategy,
  BackboneTelemetry,
} from './backbone-read.types'

const rawRepairRun: BackboneRepairRun = {
  run_id: 'r1',
  trace_id: 't1',
  run_status: 'completed',
  started_at_unix: 100,
  completed_at_unix: 200,
  run_summary: 'Done',
  final_state_code: 'HUMAN',
  total_steps: 3,
}

const rawStateMachine: BackboneStateMachine = {
  sm_id: 'sm1',
  trace_id: 't1',
  active_state: 'HUMAN',
  sm_status: 'completed',
  state_nodes: [
    { state_id: 'A', state_label: 'A', is_active: false, visited_at_unix: 100 },
    { state_id: 'B', state_label: 'B', is_active: true, visited_at_unix: 200 },
  ],
  last_updated_unix: 200,
}

const rawFailureTimeline: BackboneFailureTimeline = {
  timeline_id: 'tl1',
  trace_id: 't1',
  event_list: [
    { event_id: 'e1', event_ts_unix: 100, event_label: 'Fail', event_type: 'ci' },
  ],
  range_start_unix: 100,
  range_end_unix: 200,
}

const rawGPTAnalysis: BackboneGPTAnalysis = {
  analysis_id: 'g1',
  trace_id: 't1',
  failure_type: 'test',
  root_cause: 'timeout',
  suggested_fix: 'increase timeout',
  risk_level: 'low',
  confidence_score: 0.9,
  finding_list: [{ finding_id: 'f1', finding_title: 'T', severity: 'low', finding_summary: 's' }],
  analyzed_at_unix: 150,
}

const rawRepairStrategy: BackboneRepairStrategy = {
  strategy_id: 'st1',
  trace_id: 't1',
  handoff_intent: 'review',
  next_action_text: 'Review',
  operator_message: 'Needs review',
  step_list: [{ step_id: 's1', step_label: 'S1', step_status: 'completed' }],
  strategy_status: 'human_required',
  updated_at_unix: 200,
}

const rawTelemetry: BackboneTelemetry = {
  telemetry_id: 'tel1',
  trace_id: 't1',
  metric_list: [{ metric_name: 'steps', metric_value: 5, metric_unit: 'count', recorded_at_unix: 200 }],
  run_count: 1,
  range_start_unix: 100,
  range_end_unix: 200,
}

describe('backbone-read.mapper', () => {
  it('mapRepairRunView maps fields correctly', () => {
    const view = mapRepairRunView(rawRepairRun)
    expect(view.id).toBe('r1')
    expect(view.traceId).toBe('t1')
    expect(view.status).toBe('completed')
    expect(view.startedAt).toBe(100)
    expect(view.completedAt).toBe(200)
    expect(view.summary).toBe('Done')
    expect(view.finalState).toBe('HUMAN')
    expect(view.stepCount).toBe(3)
  })

  it('mapRepairRunView is deterministic', () => {
    const a = mapRepairRunView(rawRepairRun)
    const b = mapRepairRunView(rawRepairRun)
    expect(a).toEqual(b)
  })

  it('mapRepairRunView does not mutate input', () => {
    const before = { ...rawRepairRun }
    mapRepairRunView(rawRepairRun)
    expect(rawRepairRun).toEqual(before)
  })

  it('mapStateMachineView maps fields correctly', () => {
    const view = mapStateMachineView(rawStateMachine)
    expect(view.id).toBe('sm1')
    expect(view.currentState).toBe('HUMAN')
    expect(view.nodes).toHaveLength(2)
    expect(view.nodes[0]).toEqual({ id: 'A', label: 'A', isCurrent: false, visitedAt: 100 })
    expect(view.nodes[1]).toEqual({ id: 'B', label: 'B', isCurrent: true, visitedAt: 200 })
  })

  it('mapFailureTimelineView maps events correctly', () => {
    const view = mapFailureTimelineView(rawFailureTimeline)
    expect(view.events[0]).toEqual({ id: 'e1', timestamp: 100, label: 'Fail', type: 'ci' })
  })

  it('mapGPTAnalysisView maps findings correctly', () => {
    const view = mapGPTAnalysisView(rawGPTAnalysis)
    expect(view.findings[0]).toEqual({ id: 'f1', title: 'T', severity: 'low', summary: 's' })
    expect(view.risk).toBe('low')
    expect(view.confidence).toBe(0.9)
  })

  it('mapRepairStrategyView maps steps correctly', () => {
    const view = mapRepairStrategyView(rawRepairStrategy)
    expect(view.steps[0]).toEqual({ id: 's1', label: 'S1', status: 'completed', summary: undefined })
  })

  it('mapTelemetryView maps metrics correctly', () => {
    const view = mapTelemetryView(rawTelemetry)
    expect(view.metrics[0]).toEqual({ name: 'steps', value: 5, unit: 'count', timestamp: 200 })
  })
})
