/**
 * RE-11: Governance runtime result. Aligned with GovernanceGateResult.
 */

import type { SecurityPolicyEffect } from '../../governance/security-policy';

export type GovernanceRuntimeResult = {
  readonly decision: 'ALLOW_EXECUTION' | 'REQUIRE_OPERATOR_REVIEW' | 'BLOCK_AND_ESCALATE';
  readonly executionAllowed: boolean;
  readonly requiresOperatorReview: boolean;
  readonly requiresEscalation: boolean;
  readonly sourcePolicyEffect: SecurityPolicyEffect;
  readonly sourcePolicyRule: string;
};
