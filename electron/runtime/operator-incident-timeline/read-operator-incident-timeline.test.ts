/**
 * OC-11: Tests for readOperatorIncidentTimeline wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadAdvisoryView = vi.fn()
vi.mock('../operator-advisory-view', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-advisory-view')>()
  return {
    ...actual,
    readOperatorAdvisoryView: (...args: unknown[]) => mockReadAdvisoryView(...args),
  }
})

import { createOperatorVisibilitySnapshot } from '../operator-visibility'
import { deriveOperatorBridgePathAdvisory } from '../operator-bridge-path'
import { deriveOperatorAdvisoryView } from '../operator-advisory-view'
import { readOperatorIncidentTimeline } from './read-operator-incident-timeline'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

describe('readOperatorIncidentTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wires advisory view reader and returns derived timeline', () => {
    const visibility = createOperatorVisibilitySnapshot(sampleProjection)
    const bridgePath = deriveOperatorBridgePathAdvisory(visibility)
    const advisoryView = deriveOperatorAdvisoryView(visibility, bridgePath)
    mockReadAdvisoryView.mockReturnValue(advisoryView)

    const timeline = readOperatorIncidentTimeline()

    expect(mockReadAdvisoryView).toHaveBeenCalled()
    expect(timeline.hasIncident).toBe(true)
    expect(timeline.currentStage).toBe('incident-ready')
    expect(timeline.entries.length).toBeGreaterThan(0)
  })

  it('returns stable empty timeline when advisory view has no incident', () => {
    const visibility = createOperatorVisibilitySnapshot(null)
    const bridgePath = deriveOperatorBridgePathAdvisory(visibility)
    const advisoryView = deriveOperatorAdvisoryView(visibility, bridgePath)
    mockReadAdvisoryView.mockReturnValue(advisoryView)

    const timeline = readOperatorIncidentTimeline()

    expect(timeline.hasIncident).toBe(false)
    expect(timeline.currentStage).toBeNull()
  })
})

