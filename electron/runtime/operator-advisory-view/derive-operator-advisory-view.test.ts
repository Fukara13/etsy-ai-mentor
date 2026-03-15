/**
 * OC-10: Tests for operator advisory view derivation.
 */

import { describe, it, expect } from 'vitest'
import { createOperatorVisibilitySnapshot } from '../operator-visibility'
import { deriveOperatorBridgePathAdvisory } from '../operator-bridge-path'
import { deriveOperatorAdvisoryView } from './derive-operator-advisory-view'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

describe('deriveOperatorAdvisoryView', () => {
  it('returns a populated view when advisory exists', () => {
    const visibility = createOperatorVisibilitySnapshot(sampleProjection)
    const bridgePath = deriveOperatorBridgePathAdvisory(visibility)
    const view = deriveOperatorAdvisoryView(visibility, bridgePath)

    expect(view.hasAdvisory).toBe(true)
    expect(view.source).toBe('operator-advisory-view')
    expect(view.advisory).not.toBeNull()
    expect(view.advisory!.projection).toBe(sampleProjection)
    expect(view.explainability.bridgePath).toBe(bridgePath)
    expect(view.status.visibility).toBe('visible')
    expect(view.status.explainability).toBe('available')
    expect(view.status.consistency).toBe('aligned')
  })

  it('returns a stable empty view when advisory does not exist', () => {
    const visibility = createOperatorVisibilitySnapshot(null)
    const bridgePath = deriveOperatorBridgePathAdvisory(visibility)
    const view = deriveOperatorAdvisoryView(visibility, bridgePath)

    expect(view.hasAdvisory).toBe(false)
    expect(view.source).toBe('operator-advisory-view')
    expect(view.advisory).toBeNull()
    expect(view.explainability.bridgePath).toBe(bridgePath)
    expect(view.explainability.bridgePath.hasAdvisory).toBe(false)
    expect(view.status.visibility).toBe('empty')
    expect(view.status.explainability).toBe('available')
    expect(view.status.consistency).toBe('empty')
  })
})
