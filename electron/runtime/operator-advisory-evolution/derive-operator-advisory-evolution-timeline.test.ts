/**
 * OC-12: Tests for deriveOperatorAdvisoryEvolutionTimeline.
 */

import { describe, it, expect } from 'vitest'
import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import { deriveOperatorAdvisoryEvolutionTimeline } from './derive-operator-advisory-evolution-timeline'
import { ADVISORY_EVOLUTION_STAGES } from './operator-advisory-evolution-stage'

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

describe('deriveOperatorAdvisoryEvolutionTimeline', () => {
  it('sets hasAdvisory from view', () => {
    const view = makeView({ hasAdvisory: true })
    const t = deriveOperatorAdvisoryEvolutionTimeline(view)
    expect(t.hasAdvisory).toBe(true)
  })

  it('sets hasAdvisory false when view has no advisory', () => {
    const view = makeView()
    const t = deriveOperatorAdvisoryEvolutionTimeline(view)
    expect(t.hasAdvisory).toBe(false)
  })

  it('sets incidentKey to null', () => {
    const t = deriveOperatorAdvisoryEvolutionTimeline(makeView())
    expect(t.incidentKey).toBeNull()
  })

  it('produces deterministic summary when no stage', () => {
    const t = deriveOperatorAdvisoryEvolutionTimeline(makeView())
    expect(t.summary).toContain('No advisory evolution data')
  })

  it('produces summary for operator-view-ready', () => {
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
    const t = deriveOperatorAdvisoryEvolutionTimeline(view)
    expect(t.currentStage).toBe('operator-view-ready')
    expect(t.summary).toContain('operator review')
  })

  it('currentStage matches mapped stage', () => {
    const view = makeView({
      explainability: {
        bridgePath: {
          hasAdvisory: false,
          source: 'runtime-bridge',
          finalStage: 'governance',
          steps: [],
        },
      },
    })
    const t = deriveOperatorAdvisoryEvolutionTimeline(view)
    expect(t.currentStage).toBe('governance-evaluated')
  })

  it('returns stable read-model shape', () => {
    const t = deriveOperatorAdvisoryEvolutionTimeline(makeView())
    expect(t).toHaveProperty('hasAdvisory')
    expect(t).toHaveProperty('incidentKey')
    expect(t).toHaveProperty('currentStage')
    expect(t).toHaveProperty('entries')
    expect(t).toHaveProperty('summary')
    expect(Array.isArray(t.entries)).toBe(true)
    expect(t.entries.length).toBe(ADVISORY_EVOLUTION_STAGES.length)
  })
})
