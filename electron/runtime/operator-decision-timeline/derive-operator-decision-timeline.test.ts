/**
 * OC-13: Tests for deriveOperatorDecisionTimeline.
 */

import { describe, it, expect } from 'vitest'
import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import { deriveOperatorDecisionTimeline } from './derive-operator-decision-timeline'
import { DECISION_TIMELINE_STAGES } from './operator-decision-timeline-stage'

function makeView(overrides: Partial<OperatorAdvisoryView> = {}): OperatorAdvisoryView {
  const bridgePath: OperatorBridgePathAdvisory = {
    hasAdvisory: false,
    source: 'runtime-bridge',
    finalStage: null,
    steps: [],
  }
  const base: OperatorAdvisoryView = {
    hasAdvisory: false,
    source: 'operator-advisory-view',
    advisory: null,
    explainability: { bridgePath },
    status: { visibility: 'empty', explainability: 'empty', consistency: 'empty' },
  }
  const merged = { ...base, ...overrides } as OperatorAdvisoryView
  if (overrides.hasAdvisory === true && overrides.advisory === undefined) {
    merged.advisory = {
      projection: {
        source: 'hero-runtime',
        status: 'completed',
        advisorySummaries: [],
      },
    }
  }
  return merged
}

describe('deriveOperatorDecisionTimeline', () => {
  it('sets hasDecisionContext false when currentStage is unknown', () => {
    const view = makeView()
    const t = deriveOperatorDecisionTimeline(view)
    expect(t.currentStage).toBe('unknown')
    expect(t.hasDecisionContext).toBe(false)
  })

  it('sets hasDecisionContext false when currentStage is incident-detected', () => {
    const view = makeView({
      explainability: {
        bridgePath: {
          hasAdvisory: false,
          source: 'runtime-bridge',
          finalStage: 'hero-analysis',
          steps: [],
        },
      },
    })
    const t = deriveOperatorDecisionTimeline(view)
    expect(t.currentStage).toBe('incident-detected')
    expect(t.hasDecisionContext).toBe(false)
  })

  it('sets hasDecisionContext true when currentStage is advisory-available or decision-context-ready', () => {
    const view = makeView({ hasAdvisory: true })
    const t = deriveOperatorDecisionTimeline(view)
    expect(t.currentStage).toBe('advisory-available')
    expect(t.hasDecisionContext).toBe(true)
  })

  it('sets incidentKey to null', () => {
    const t = deriveOperatorDecisionTimeline(makeView())
    expect(t.incidentKey).toBeNull()
  })

  it('produces deterministic summary when unknown', () => {
    const t = deriveOperatorDecisionTimeline(makeView())
    expect(t.summary).toContain('not available')
  })

  it('produces summary for decision-context-ready and sets requiresOperatorAction true', () => {
    const view = makeView({
      hasAdvisory: true,
      advisory: {
        projection: {
          source: 'hero-runtime',
          status: 'completed',
          advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
        } as OperatorRuntimeAdvisoryProjection,
      },
    })
    const t = deriveOperatorDecisionTimeline(view)
    expect(t.currentStage).toBe('decision-context-ready')
    expect(t.requiresOperatorAction).toBe(true)
    expect(t.summary).toContain('Operator review')
  })

  it('sets requiresOperatorAction false when not at decision point stage', () => {
    const view = makeView()
    const t = deriveOperatorDecisionTimeline(view)
    expect(t.requiresOperatorAction).toBe(false)
  })

  it('returns stable shape with all stages as entries', () => {
    const t = deriveOperatorDecisionTimeline(makeView())
    expect(t).toHaveProperty('hasDecisionContext')
    expect(t).toHaveProperty('incidentKey')
    expect(t).toHaveProperty('currentStage')
    expect(t).toHaveProperty('entries')
    expect(t).toHaveProperty('summary')
    expect(t).toHaveProperty('requiresOperatorAction')
    expect(t.entries.length).toBe(DECISION_TIMELINE_STAGES.length)
  })
})
