/**
 * OC-14: Tests for readIncidentHistorySurface wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadIncidentTimeline = vi.fn()
const mockReadDecisionTimeline = vi.fn()

vi.mock('../operator-incident-timeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-incident-timeline')>()
  return {
    ...actual,
    readOperatorIncidentTimeline: (...args: unknown[]) =>
      mockReadIncidentTimeline(...args),
  }
})

vi.mock('../operator-decision-timeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-decision-timeline')>()
  return {
    ...actual,
    readOperatorDecisionTimeline: (...args: unknown[]) =>
      mockReadDecisionTimeline(...args),
  }
})

import { readIncidentHistorySurface } from './read-incident-history-surface'

describe('readIncidentHistorySurface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty surface when no incident', () => {
    mockReadIncidentTimeline.mockReturnValue({
      hasIncident: false,
      incidentKey: null,
      summary: { advisoryReached: false },
      entries: [],
    })
    mockReadDecisionTimeline.mockReturnValue({
      hasDecisionContext: false,
      requiresOperatorAction: false,
    })

    const surface = readIncidentHistorySurface()

    expect(mockReadIncidentTimeline).toHaveBeenCalled()
    expect(mockReadDecisionTimeline).toHaveBeenCalled()
    expect(surface.items).toHaveLength(0)
    expect(surface.totalCount).toBe(0)
    expect(surface.summary).toBe('No incidents.')
  })

  it('returns one item when incident timeline has incident', () => {
    mockReadIncidentTimeline.mockReturnValue({
      hasIncident: true,
      incidentKey: null,
      summary: { advisoryReached: true },
      entries: [{ stage: 'incident-ready', headline: 'Ready' }],
    })
    mockReadDecisionTimeline.mockReturnValue({
      hasDecisionContext: true,
      requiresOperatorAction: true,
    })

    const surface = readIncidentHistorySurface()

    expect(surface.items).toHaveLength(1)
    expect(surface.items[0].incidentKey).toBe('current')
    expect(surface.items[0].title).toContain('advisory ready')
    expect(surface.items[0].requiresOperatorAction).toBe(true)
    expect(surface.items[0].hasAdvisory).toBe(true)
    expect(surface.items[0].hasDecisionContext).toBe(true)
    expect(surface.totalCount).toBe(1)
  })

  it('returns expected projection shape', () => {
    mockReadIncidentTimeline.mockReturnValue({ hasIncident: false, incidentKey: null, summary: {}, entries: [] })
    mockReadDecisionTimeline.mockReturnValue({})

    const surface = readIncidentHistorySurface()

    expect(surface).toHaveProperty('items')
    expect(surface).toHaveProperty('totalCount')
    expect(surface).toHaveProperty('activeCount')
    expect(surface).toHaveProperty('resolvedCount')
    expect(surface).toHaveProperty('requiresAttentionCount')
    expect(surface).toHaveProperty('summary')
  })
})
