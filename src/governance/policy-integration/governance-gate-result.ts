/**
 * GH-5: Governance gate result for repair-engine consumption.
 */

import type { SecurityPolicyEffect } from '../security-policy';
import type { GovernanceGateDecision } from './governance-gate-decision';

export interface GovernanceGateResult {
  readonly decision: GovernanceGateDecision;
  readonly executionAllowed: boolean;
  readonly requiresOperatorReview: boolean;
  readonly requiresEscalation: boolean;
  readonly sourcePolicyEffect: SecurityPolicyEffect;
  readonly sourcePolicyRule: string;
}
