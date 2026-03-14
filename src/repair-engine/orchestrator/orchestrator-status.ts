/**
 * RE-9: Orchestration completion status.
 */

export const ORCHESTRATOR_STATUSES = [
  'COMPLETED',
  'COMPLETED_WITH_OPERATOR_REVIEW',
  'COMPLETED_WITH_ESCALATION',
] as const;

export type OrchestratorStatus = (typeof ORCHESTRATOR_STATUSES)[number];
