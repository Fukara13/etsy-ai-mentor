/**
 * OC-16: Tests for readOperatorTimelinePanelSurface.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadIncidentTimeline = vi.fn()
const mockReadAdvisoryEvolution = vi.fn()
const mockReadDecisionTimeline = vi.fn()
const mockReadIncidentHistory = vi.fn()
const mockDerivePanel = vi.fn()

vi.mock('../operator-incident-timeline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-incident-timeline')>()
  return {
    ...actual,
    readOperatorIncidentTimeline: (...args: unknown[]) =>
      mockReadIncidentTimeline(...args),
  }
})

vi.mock('../operator-advisory-evolution', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-advisory-evolution')>()
  return {
    ...actual,
    readOperatorAdvisoryEvolutionTimeline: (...args: unknown[]) =>
      mockReadAdvisoryEvolution(...args),
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

vi.mock('../operator-incident-history', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-incident-history')>()
  return {
    ...actual,
    readIncidentHistorySurface: (...args: unknown[]) =>
      mockReadIncidentHistory(...args),
  }
})

vi.mock('./derive-operator-timeline-panel-surface', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('./derive-operator-timeline-panel-surface')
  >()
  return {
    ...actual,
    deriveOperatorTimelinePanelSurface: (...args: unknown[]) =>
      mockDerivePanel(...args),
  }
})

import { readOperatorTimelinePanelSurface } from './read-operator-timeline-panel-surface'

describe('readOperatorTimelinePanelSurface', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads all sub-surfaces and passes them to derive function', () => {
    const incidentTimeline = { hasIncident: true } as unknown as object
    const advisoryEvolutionTimeline = { hasAdvisory: true } as unknown as object
    const decisionTimeline = { hasDecisionContext: true } as unknown as object
    const incidentHistory = { totalCount: 1 } as unknown as object
    const derived = { summary: { totalHistoryItems: 1 } }

    mockReadIncidentTimeline.mockReturnValue(incidentTimeline)
    mockReadAdvisoryEvolution.mockReturnValue(advisoryEvolutionTimeline)
    mockReadDecisionTimeline.mockReturnValue(decisionTimeline)
    mockReadIncidentHistory.mockReturnValue(incidentHistory)
    mockDerivePanel.mockReturnValue(derived)

    const result = readOperatorTimelinePanelSurface()

    expect(mockReadIncidentTimeline).toHaveBeenCalled()
    expect(mockReadAdvisoryEvolution).toHaveBeenCalled()
    expect(mockReadDecisionTimeline).toHaveBeenCalled()
    expect(mockReadIncidentHistory).toHaveBeenCalled()
    expect(mockDerivePanel).toHaveBeenCalledWith({
      incidentTimeline,
      advisoryEvolutionTimeline,
      decisionTimeline,
      incidentHistory,
    })
    expect(result).toBe(derived)
  })
})

