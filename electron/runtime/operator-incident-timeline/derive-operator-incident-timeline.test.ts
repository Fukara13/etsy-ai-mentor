/**
 * OC-11: Tests for deriveOperatorIncidentTimeline.
 */

import { describe, it, expect } from 'vitest'
import { createOperatorVisibilitySnapshot } from '../operator-visibility'
import { deriveOperatorBridgePathAdvisory } from '../operator-bridge-path'
import { deriveOperatorAdvisoryView } from '../operator-advisory-view'
import { deriveOperatorIncidentTimeline } from './derive-operator-incident-timeline'
import { INCIDENT_TIMELINE_STAGES } from './operator-incident-timeline-stage'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import type { OperatorAdvisoryView } from '../operator-advisory-view'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

describe('deriveOperatorIncidentTimeline', () => {
  it('returns populated timeline and summary when advisory exists', () => {
    const visibility = createOperatorVisibilitySnapshot(sampleProjection)
    const bridgePath = deriveOperatorBridgePathAdvisory(visibility)
    const advisoryView = deriveOperatorAdvisoryView(visibility, bridgePath)

    const timeline = deriveOperatorIncidentTimeline(advisoryView)

    expect(timeline.hasIncident).toBe(true)
    expect(timeline.currentStage).toBe('incident-ready')
    expect(timeline.entries).toHaveLength(INCIDENT_TIMELINE_STAGES.length)
    expect(timeline.summary.totalStages).toBe(INCIDENT_TIMELINE_STAGES.length)
    expect(timeline.summary.completedStages).toBeGreaterThan(0)
    expect(timeline.summary.activeStage).toBe('incident-ready')
    expect(timeline.summary.advisoryReached).toBe(true)
  })

  it('returns stable empty incident timeline when advisory does not exist', () => {
    const visibility = createOperatorVisibilitySnapshot(null)
    const bridgePath = deriveOperatorBridgePathAdvisory(visibility)
    const advisoryView = deriveOperatorAdvisoryView(visibility, bridgePath)

    const timeline = deriveOperatorIncidentTimeline(advisoryView)

    expect(timeline.hasIncident).toBe(false)
    expect(timeline.incidentKey).toBeNull()
    expect(timeline.currentStage).toBeNull()
    expect(timeline.entries).toHaveLength(INCIDENT_TIMELINE_STAGES.length)
    expect(timeline.summary.totalStages).toBe(INCIDENT_TIMELINE_STAGES.length)
    expect(timeline.summary.completedStages).toBe(0)
    expect(timeline.summary.activeStage).toBeNull()
    expect(timeline.summary.advisoryReached).toBe(false)
  })

  it('returns repair-intake as currentStage when bridge path finalStage is pr-inspection', () => {
    const advisoryView: OperatorAdvisoryView = {
      hasAdvisory: false,
      source: 'operator-advisory-view',
      advisory: null,
      explainability: {
        bridgePath: {
          hasAdvisory: false,
          source: 'runtime-bridge',
          finalStage: 'pr-inspection',
          steps: [
            {
              stage: 'webhook-intake',
              title: 'Webhook intake',
              status: 'completed',
              summary: 'Done',
              isActive: false,
              isCompleted: true,
            },
            {
              stage: 'pr-inspection',
              title: 'PR inspection',
              status: 'completed',
              summary: 'Done',
              isActive: false,
              isCompleted: true,
            },
          ],
        },
      },
      status: { visibility: 'empty', explainability: 'available', consistency: 'empty' },
    }

    const timeline = deriveOperatorIncidentTimeline(advisoryView)

    expect(timeline.hasIncident).toBe(true)
    expect(timeline.currentStage).toBe('repair-intake')
    expect(timeline.summary.activeStage).toBe('repair-intake')
    const repairIntakeEntry = timeline.entries.find((e) => e.stage === 'repair-intake')
    expect(repairIntakeEntry).toBeDefined()
    expect(repairIntakeEntry!.status).toBe('active')
  })
})

