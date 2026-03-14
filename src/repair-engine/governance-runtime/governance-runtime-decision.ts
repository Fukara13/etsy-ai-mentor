/**
 * RE-11: Governance runtime decision type. Aligned with GovernanceGateDecision.
 */

export type GovernanceRuntimeDecision =
  | 'ALLOW_EXECUTION'
  | 'REQUIRE_OPERATOR_REVIEW'
  | 'BLOCK_AND_ESCALATE';

export const GOVERNANCE_RUNTIME_DECISIONS = {
  ALLOW_EXECUTION: 'ALLOW_EXECUTION',
  REQUIRE_OPERATOR_REVIEW: 'REQUIRE_OPERATOR_REVIEW',
  BLOCK_AND_ESCALATE: 'BLOCK_AND_ESCALATE',
} as const;
