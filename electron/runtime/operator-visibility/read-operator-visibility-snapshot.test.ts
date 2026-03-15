/**
 * OC-8: Tests for canonical read entry.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockGetCurrent = vi.fn()
vi.mock('../operator-advisory-runtime', () => ({
  getCurrentOperatorAdvisoryProjection: (...args: unknown[]) => mockGetCurrent(...args),
}))

import { readOperatorVisibilitySnapshot } from './read-operator-visibility-snapshot'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

describe('readOperatorVisibilitySnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns snapshot with null advisory when store is empty', () => {
    mockGetCurrent.mockReturnValue(null)
    const snapshot = readOperatorVisibilitySnapshot()
    expect(mockGetCurrent).toHaveBeenCalledTimes(1)
    expect(snapshot.advisoryProjection).toBeNull()
    expect(snapshot.hasAdvisory).toBe(false)
    expect(snapshot.source).toBe('runtime-store')
  })

  it('returns snapshot with advisory when store has projection', () => {
    mockGetCurrent.mockReturnValue(sampleProjection)
    const snapshot = readOperatorVisibilitySnapshot()
    expect(mockGetCurrent).toHaveBeenCalledTimes(1)
    expect(snapshot.advisoryProjection).toEqual(sampleProjection)
    expect(snapshot.hasAdvisory).toBe(true)
    expect(snapshot.source).toBe('runtime-store')
  })

  it('does not mutate stored advisory', () => {
    mockGetCurrent.mockReturnValue(sampleProjection)
    const snapshot = readOperatorVisibilitySnapshot()
    expect(snapshot.advisoryProjection).toBe(sampleProjection)
    expect(mockGetCurrent).toHaveBeenCalledTimes(1)
    readOperatorVisibilitySnapshot()
    expect(mockGetCurrent).toHaveBeenCalledTimes(2)
    mockGetCurrent.mockReturnValue(null)
    const snapshot2 = readOperatorVisibilitySnapshot()
    expect(snapshot2.advisoryProjection).toBeNull()
  })

  it('does not invoke hero or repair (only store read)', () => {
    mockGetCurrent.mockReturnValue(null)
    readOperatorVisibilitySnapshot()
    expect(mockGetCurrent).toHaveBeenCalledTimes(1)
  })
})
