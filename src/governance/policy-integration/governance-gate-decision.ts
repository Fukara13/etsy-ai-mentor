/**
 * GH-5: Governance gate decision type for repair-engine integration.
 */

export type GovernanceGateDecision =
  | 'ALLOW_EXECUTION'
  | 'REQUIRE_OPERATOR_REVIEW'
  | 'BLOCK_AND_ESCALATE';

export const GOVERNANCE_GATE_DECISIONS = {
  ALLOW_EXECUTION: 'ALLOW_EXECUTION',
  REQUIRE_OPERATOR_REVIEW: 'REQUIRE_OPERATOR_REVIEW',
  BLOCK_AND_ESCALATE: 'BLOCK_AND_ESCALATE',
} as const;
