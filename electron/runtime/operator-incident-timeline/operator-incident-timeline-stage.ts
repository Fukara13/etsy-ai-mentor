/**
 * OC-11: Stable stage model for operator incident timeline.
 * Kapalı küme; sıralama olay akışını takip eder.
 */

export const INCIDENT_TIMELINE_STAGES = [
  'webhook-intake',
  'event-normalized',
  'pr-inspection',
  'repair-intake',
  'hero-analysis',
  'governance',
  'advisory-projected',
  'incident-ready',
] as const

export type OperatorIncidentTimelineStage = (typeof INCIDENT_TIMELINE_STAGES)[number]

export function getIncidentTimelineStageOrder(): readonly OperatorIncidentTimelineStage[] {
  return INCIDENT_TIMELINE_STAGES
}

