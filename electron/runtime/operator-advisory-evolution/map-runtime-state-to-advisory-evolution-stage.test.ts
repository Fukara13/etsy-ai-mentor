/**
 * OC-12: Tests for mapRuntimeStateToAdvisoryEvolutionStage.
 */

import { describe, it, expect } from 'vitest'
import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import { mapRuntimeStateToAdvisoryEvolutionStage } from './map-runtime-state-to-advisory-evolution-stage'

function makeView(overrides: Partial<OperatorAdvisoryView> = {}): OperatorAdvisoryView {
  const projection: OperatorRuntimeAdvisoryProjection = {
    source: 'hero-runtime',
    status: 'completed',
    advisorySummaries: [],
  }

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
    status: {
      visibility: 'empty',
      explainability: 'empty',
      consistency: 'empty',
    },
  }

  const merged = { ...base, ...overrides }
  if (overrides.advisory === undefined && overrides.hasAdvisory) {
    ;(merged as OperatorAdvisoryView).advisory = { projection }
  }
  if (overrides.explainability !== undefined) {
    ;(merged as OperatorAdvisoryView).explainability = overrides.explainability
  }
  return merged as OperatorAdvisoryView
}

describe('mapRuntimeStateToAdvisoryEvolutionStage', () => {
  it('returns null when no advisory data exists', () => {
    const view = makeView()
    expect(mapRuntimeStateToAdvisoryEvolutionStage(view)).toBeNull()
  })

  it('returns hero-analysis when finalStage is hero-analysis', () => {
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
    expect(mapRuntimeStateToAdvisoryEvolutionStage(view)).toBe('hero-analysis')
  })

  it('returns governance-evaluated when finalStage is governance', () => {
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
    expect(mapRuntimeStateToAdvisoryEvolutionStage(view)).toBe('governance-evaluated')
  })

  it('returns bridge-path-derived when steps exist but no finalStage', () => {
    const view = makeView({
      explainability: {
        bridgePath: {
          hasAdvisory: false,
          source: 'runtime-bridge',
          finalStage: null,
          steps: [{ stage: 'webhook-intake', label: 'Intake' }],
        },
      },
    })
    expect(mapRuntimeStateToAdvisoryEvolutionStage(view)).toBe('bridge-path-derived')
  })

  it('returns advisory-generated when hasAdvisory but no summaries', () => {
    const view = makeView({
      hasAdvisory: true,
      advisory: {
        projection: {
          source: 'hero-runtime',
          status: 'completed',
          advisorySummaries: [],
        },
      },
    })
    expect(mapRuntimeStateToAdvisoryEvolutionStage(view)).toBe('advisory-generated')
  })

  it('returns operator-view-ready when hasAdvisory and at least one summary', () => {
    const view = makeView({
      hasAdvisory: true,
      advisory: {
        projection: {
          source: 'hero-runtime',
          status: 'completed',
          advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
        },
      },
    })
    expect(mapRuntimeStateToAdvisoryEvolutionStage(view)).toBe('operator-view-ready')
  })
})
