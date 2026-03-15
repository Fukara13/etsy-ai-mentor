/**
 * OC-11: Tests for mapRuntimeStateToIncidentStage.
 */

import { describe, it, expect } from 'vitest'
import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import { mapRuntimeStateToIncidentStage } from './map-runtime-state-to-incident-stage'

function makeView(
  overrides: Partial<OperatorAdvisoryView> = {}
): OperatorAdvisoryView {
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

  const merged = {
    ...base,
    ...overrides,
  }

  // basit projection override desteği
  if (overrides.advisory === undefined && overrides.hasAdvisory) {
    merged.advisory = { projection }
  }

  return merged
}

describe('mapRuntimeStateToIncidentStage', () => {
  it('returns incident-ready when advisory exists with at least one summary', () => {
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
    const stage = mapRuntimeStateToIncidentStage(view)
    expect(stage).toBe('incident-ready')
  })

  it('returns advisory-projected when hasAdvisory but no advisory summaries', () => {
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
    const stage = mapRuntimeStateToIncidentStage(view)
    expect(stage).toBe('advisory-projected')
  })

  it('returns repair-intake when finalStage is pr-inspection (intake formed, hero not reached)', () => {
    const view = makeView({
      hasAdvisory: false,
      explainability: {
        bridgePath: {
          hasAdvisory: false,
          source: 'runtime-bridge',
          finalStage: 'pr-inspection',
          steps: [],
        },
      } as OperatorAdvisoryView['explainability'],
    })
    const stage = mapRuntimeStateToIncidentStage(view)
    expect(stage).toBe('repair-intake')
  })

  it('returns advisory-projected when bridgePath finalStage is advisory-projection', () => {
    const view = makeView({
      explainability: {
        bridgePath: {
          hasAdvisory: true,
          source: 'runtime-bridge',
          finalStage: 'advisory-projection',
          steps: [],
        },
      } as OperatorAdvisoryView['explainability'],
    })
    const stage = mapRuntimeStateToIncidentStage(view)
    expect(stage).toBe('advisory-projected')
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
      } as OperatorAdvisoryView['explainability'],
    })
    const stage = mapRuntimeStateToIncidentStage(view)
    expect(stage).toBe('hero-analysis')
  })

  it('returns event-normalized when finalStage is webhook-intake', () => {
    const view = makeView({
      explainability: {
        bridgePath: {
          hasAdvisory: false,
          source: 'runtime-bridge',
          finalStage: 'webhook-intake',
          steps: [],
        },
      } as OperatorAdvisoryView['explainability'],
    })
    const stage = mapRuntimeStateToIncidentStage(view)
    expect(stage).toBe('event-normalized')
  })

  it('returns webhook-intake when steps exist but finalStage is null', () => {
    const view = makeView({
      explainability: {
        bridgePath: {
          hasAdvisory: false,
          source: 'runtime-bridge',
          finalStage: null,
          steps: [
            {
              stage: 'webhook-intake',
              title: 'Webhook',
              status: 'completed',
              summary: 'ok',
              isActive: false,
              isCompleted: true,
            },
          ],
        },
      } as OperatorAdvisoryView['explainability'],
    })
    const stage = mapRuntimeStateToIncidentStage(view)
    expect(stage).toBe('webhook-intake')
  })

  it('returns null when there is no advisory and no bridge path info', () => {
    const view = makeView()
    const stage = mapRuntimeStateToIncidentStage(view)
    expect(stage).toBeNull()
  })
})

