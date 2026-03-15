/**
 * OC-10: Tests for readOperatorAdvisoryView wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadVisibility = vi.fn()
vi.mock('../operator-visibility', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-visibility')>()
  return {
    ...actual,
    readOperatorVisibilitySnapshot: (...args: unknown[]) => mockReadVisibility(...args),
  }
})

import { createOperatorVisibilitySnapshot } from '../operator-visibility'
import { readOperatorAdvisoryView } from './operator-advisory-view'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

describe('readOperatorAdvisoryView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('wires runtime readers and returns derived contract', () => {
    const visibility = createOperatorVisibilitySnapshot(sampleProjection)
    mockReadVisibility.mockReturnValue(visibility)

    const view = readOperatorAdvisoryView()

    expect(mockReadVisibility).toHaveBeenCalled()
    expect(view.source).toBe('operator-advisory-view')
    expect(view.hasAdvisory).toBe(true)
    expect(view.advisory).not.toBeNull()
    expect(view.advisory!.projection).toEqual(sampleProjection)
    expect(view.explainability.bridgePath).toBeDefined()
    expect(view.explainability.bridgePath.hasAdvisory).toBe(true)
    expect(view.status.visibility).toBe('visible')
    expect(view.status.consistency).toBe('aligned')
  })

  it('returns stable empty view when readers return no advisory', () => {
    mockReadVisibility.mockReturnValue(createOperatorVisibilitySnapshot(null))

    const view = readOperatorAdvisoryView()

    expect(view.hasAdvisory).toBe(false)
    expect(view.advisory).toBeNull()
    expect(view.status.visibility).toBe('empty')
    expect(view.status.consistency).toBe('empty')
  })
})
