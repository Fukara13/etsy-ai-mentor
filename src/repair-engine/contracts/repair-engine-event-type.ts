/**
 * RE-2: Supported external event types for repair engine intake.
 */

export const REPAIR_ENGINE_EVENT_TYPES = [
  'CI_FAILURE',
  'PR_UPDATED',
  'MANUAL_ANALYSIS_REQUESTED',
] as const

export type RepairEngineEventType = (typeof REPAIR_ENGINE_EVENT_TYPES)[number]
