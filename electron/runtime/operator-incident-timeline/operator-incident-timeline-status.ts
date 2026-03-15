/**
 * OC-11: Status model for incident timeline stages.
 */

export const INCIDENT_TIMELINE_STATUSES = [
  'completed',
  'active',
  'not-reached',
  'unknown',
] as const

export type OperatorIncidentTimelineStatus = (typeof INCIDENT_TIMELINE_STATUSES)[number]

