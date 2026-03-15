/**
 * OC-13: Tests for mapRuntimeStateToDecisionTimelineStage.
 */

import { describe, it, expect } from 'vitest'
import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import { mapRuntimeStateToDecisionTimelineStage } from './map-runtime-state-to-decision-timeline-stage'

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
  if (overrides.advisory === undefined && overrides.hasAdvisory) {
    merged.advisory = {
      projection: {
        source: 'hero-runtime',
        status: 'completed',
        advisorySummaries: [],
      } as OperatorRuntimeAdvisoryProjection,
    }
  }
  if (overrides.explainability !== undefined) {
    merged.explainability = overrides.explainability
  }
  return merged
}

describe('mapRuntimeStateToDecisionTimelineStage', () => {
  it('returns unknown when no advisory and no pipeline signal', () => {
    const view = makeView()
    expect(mapRuntimeStateToDecisionTimelineStage(view)).toBe('unknown')
  })

  it('returns incident-detected when bridge path has steps', () => {
    const view = makeView({
      explainability: {
        bridgePath: {
          hasAdvisory: false,
          source: 'runtime-bridge',
          finalStage: null,
          steps: [
            {
              stage: 'webhook-intake',
              title: 'Intake',
              status: 'completed',
              summary: '',
              isActive: false,
              isCompleted: true,
            },
          ],
        },
      },
    })
    expect(mapRuntimeStateToDecisionTimelineStage(view)).toBe('incident-detected')
  })

  it('returns incident-detected when finalStage is set', () => {
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
    expect(mapRuntimeStateToDecisionTimelineStage(view)).toBe('incident-detected')
  })

  it('returns advisory-available when hasAdvisory but no summaries', () => {
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
    expect(mapRuntimeStateToDecisionTimelineStage(view)).toBe('advisory-available')
  })

  it('returns decision-context-ready when hasAdvisory and at least one summary', () => {
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
    expect(mapRuntimeStateToDecisionTimelineStage(view)).toBe('decision-context-ready')
  })
})
