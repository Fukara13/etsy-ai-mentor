/**
 * OC-9: Tests for canonical read entry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadVisibility = vi.fn()
vi.mock('../operator-visibility', () => ({
  readOperatorVisibilitySnapshot: (...args: unknown[]) => mockReadVisibility(...args),
}))

import { readOperatorBridgePathAdvisory } from './read-operator-bridge-path-advisory'
import { BRIDGE_PATH_STAGES } from './operator-bridge-path-stage'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'
import type { OperatorVisibilitySnapshot } from '../operator-visibility'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

function snapshotWith(advisoryProjection: OperatorRuntimeAdvisoryProjection | null): OperatorVisibilitySnapshot {
  return {
    advisoryProjection,
    hasAdvisory: advisoryProjection !== null,
    source: 'runtime-store',
  }
}

describe('readOperatorBridgePathAdvisory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns advisory with completed path when visibility has advisory', () => {
    mockReadVisibility.mockReturnValue(snapshotWith(sampleProjection))
    const advisory = readOperatorBridgePathAdvisory()
    expect(mockReadVisibility).toHaveBeenCalledTimes(1)
    expect(advisory.hasAdvisory).toBe(true)
    expect(advisory.source).toBe('runtime-bridge')
    expect(advisory.finalStage).toBe('advisory-projection')
    expect(advisory.steps).toHaveLength(BRIDGE_PATH_STAGES.length)
  })

  it('returns safe empty model when visibility has no advisory', () => {
    mockReadVisibility.mockReturnValue(snapshotWith(null))
    const advisory = readOperatorBridgePathAdvisory()
    expect(mockReadVisibility).toHaveBeenCalledTimes(1)
    expect(advisory.hasAdvisory).toBe(false)
    expect(advisory.finalStage).toBeNull()
    expect(advisory.steps.every((s) => s.status === 'pending')).toBe(true)
  })

  it('uses canonical visibility read only (no direct store)', () => {
    mockReadVisibility.mockReturnValue(snapshotWith(null))
    readOperatorBridgePathAdvisory()
    readOperatorBridgePathAdvisory()
    expect(mockReadVisibility).toHaveBeenCalledTimes(2)
  })

  it('returns steps in stable order', () => {
    mockReadVisibility.mockReturnValue(snapshotWith(sampleProjection))
    const advisory = readOperatorBridgePathAdvisory()
    expect(advisory.steps.map((s) => s.stage)).toEqual([...BRIDGE_PATH_STAGES])
  })
})
