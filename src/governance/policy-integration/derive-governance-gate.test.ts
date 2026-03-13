import { describe, expect, it } from 'vitest';
import type { SecurityPolicyResult } from '../security-policy';
import { GOVERNANCE_GATE_DECISIONS } from './governance-gate-decision';
import { deriveGovernanceGate } from './derive-governance-gate';

function policy(overrides: Partial<SecurityPolicyResult> = {}): SecurityPolicyResult {
  return Object.freeze({
    effect: 'ALLOW',
    requiresHumanApproval: false,
    requiresEscalation: false,
    matchedRuleIds: ['safe-low-allow'],
    reasons: ['SAFE zone with LOW risk'],
    ...overrides,
  });
}

describe('deriveGovernanceGate', () => {
  it('ALLOW maps to ALLOW_EXECUTION with correct flags', () => {
    const input = policy({
      effect: 'ALLOW',
      requiresHumanApproval: false,
      requiresEscalation: false,
      matchedRuleIds: ['safe-low-allow'],
      reasons: ['ok'],
    });

    const result = deriveGovernanceGate(input);

    expect(result.decision).toBe(GOVERNANCE_GATE_DECISIONS.ALLOW_EXECUTION);
    expect(result.executionAllowed).toBe(true);
    expect(result.requiresOperatorReview).toBe(false);
    expect(result.requiresEscalation).toBe(false);
    expect(result.sourcePolicyEffect).toBe('ALLOW');
    expect(result.sourcePolicyRule).toBe('safe-low-allow');
  });

  it('REQUIRE_HUMAN_APPROVAL maps to REQUIRE_OPERATOR_REVIEW', () => {
    const input = policy({
      effect: 'REQUIRE_HUMAN_APPROVAL',
      requiresHumanApproval: true,
      requiresEscalation: false,
      matchedRuleIds: ['human-approval-required'],
      reasons: ['review needed'],
    });

    const result = deriveGovernanceGate(input);

    expect(result.decision).toBe(GOVERNANCE_GATE_DECISIONS.REQUIRE_OPERATOR_REVIEW);
    expect(result.executionAllowed).toBe(false);
    expect(result.requiresOperatorReview).toBe(true);
    expect(result.requiresEscalation).toBe(false);
  });

  it('DENY_AND_ESCALATE maps to BLOCK_AND_ESCALATE', () => {
    const input = policy({
      effect: 'DENY_AND_ESCALATE',
      requiresHumanApproval: true,
      requiresEscalation: true,
      matchedRuleIds: ['critical-risk-deny'],
      reasons: ['CRITICAL risk'],
    });

    const result = deriveGovernanceGate(input);

    expect(result.decision).toBe(GOVERNANCE_GATE_DECISIONS.BLOCK_AND_ESCALATE);
    expect(result.executionAllowed).toBe(false);
    expect(result.requiresOperatorReview).toBe(true);
    expect(result.requiresEscalation).toBe(true);
  });

  it('same input yields deep-equal output (determinism)', () => {
    const input = policy({ effect: 'ALLOW', matchedRuleIds: ['safe-low-allow'] });

    const a = deriveGovernanceGate(input);
    const b = deriveGovernanceGate(input);

    expect(a).toEqual(b);
  });

  it('does not mutate input', () => {
    const input = policy({ effect: 'REQUIRE_HUMAN_APPROVAL', matchedRuleIds: ['human-approval-required'] });
    const before = structuredClone(input);

    deriveGovernanceGate(input);

    expect(input).toEqual(before);
  });

  it('passes through first matched rule as sourcePolicyRule', () => {
    const input = policy({
      effect: 'DENY_AND_ESCALATE',
      matchedRuleIds: ['escalated-zone-deny', 'other'],
    });

    const result = deriveGovernanceGate(input);

    expect(result.sourcePolicyRule).toBe('escalated-zone-deny');
  });

  it('escalation true implies requiresOperatorReview true', () => {
    const input = policy({
      effect: 'DENY_AND_ESCALATE',
      requiresEscalation: true,
      matchedRuleIds: ['critical-risk-deny'],
    });

    const result = deriveGovernanceGate(input);

    expect(result.requiresEscalation).toBe(true);
    expect(result.requiresOperatorReview).toBe(true);
  });

  it('executionAllowed true implies escalation false and operator review false', () => {
    const input = policy({
      effect: 'ALLOW',
      matchedRuleIds: ['safe-low-allow'],
    });

    const result = deriveGovernanceGate(input);

    expect(result.executionAllowed).toBe(true);
    expect(result.requiresEscalation).toBe(false);
    expect(result.requiresOperatorReview).toBe(false);
  });

  it('empty matchedRuleIds yields sourcePolicyRule unknown', () => {
    const input = policy({
      effect: 'ALLOW',
      matchedRuleIds: [],
    });

    const result = deriveGovernanceGate(input);

    expect(result.sourcePolicyRule).toBe('unknown');
  });
});
