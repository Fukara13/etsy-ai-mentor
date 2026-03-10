/**
 * RE-1: Repair lifecycle state contract.
 * Readonly tuple and union type for state machine states.
 */

export const REPAIR_LIFECYCLE_STATES = [
  'IDLE',
  'FAILURE_DETECTED',
  'ANALYZING',
  'STRATEGY_READY',
  'AWAITING_HUMAN_REVIEW',
  'APPROVED',
  'REJECTED',
  'ESCALATED',
  'CLOSED',
] as const

export type RepairLifecycleState = (typeof REPAIR_LIFECYCLE_STATES)[number]
