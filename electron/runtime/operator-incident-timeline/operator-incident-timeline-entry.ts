/**
 * OC-11: Single entry in the operator incident timeline.
 */

import type { OperatorIncidentTimelineStage } from './operator-incident-timeline-stage'
import type { OperatorIncidentTimelineStatus } from './operator-incident-timeline-status'

export interface OperatorIncidentTimelineEntry {
  readonly stage: OperatorIncidentTimelineStage
  readonly status: OperatorIncidentTimelineStatus
  readonly order: number
  readonly headline: string
  readonly detail: string
  readonly hasAdvisoryImpact: boolean
}

