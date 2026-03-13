/**
 * GH-5: Maps SecurityPolicyResult to repair-engine consumable gate decision.
 * Pure, deterministic, no input mutation.
 */

import type {
  SecurityPolicyEffect,
  SecurityPolicyResult,
} from '../security-policy';
import { GOVERNANCE_GATE_DECISIONS } from './governance-gate-decision';
import type { GovernanceGateResult } from './governance-gate-result';

function createResult(
  decision: GovernanceGateResult['decision'],
  executionAllowed: boolean,
  requiresOperatorReview: boolean,
  requiresEscalation: boolean,
  sourcePolicyEffect: SecurityPolicyEffect,
  sourcePolicyRule: string
): GovernanceGateResult {
  return Object.freeze({
    decision,
    executionAllowed,
    requiresOperatorReview,
    requiresEscalation,
    sourcePolicyEffect,
    sourcePolicyRule,
  });
}

/**
 * Derives governance gate result from security policy result.
 * Unknown effect → conservative BLOCK_AND_ESCALATE.
 */
export function deriveGovernanceGate(
  policy: SecurityPolicyResult
): GovernanceGateResult {
  const sourcePolicyRule =
    policy.matchedRuleIds.length > 0 ? policy.matchedRuleIds[0] : 'unknown';

  switch (policy.effect) {
    case 'ALLOW':
      return createResult(
        GOVERNANCE_GATE_DECISIONS.ALLOW_EXECUTION,
        true,
        false,
        false,
        'ALLOW',
        sourcePolicyRule
      );

    case 'REQUIRE_HUMAN_APPROVAL':
      return createResult(
        GOVERNANCE_GATE_DECISIONS.REQUIRE_OPERATOR_REVIEW,
        false,
        true,
        false,
        'REQUIRE_HUMAN_APPROVAL',
        sourcePolicyRule
      );

    case 'DENY_AND_ESCALATE':
      return createResult(
        GOVERNANCE_GATE_DECISIONS.BLOCK_AND_ESCALATE,
        false,
        true,
        true,
        'DENY_AND_ESCALATE',
        sourcePolicyRule
      );

    default: {
      return createResult(
        GOVERNANCE_GATE_DECISIONS.BLOCK_AND_ESCALATE,
        false,
        true,
        true,
        'DENY_AND_ESCALATE',
        sourcePolicyRule
      );
    }
  }
}
