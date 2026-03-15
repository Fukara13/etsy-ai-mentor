/**
 * OC-16: Pure derivation of operator timeline panel surface.
 * Composes existing read models into a single panel surface.
 */

import type { OperatorIncidentTimeline } from '../operator-incident-timeline'
import type { OperatorAdvisoryEvolutionTimeline } from '../operator-advisory-evolution'
import type { OperatorDecisionTimeline } from '../operator-decision-timeline'
import type { OperatorIncidentHistorySurface } from '../operator-incident-history'
import type {
  OperatorTimelinePanelSurface,
  OperatorTimelinePanelSummary,
} from './types'

export interface OperatorTimelinePanelInput {
  readonly incidentTimeline: OperatorIncidentTimeline
  readonly advisoryEvolutionTimeline: OperatorAdvisoryEvolutionTimeline
  readonly decisionTimeline: OperatorDecisionTimeline
  readonly incidentHistory: OperatorIncidentHistorySurface
}

export function deriveOperatorTimelinePanelSurface(
  input: OperatorTimelinePanelInput
): OperatorTimelinePanelSurface {
  const { incidentTimeline, advisoryEvolutionTimeline, decisionTimeline, incidentHistory } =
    input

  const currentIncidentKey =
    incidentTimeline.incidentKey ?? advisoryEvolutionTimeline.incidentKey ?? null

  const hasActiveIncident =
    incidentTimeline.hasIncident ||
    advisoryEvolutionTimeline.hasAdvisory ||
    decisionTimeline.hasDecisionContext

  const summary = deriveSummary(incidentHistory, decisionTimeline)

  return {
    currentIncidentKey,
    hasActiveIncident,
    incidentTimeline,
    advisoryEvolutionTimeline,
    decisionTimeline,
    incidentHistory,
    summary,
  }
}

function deriveSummary(
  incidentHistory: OperatorIncidentHistorySurface,
  decisionTimeline: OperatorDecisionTimeline
): OperatorTimelinePanelSummary {
  const totalHistoryItems = incidentHistory.totalCount
  const activeHistoryItems = incidentHistory.activeCount
  const requiresOperatorActionCount = incidentHistory.requiresAttentionCount

  const latestIncidentUpdateAt =
    typeof incidentHistory.lastUpdatedAt === 'number'
      ? incidentHistory.lastUpdatedAt
      : null

  const latestDecisionAt: number | null = null

  return {
    totalHistoryItems,
    activeHistoryItems,
    requiresOperatorActionCount,
    latestDecisionAt,
    latestIncidentUpdateAt,
  }
}

