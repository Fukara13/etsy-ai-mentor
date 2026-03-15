/**
 * OC-14: Tests for deriveIncidentHistorySurface.
 */

import { describe, it, expect } from 'vitest'
import type { RawIncidentDescriptor } from './types'
import { deriveIncidentHistorySurface } from './derive-incident-history-surface'

describe('deriveIncidentHistorySurface', () => {
  it('returns empty surface for empty raw list', () => {
    const surface = deriveIncidentHistorySurface([])
    expect(surface.items).toEqual([])
    expect(surface.totalCount).toBe(0)
    expect(surface.activeCount).toBe(0)
    expect(surface.resolvedCount).toBe(0)
    expect(surface.requiresAttentionCount).toBe(0)
    expect(surface.lastUpdatedAt).toBeUndefined()
    expect(surface.summary).toBe('No incidents.')
  })

  it('computes counts for mixed active/resolved incidents', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: 'a', status: 'active', requiresOperatorAction: true },
      { incidentKey: 'b', status: 'resolved' },
      { incidentKey: 'c', status: 'active', requiresOperatorAction: false },
    ]
    const surface = deriveIncidentHistorySurface(raw)
    expect(surface.totalCount).toBe(3)
    expect(surface.activeCount).toBe(2)
    expect(surface.resolvedCount).toBe(1)
    expect(surface.requiresAttentionCount).toBe(1)
  })

  it('sorts items: requiresOperatorAction first, then active, then by lastUpdatedAt', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: 'z', status: 'resolved', lastUpdatedAt: 200 },
      { incidentKey: 'need', status: 'active', requiresOperatorAction: true, lastUpdatedAt: 100 },
    ]
    const surface = deriveIncidentHistorySurface(raw)
    expect(surface.items[0].incidentKey).toBe('need')
    expect(surface.items[1].incidentKey).toBe('z')
  })

  it('sets lastUpdatedAt to max of items when present', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: 'a', lastUpdatedAt: 100 },
      { incidentKey: 'b', lastUpdatedAt: 300 },
      { incidentKey: 'c', lastUpdatedAt: 200 },
    ]
    const surface = deriveIncidentHistorySurface(raw)
    expect(surface.lastUpdatedAt).toBe(300)
  })

  it('leaves lastUpdatedAt undefined when no items have it', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: 'a' },
    ]
    const surface = deriveIncidentHistorySurface(raw)
    expect(surface.lastUpdatedAt).toBeUndefined()
  })

  it('generates deterministic summary string', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: '1', status: 'active', requiresOperatorAction: true },
      { incidentKey: '2', status: 'resolved' },
      { incidentKey: '3', status: 'resolved' },
    ]
    const surface = deriveIncidentHistorySurface(raw)
    expect(surface.summary).toContain('3 incidents')
    expect(surface.summary).toContain('1 requires operator attention')
    expect(surface.summary).toContain('2 resolved')
  })

  it('produces same output for same input (deterministic)', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: 'x', status: 'active' },
    ]
    const a = deriveIncidentHistorySurface(raw)
    const b = deriveIncidentHistorySurface(raw)
    expect(a).toEqual(b)
  })
})
