/**
 * OC-14: Tests for createIncidentHistoryItems.
 */

import { describe, it, expect } from 'vitest'
import type { RawIncidentDescriptor } from './types'
import { createIncidentHistoryItems } from './create-incident-history-items'

describe('createIncidentHistoryItems', () => {
  it('returns empty array for empty raw input', () => {
    const items = createIncidentHistoryItems([])
    expect(items).toEqual([])
  })

  it('maps raw descriptors to items with required fields', () => {
    const raw: RawIncidentDescriptor[] = [
      {
        incidentKey: 'inc-1',
        title: 'First',
        status: 'active',
        requiresOperatorAction: true,
        hasAdvisory: true,
        hasDecisionContext: true,
      },
    ]
    const items = createIncidentHistoryItems(raw)
    expect(items).toHaveLength(1)
    expect(items[0].incidentKey).toBe('inc-1')
    expect(items[0].title).toBe('First')
    expect(items[0].status).toBe('active')
    expect(items[0].requiresOperatorAction).toBe(true)
    expect(items[0].hasAdvisory).toBe(true)
    expect(items[0].hasDecisionContext).toBe(true)
  })

  it('applies safe defaults for missing optional fields', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: 'minimal' },
    ]
    const items = createIncidentHistoryItems(raw)
    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('minimal')
    expect(items[0].status).toBe('unknown')
    expect(items[0].requiresOperatorAction).toBe(false)
    expect(items[0].hasAdvisory).toBe(false)
    expect(items[0].hasDecisionContext).toBe(false)
    expect(items[0].startedAt).toBeUndefined()
    expect(items[0].lastUpdatedAt).toBeUndefined()
  })

  it('produces deterministic output for same input', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: 'a', status: 'resolved' },
      { incidentKey: 'b', status: 'active' },
    ]
    const first = createIncidentHistoryItems(raw)
    const second = createIncidentHistoryItems(raw)
    expect(first).toEqual(second)
  })

  it('normalizes invalid status to unknown', () => {
    const raw: RawIncidentDescriptor[] = [
      { incidentKey: 'x', status: 'invalid' as 'active' },
    ]
    const items = createIncidentHistoryItems(raw)
    expect(items[0].status).toBe('unknown')
  })
})
