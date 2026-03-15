/**
 * OC-13: Stable stage model for operator decision timeline.
 * Operator decision flow only; fixed order.
 */

export const DECISION_TIMELINE_STAGES = [
  'incident-detected',
  'advisory-available',
  'decision-context-ready',
  'operator-review-active',
  'decision-pending',
  'decision-resolved',
] as const

export type OperatorDecisionTimelineStage = (typeof DECISION_TIMELINE_STAGES)[number]

export function getDecisionTimelineStageOrder(): readonly OperatorDecisionTimelineStage[] {
  return DECISION_TIMELINE_STAGES
}
