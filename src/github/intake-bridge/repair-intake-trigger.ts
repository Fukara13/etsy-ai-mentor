/**
 * GH-9: Repair intake trigger types for bridge output.
 */

export type RepairIntakeTrigger =
  | 'GITHUB_WORKFLOW_FAILURE'
  | 'GITHUB_PR_RISK_SIGNAL'
  | 'GITHUB_PR_REVIEW_REQUIRED'
  | 'UNKNOWN';

export const REPAIR_INTAKE_TRIGGERS: readonly RepairIntakeTrigger[] = [
  'GITHUB_WORKFLOW_FAILURE',
  'GITHUB_PR_RISK_SIGNAL',
  'GITHUB_PR_REVIEW_REQUIRED',
  'UNKNOWN',
] as const;
