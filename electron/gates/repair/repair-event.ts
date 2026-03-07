/**
 * Gate-S19: Runtime events for repair state machine.
 */

export const REPAIR_EVENTS = [
  'CI_FAILURE_START',
  'ANALYSIS_COMPLETED',
  'COACH_COMPLETED',
  'JULES_FROZEN_OUTCOME',
  'JULES_PATCH_PRODUCED',
  'GUARDIAN_COMPLETED',
  'EVALUATOR_PASSED',
  'EVALUATOR_FAILED',
  'CI_RETRY_COMPLETED',
  'RETRY_LIMIT_REACHED',
  'PLAN_REQUIRES_HUMAN',
  'HUMAN_ESCALATION',
] as const;

export type RepairEvent = (typeof REPAIR_EVENTS)[number];
