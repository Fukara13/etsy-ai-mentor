/**
 * OC-7: Tests for operator advisory runtime store.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCurrentOperatorAdvisoryProjection,
  setCurrentOperatorAdvisoryProjection,
} from './operator-advisory-runtime-store'

const sampleProjection = {
  source: 'hero-runtime' as const,
  status: 'completed' as const,
  advisorySummaries: [{ summary: 'S', rationaleExcerpt: 'R' }],
}

describe('operator-advisory-runtime store', () => {
  beforeEach(() => {
    setCurrentOperatorAdvisoryProjection(null)
  })

  it('returns null when never set', () => {
    expect(getCurrentOperatorAdvisoryProjection()).toBeNull()
  })

  it('returns set projection', () => {
    setCurrentOperatorAdvisoryProjection(sampleProjection)
    expect(getCurrentOperatorAdvisoryProjection()).toEqual(sampleProjection)
  })

  it('overwrites with null', () => {
    setCurrentOperatorAdvisoryProjection(sampleProjection)
    setCurrentOperatorAdvisoryProjection(null)
    expect(getCurrentOperatorAdvisoryProjection()).toBeNull()
  })
})
