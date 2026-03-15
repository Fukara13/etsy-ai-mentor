/**
 * OC-14: Tests for sortIncidentHistoryItems.
 */

import { describe, it, expect } from 'vitest'
import type { IncidentHistoryItem } from './types'
import { sortIncidentHistoryItems } from './sort-incident-history-items'

function item(overrides: Partial<IncidentHistoryItem>): IncidentHistoryItem {
  return {
    incidentKey: 'key',
    title: 'Title',
    status: 'unknown',
    requiresOperatorAction: false,
    hasAdvisory: false,
    hasDecisionContext: false,
    ...overrides,
  }
}

describe('sortIncidentHistoryItems', () => {
  it('returns empty array for empty input', () => {
    expect(sortIncidentHistoryItems([])).toEqual([])
  })

  it('puts requiresOperatorAction true before false', () => {
    const items: IncidentHistoryItem[] = [
      item({ incidentKey: 'b', requiresOperatorAction: false }),
      item({ incidentKey: 'a', requiresOperatorAction: true }),
    ]
    const sorted = sortIncidentHistoryItems(items)
    expect(sorted[0].incidentKey).toBe('a')
    expect(sorted[0].requiresOperatorAction).toBe(true)
    expect(sorted[1].incidentKey).toBe('b')
  })

  it('puts active before resolved when requiresOperatorAction same', () => {
    const items: IncidentHistoryItem[] = [
      item({ incidentKey: 'r', status: 'resolved' }),
      item({ incidentKey: 'a', status: 'active' }),
    ]
    const sorted = sortIncidentHistoryItems(items)
    expect(sorted[0].status).toBe('active')
    expect(sorted[1].status).toBe('resolved')
  })

  it('puts newest lastUpdatedAt first when status same', () => {
    const items: IncidentHistoryItem[] = [
      item({ incidentKey: 'old', lastUpdatedAt: 100 }),
      item({ incidentKey: 'new', lastUpdatedAt: 200 }),
    ]
    const sorted = sortIncidentHistoryItems(items)
    expect(sorted[0].lastUpdatedAt).toBe(200)
    expect(sorted[1].lastUpdatedAt).toBe(100)
  })

  it('falls back to alphabetical incidentKey when lastUpdatedAt same', () => {
    const items: IncidentHistoryItem[] = [
      item({ incidentKey: 'z', lastUpdatedAt: 100 }),
      item({ incidentKey: 'a', lastUpdatedAt: 100 }),
    ]
    const sorted = sortIncidentHistoryItems(items)
    expect(sorted[0].incidentKey).toBe('a')
    expect(sorted[1].incidentKey).toBe('z')
  })

  it('does not mutate input', () => {
    const items: IncidentHistoryItem[] = [
      item({ incidentKey: 'b' }),
      item({ incidentKey: 'a' }),
    ]
    const copy = [...items]
    sortIncidentHistoryItems(items)
    expect(items).toEqual(copy)
  })
})
