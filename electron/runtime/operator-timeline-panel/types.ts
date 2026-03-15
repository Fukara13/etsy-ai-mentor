/**
 * OC-16: Unified operator timeline panel surface types.
 * Pure composition over existing timeline/history read models.
 */

import type { OperatorIncidentTimeline } from '../operator-incident-timeline'
import type { OperatorAdvisoryEvolutionTimeline } from '../operator-advisory-evolution'
import type { OperatorDecisionTimeline } from '../operator-decision-timeline'
import type { OperatorIncidentHistorySurface } from '../operator-incident-history'

export interface OperatorTimelinePanelSummary {
  readonly totalHistoryItems: number
  readonly activeHistoryItems: number
  readonly requiresOperatorActionCount: number
  readonly latestDecisionAt: number | null
  readonly latestIncidentUpdateAt: number | null
}

export interface OperatorTimelinePanelSurface {
  readonly currentIncidentKey: string | null
  readonly hasActiveIncident: boolean
  readonly incidentTimeline: OperatorIncidentTimeline
  readonly advisoryEvolutionTimeline: OperatorAdvisoryEvolutionTimeline
  readonly decisionTimeline: OperatorDecisionTimeline
  readonly incidentHistory: OperatorIncidentHistorySurface
  readonly summary: OperatorTimelinePanelSummary
}

