/**
 * OC-16: Tests for deriveOperatorTimelinePanelSurface.
 */

import { describe, it, expect } from 'vitest'
import type { OperatorIncidentTimeline } from '../operator-incident-timeline'
import type { OperatorAdvisoryEvolutionTimeline } from '../operator-advisory-evolution'
import type { OperatorDecisionTimeline } from '../operator-decision-timeline'
import type { OperatorIncidentHistorySurface } from '../operator-incident-history'
import { deriveOperatorTimelinePanelSurface } from './derive-operator-timeline-panel-surface'

function makeIncidentTimeline(overrides: Partial<OperatorIncidentTimeline> = {}): OperatorIncidentTimeline {
  const base: OperatorIncidentTimeline = {
    hasIncident: false,
    incidentKey: null,
    currentStage: null,
    entries: [],
    summary: {
      totalStages: 0,
      completedStages: 0,
      activeStage: null,
      advisoryReached: false,
    },
  }
  return { ...base, ...overrides }
}

function makeAdvisoryEvolutionTimeline(
  overrides: Partial<OperatorAdvisoryEvolutionTimeline> = {}
): OperatorAdvisoryEvolutionTimeline {
  const base: OperatorAdvisoryEvolutionTimeline = {
    hasAdvisory: false,
    incidentKey: null,
    currentStage: null,
    entries: [],
    summary: '',
  }
  return { ...base, ...overrides }
}

function makeDecisionTimeline(
  overrides: Partial<OperatorDecisionTimeline> = {}
): OperatorDecisionTimeline {
  const base: OperatorDecisionTimeline = {
    hasDecisionContext: false,
    incidentKey: null,
    currentStage: 'unknown',
    entries: [],
    summary: '',
    requiresOperatorAction: false,
  }
  return { ...base, ...overrides }
}

function makeIncidentHistory(
  overrides: Partial<OperatorIncidentHistorySurface> = {}
): OperatorIncidentHistorySurface {
  const base: OperatorIncidentHistorySurface = {
    items: [],
    totalCount: 0,
    activeCount: 0,
    resolvedCount: 0,
    requiresAttentionCount: 0,
    summary: 'No incidents.',
  }
  return { ...base, ...overrides }
}

describe('deriveOperatorTimelinePanelSurface', () => {
  it('composes provided surfaces and propagates references', () => {
    const incidentTimeline = makeIncidentTimeline({ hasIncident: true, incidentKey: 'inc-1' })
    const advisoryEvolutionTimeline = makeAdvisoryEvolutionTimeline({ hasAdvisory: true })
    const decisionTimeline = makeDecisionTimeline({ hasDecisionContext: true })
    const incidentHistory = makeIncidentHistory({ totalCount: 2, activeCount: 1 })

    const panel = deriveOperatorTimelinePanelSurface({
      incidentTimeline,
      advisoryEvolutionTimeline,
      decisionTimeline,
      incidentHistory,
    })

    expect(panel.incidentTimeline).toBe(incidentTimeline)
    expect(panel.advisoryEvolutionTimeline).toBe(advisoryEvolutionTimeline)
    expect(panel.decisionTimeline).toBe(decisionTimeline)
    expect(panel.incidentHistory).toBe(incidentHistory)
    expect(panel.currentIncidentKey).toBe('inc-1')
    expect(panel.hasActiveIncident).toBe(true)
  })

  it('computes summary from incident history and decision timeline', () => {
    const panel = deriveOperatorTimelinePanelSurface({
      incidentTimeline: makeIncidentTimeline(),
      advisoryEvolutionTimeline: makeAdvisoryEvolutionTimeline(),
      decisionTimeline: makeDecisionTimeline({ requiresOperatorAction: true }),
      incidentHistory: makeIncidentHistory({
        totalCount: 3,
        activeCount: 2,
        requiresAttentionCount: 1,
        lastUpdatedAt: 123,
      }),
    })

    expect(panel.summary.totalHistoryItems).toBe(3)
    expect(panel.summary.activeHistoryItems).toBe(2)
    expect(panel.summary.requiresOperatorActionCount).toBe(1)
    expect(panel.summary.latestIncidentUpdateAt).toBe(123)
    expect(panel.summary.latestDecisionAt).toBeNull()
  })

  it('handles empty state safely', () => {
    const panel = deriveOperatorTimelinePanelSurface({
      incidentTimeline: makeIncidentTimeline(),
      advisoryEvolutionTimeline: makeAdvisoryEvolutionTimeline(),
      decisionTimeline: makeDecisionTimeline(),
      incidentHistory: makeIncidentHistory(),
    })

    expect(panel.currentIncidentKey).toBeNull()
    expect(panel.hasActiveIncident).toBe(false)
    expect(panel.summary.totalHistoryItems).toBe(0)
    expect(panel.summary.latestIncidentUpdateAt).toBeNull()
  })

  it('does not mutate inputs', () => {
    const incidentTimeline = makeIncidentTimeline()
    const advisoryEvolutionTimeline = makeAdvisoryEvolutionTimeline()
    const decisionTimeline = makeDecisionTimeline()
    const incidentHistory = makeIncidentHistory()

    const copy = {
      incidentTimeline: { ...incidentTimeline },
      advisoryEvolutionTimeline: { ...advisoryEvolutionTimeline },
      decisionTimeline: { ...decisionTimeline },
      incidentHistory: { ...incidentHistory },
    }

    deriveOperatorTimelinePanelSurface({
      incidentTimeline,
      advisoryEvolutionTimeline,
      decisionTimeline,
      incidentHistory,
    })

    expect(incidentTimeline).toEqual(copy.incidentTimeline)
    expect(advisoryEvolutionTimeline).toEqual(copy.advisoryEvolutionTimeline)
    expect(decisionTimeline).toEqual(copy.decisionTimeline)
    expect(incidentHistory).toEqual(copy.incidentHistory)
  })
})

