/**
 * OC-9: Tests for bridge path advisory derivation.
 */

import { describe, it, expect } from 'vitest'
import { createOperatorVisibilitySnapshot } from '../operator-visibility'
import { deriveOperatorBridgePathAdvisory } from './derive-operator-bridge-path-advisory'
import { BRIDGE_PATH_STAGES } from './operator-bridge-path-stage'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [
    { summary: 'S1', rationaleExcerpt: 'R1' },
    { summary: 'S2', rationaleExcerpt: 'R2' },
  ],
}

describe('deriveOperatorBridgePathAdvisory', () => {
  it('advisory present → completed path and final stage advisory-projection', () => {
    const visibility = createOperatorVisibilitySnapshot(sampleProjection)
    const advisory = deriveOperatorBridgePathAdvisory(visibility)
    expect(advisory.hasAdvisory).toBe(true)
    expect(advisory.source).toBe('runtime-bridge')
    expect(advisory.finalStage).toBe('advisory-projection')
    expect(advisory.steps).toHaveLength(BRIDGE_PATH_STAGES.length)
    advisory.steps.forEach((step) => {
      expect(step.status).toBe('completed')
      expect(step.isCompleted).toBe(true)
    })
    const lastStep = advisory.steps[advisory.steps.length - 1]
    expect(lastStep.isActive).toBe(true)
    expect(lastStep.stage).toBe('advisory-projection')
    expect(advisory.advisorySummary).toBe('2 advisory items.')
  })

  it('advisory absent → safe empty model', () => {
    const visibility = createOperatorVisibilitySnapshot(null)
    const advisory = deriveOperatorBridgePathAdvisory(visibility)
    expect(advisory.hasAdvisory).toBe(false)
    expect(advisory.source).toBe('runtime-bridge')
    expect(advisory.finalStage).toBeNull()
    expect(advisory.steps).toHaveLength(BRIDGE_PATH_STAGES.length)
    advisory.steps.forEach((step) => {
      expect(step.status).toBe('pending')
      expect(step.isCompleted).toBe(false)
      expect(step.isActive).toBe(false)
    })
    expect(advisory.advisorySummary).toBeUndefined()
  })

  it('stable stage ordering', () => {
    const visibility = createOperatorVisibilitySnapshot(sampleProjection)
    const advisory = deriveOperatorBridgePathAdvisory(visibility)
    const stages = advisory.steps.map((s) => s.stage)
    expect(stages).toEqual([...BRIDGE_PATH_STAGES])
  })

  it('single advisory item → advisorySummary text', () => {
    const oneItem = {
      ...sampleProjection,
      advisorySummaries: [{ summary: 'Only', rationaleExcerpt: 'R' }],
    }
    const visibility = createOperatorVisibilitySnapshot(oneItem)
    const advisory = deriveOperatorBridgePathAdvisory(visibility)
    expect(advisory.advisorySummary).toBe('1 advisory item.')
  })

  it('zero advisory items → advisorySummary', () => {
    const empty = {
      ...sampleProjection,
      advisorySummaries: [],
    }
    const visibility = createOperatorVisibilitySnapshot(empty)
    const advisory = deriveOperatorBridgePathAdvisory(visibility)
    expect(advisory.hasAdvisory).toBe(true)
    expect(advisory.advisorySummary).toBe('No advisory items.')
  })

  it('deterministic: same input => same output', () => {
    const visibility = createOperatorVisibilitySnapshot(sampleProjection)
    const a = deriveOperatorBridgePathAdvisory(visibility)
    const b = deriveOperatorBridgePathAdvisory(visibility)
    expect(a.hasAdvisory).toBe(b.hasAdvisory)
    expect(a.finalStage).toBe(b.finalStage)
    expect(a.steps.length).toBe(b.steps.length)
    a.steps.forEach((step, i) => {
      expect(step.stage).toBe(b.steps[i].stage)
      expect(step.status).toBe(b.steps[i].status)
    })
  })
})
