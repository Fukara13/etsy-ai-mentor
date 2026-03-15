/**
 * OC-13: Single entry in the operator decision timeline.
 */

import type { OperatorDecisionTimelineStage } from './operator-decision-timeline-stage'

export const DECISION_TIMELINE_ENTRY_STATUSES = [
  'completed',
  'active',
  'not-reached',
  'unknown',
] as const

export type OperatorDecisionTimelineEntryStatus = (typeof DECISION_TIMELINE_ENTRY_STATUSES)[number]

export interface OperatorDecisionTimelineEntry {
  readonly stage: OperatorDecisionTimelineStage
  readonly status: OperatorDecisionTimelineEntryStatus
  readonly order: number
  readonly headline: string
  readonly detail: string
  readonly isDecisionPoint: boolean
  readonly requiresOperatorAction: boolean
}
