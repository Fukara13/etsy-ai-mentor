/**
 * OC-11: Tests for createOperatorIncidentTimelineEntries.
 */

import { describe, it, expect } from 'vitest'
import { createOperatorIncidentTimelineEntries } from './create-operator-incident-timeline-entries'
import { INCIDENT_TIMELINE_STAGES } from './operator-incident-timeline-stage'
import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'

function makeView(hasAdvisory: boolean): OperatorAdvisoryView {
  const projection: OperatorRuntimeAdvisoryProjection = {
    source: 'hero-runtime',
    status: 'completed',
    advisorySummaries: [],
  }

  const bridgePath: OperatorBridgePathAdvisory = {
    hasAdvisory,
    source: 'runtime-bridge',
    finalStage: hasAdvisory ? 'advisory-projection' : null,
    steps: [],
  }

  return {
    hasAdvisory,
    source: 'operator-advisory-view',
    advisory: hasAdvisory ? { projection } : null,
    explainability: { bridgePath },
    status: {
      visibility: hasAdvisory ? 'visible' : 'empty',
      explainability: 'available',
      consistency: hasAdvisory ? 'aligned' : 'empty',
    },
  }
}

describe('createOperatorIncidentTimelineEntries', () => {
  it('marks earlier stages completed, current active, later not-reached', () => {
    const view = makeView(true)
    const currentStage = 'hero-analysis' as const
    const entries = createOperatorIncidentTimelineEntries(currentStage, true, view)

    expect(entries).toHaveLength(INCIDENT_TIMELINE_STAGES.length)
    expect(entries.map((e) => e.order)).toEqual(
      INCIDENT_TIMELINE_STAGES.map((_, i) => i)
    )

    const currentIndex = INCIDENT_TIMELINE_STAGES.indexOf(currentStage)
    entries.forEach((entry, idx) => {
      if (idx < currentIndex) {
        expect(entry.status).toBe('completed')
      } else if (idx === currentIndex) {
        expect(entry.status).toBe('active')
      } else {
        expect(entry.status).toBe('not-reached')
      }
    })
  })

  it('when incident is absent, all stages are not-reached', () => {
    const view = makeView(false)
    const entries = createOperatorIncidentTimelineEntries(null, false, view)
    expect(entries).toHaveLength(INCIDENT_TIMELINE_STAGES.length)
    entries.forEach((entry) => {
      expect(entry.status).toBe('not-reached')
    })
  })
})

