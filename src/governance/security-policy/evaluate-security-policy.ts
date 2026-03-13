/**
 * GH-4: Deterministic security policy evaluation.
 * Pure, no I/O, no mutation.
 */

import type { RiskClassification } from '../risk';
import type { ZoneClassification } from '../zones';
import type { SecurityPolicyEffect } from './security-policy-effect';
import type { SecurityPolicyResult } from './security-policy-result';

export interface SecurityPolicyContext {
  readonly risk: RiskClassification;
  readonly zone: ZoneClassification;
}

function createResult(
  effect: SecurityPolicyEffect,
  ruleIds: readonly string[],
  reasons: readonly string[]
): SecurityPolicyResult {
  const requiresHumanApproval = effect !== 'ALLOW';
  const requiresEscalation = effect === 'DENY_AND_ESCALATE';
  return Object.freeze({
    effect,
    requiresHumanApproval,
    requiresEscalation,
    matchedRuleIds: Object.freeze([...ruleIds]),
    reasons: Object.freeze([...reasons]),
  });
}

/**
 * Evaluates security policy from risk and zone classifications.
 * Priority: DENY_AND_ESCALATE > REQUIRE_HUMAN_APPROVAL > ALLOW
 */
export function evaluateSecurityPolicy(
  context: SecurityPolicyContext
): SecurityPolicyResult {
  const { risk, zone } = context;

  if (risk.level === 'CRITICAL') {
    return createResult(
      'DENY_AND_ESCALATE',
      ['critical-risk-deny'],
      ['CRITICAL risk level triggers denial and escalation', risk.reason]
    );
  }

  if (risk.requiresHumanApproval && zone.requiresEscalation) {
    return createResult(
      'DENY_AND_ESCALATE',
      ['escalated-zone-deny'],
      [
        'Risk requires human approval and zone requires escalation',
        risk.reason,
        zone.reason,
      ]
    );
  }

  if (zone.zone === 'RED') {
    return createResult(
      'DENY_AND_ESCALATE',
      ['escalated-zone-deny'],
      ['RED zone triggers denial and escalation', zone.reason]
    );
  }

  if (risk.requiresHumanApproval || zone.requiresHumanApproval) {
    return createResult(
      'REQUIRE_HUMAN_APPROVAL',
      ['human-approval-required'],
      ['Human approval required', risk.reason, zone.reason].filter(Boolean)
    );
  }

  if (zone.zone === 'SAFE' && risk.level === 'LOW') {
    return createResult(
      'ALLOW',
      ['safe-low-allow'],
      ['SAFE zone with LOW risk allows execution', zone.reason, risk.reason]
    );
  }

  return createResult(
    'REQUIRE_HUMAN_APPROVAL',
    ['conservative-default-approval'],
    ['Conservative default: human approval required']
  );
}
