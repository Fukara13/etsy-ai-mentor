/**
 * OC-13: Canonical operator decision timeline projection.
 */

import type { OperatorDecisionTimelineStage } from './operator-decision-timeline-stage'
import type { OperatorDecisionTimelineEntry } from './operator-decision-timeline-entry'

export type OperatorDecisionTimelineCurrentStage =
  | OperatorDecisionTimelineStage
  | 'unknown'

export interface OperatorDecisionTimeline {
  readonly hasDecisionContext: boolean
  readonly incidentKey: string | null
  readonly currentStage: OperatorDecisionTimelineCurrentStage
  readonly entries: readonly OperatorDecisionTimelineEntry[]
  readonly summary: string
  readonly requiresOperatorAction: boolean
}
