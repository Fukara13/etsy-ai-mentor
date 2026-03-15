/**
 * OC-8: Tests for pure snapshot builder.
 */

import { describe, it, expect } from 'vitest'
import { createOperatorVisibilitySnapshot } from './create-operator-visibility-snapshot'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

const sampleProjection: OperatorRuntimeAdvisoryProjection = {
  source: 'hero-runtime',
  status: 'completed',
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

describe('createOperatorVisibilitySnapshot', () => {
  it('returns hasAdvisory = false when input is null', () => {
    const snapshot = createOperatorVisibilitySnapshot(null)
    expect(snapshot.hasAdvisory).toBe(false)
    expect(snapshot.advisoryProjection).toBeNull()
  })

  it('returns hasAdvisory = true when advisory exists', () => {
    const snapshot = createOperatorVisibilitySnapshot(sampleProjection)
    expect(snapshot.hasAdvisory).toBe(true)
    expect(snapshot.advisoryProjection).not.toBeNull()
  })

  it('preserves advisoryProjection reference/value', () => {
    const snapshot = createOperatorVisibilitySnapshot(sampleProjection)
    expect(snapshot.advisoryProjection).toBe(sampleProjection)
    expect(snapshot.advisoryProjection?.source).toBe('hero-runtime')
    expect(snapshot.advisoryProjection?.status).toBe('completed')
  })

  it('always sets source = runtime-store', () => {
    expect(createOperatorVisibilitySnapshot(null).source).toBe('runtime-store')
    expect(createOperatorVisibilitySnapshot(sampleProjection).source).toBe('runtime-store')
  })

  it('deterministic: same input => same output', () => {
    const a = createOperatorVisibilitySnapshot(null)
    const b = createOperatorVisibilitySnapshot(null)
    expect(a).toEqual(b)
    const c = createOperatorVisibilitySnapshot(sampleProjection)
    const d = createOperatorVisibilitySnapshot(sampleProjection)
    expect(c.advisoryProjection).toBe(d.advisoryProjection)
    expect(c.hasAdvisory).toBe(d.hasAdvisory)
    expect(c.source).toBe(d.source)
  })
})
