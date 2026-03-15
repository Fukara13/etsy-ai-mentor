/**
 * OC-11: Canonical operator incident timeline projection.
 */

import type { OperatorIncidentTimelineStage } from './operator-incident-timeline-stage'
import type { OperatorIncidentTimelineEntry } from './operator-incident-timeline-entry'

export interface OperatorIncidentTimelineSummary {
  readonly totalStages: number
  readonly completedStages: number
  readonly activeStage: OperatorIncidentTimelineStage | null
  readonly advisoryReached: boolean
}

export interface OperatorIncidentTimeline {
  readonly hasIncident: boolean
  readonly incidentKey: string | null
  readonly currentStage: OperatorIncidentTimelineStage | null
  readonly entries: readonly OperatorIncidentTimelineEntry[]
  readonly summary: OperatorIncidentTimelineSummary
}

