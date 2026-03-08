/**
 * DC-10.2: Engine-backed provider tests.
 * Verifies repair engine invocation and read-model mapping.
 */

import { describe, it, expect } from 'vitest'
import {
  getEngineRepairRunView,
  getEngineStateMachineView,
  getEngineFailureTimelineView,
  getEngineRepairStrategyView,
  getEngineDecisionView,
  getEngineGPTAnalysisView,
  getEngineTelemetryView,
} from './engine-backed-provider'

describe('engine-backed-provider', () => {
  it('returns engine-derived RepairRunView', () => {
    const view = getEngineRepairRunView()
    expect(view).toBeDefined()
    expect(view.id).toBeDefined()
    expect(view.traceId).toBeDefined()
    expect(view.status).toBeDefined()
    expect(view.startedAt).toBeGreaterThan(0)
    expect(view.summary).toBeDefined()
    expect(view.finalState).toBe('HUMAN')
    expect(view.stepCount).toBeGreaterThanOrEqual(1)
  })

  it('returns engine-derived StateMachineView', () => {
    const view = getEngineStateMachineView()
    expect(view).toBeDefined()
    expect(view.currentState).toBe('HUMAN')
    expect(view.nodes.length).toBeGreaterThanOrEqual(1)
    expect(view.nodes.some((n) => n.label === 'HUMAN')).toBe(true)
  })

  it('returns engine-derived FailureTimelineView', () => {
    const view = getEngineFailureTimelineView()
    expect(view).toBeDefined()
    expect(view.events.length).toBeGreaterThanOrEqual(1)
    expect(view.fromTime).toBeLessThanOrEqual(view.toTime)
  })

  it('returns engine-derived RepairStrategyView', () => {
    const view = getEngineRepairStrategyView()
    expect(view).toBeDefined()
    expect(view.handoffIntent).toBeDefined()
    expect(view.nextAction).toBeDefined()
    expect(view.operatorMessage).toBeDefined()
  })

  it('returns engine-derived DecisionView', () => {
    const view = getEngineDecisionView()
    expect(view).toBeDefined()
    expect(view.operatorPrompt).toBeDefined()
  })

  it('returns engine-derived GPTAnalysisView', () => {
    const view = getEngineGPTAnalysisView()
    expect(view).toBeDefined()
    expect(view.traceId).toBeDefined()
    expect(view.failureType).toBeDefined()
    expect(view.rootCause).toBeDefined()
    expect(view.suggestedFix).toBeDefined()
    expect(typeof view.confidence).toBe('number')
    expect(view.confidence).toBeGreaterThanOrEqual(0)
    expect(view.confidence).toBeLessThanOrEqual(1)
    expect(Array.isArray(view.findings)).toBe(true)
  })

  it('returns engine-derived TelemetryView', () => {
    const view = getEngineTelemetryView()
    expect(view).toBeDefined()
    expect(view.traceId).toBeDefined()
    expect(view.runCount).toBe(1)
    expect(view.metrics.length).toBeGreaterThanOrEqual(1)
    const repairSteps = view.metrics.find((m) => m.name === 'repair_steps')
    expect(repairSteps).toBeDefined()
    expect(repairSteps!.value).toBeGreaterThanOrEqual(1)
  })

  it('all views share same trace ID for consistency', () => {
    const run = getEngineRepairRunView()
    const sm = getEngineStateMachineView()
    const timeline = getEngineFailureTimelineView()
    const strategy = getEngineRepairStrategyView()
    const decision = getEngineDecisionView()
    const gpt = getEngineGPTAnalysisView()
    const telemetry = getEngineTelemetryView()
    expect(run.traceId).toBe(sm.traceId)
    expect(run.traceId).toBe(timeline.traceId)
    expect(run.traceId).toBe(strategy.traceId)
    expect(run.traceId).toBe(decision.traceId)
    expect(run.traceId).toBe(gpt.traceId)
    expect(run.traceId).toBe(telemetry.traceId)
  })
})
