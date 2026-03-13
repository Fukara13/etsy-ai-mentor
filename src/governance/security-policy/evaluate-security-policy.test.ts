import { describe, expect, it } from 'vitest';
import type { RiskClassification } from '../risk';
import type { ZoneClassification } from '../zones';
import {
  evaluateSecurityPolicy,
  type SecurityPolicyContext,
} from './evaluate-security-policy';
import * as securityPolicy from './index';

function risk(overrides: Partial<RiskClassification> = {}): RiskClassification {
  return {
    level: 'LOW',
    requiresHumanApproval: false,
    reason: 'low risk',
    ...overrides,
  };
}

function zone(overrides: Partial<ZoneClassification> = {}): ZoneClassification {
  return {
    zone: 'SAFE',
    allowsAiExecution: true,
    requiresHumanApproval: false,
    requiresEscalation: false,
    reason: 'safe zone',
    ...overrides,
  };
}

describe('evaluateSecurityPolicy', () => {
  it('returns DENY_AND_ESCALATE for CRITICAL risk', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'CRITICAL', requiresHumanApproval: true, reason: 'secrets' }),
      zone: zone({ zone: 'SAFE' }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('DENY_AND_ESCALATE');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.requiresEscalation).toBe(true);
    expect(result.matchedRuleIds).toContain('critical-risk-deny');
    expect(result.reasons.some((r) => r.includes('CRITICAL'))).toBe(true);
  });

  it('returns DENY_AND_ESCALATE for RED zone', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'LOW' }),
      zone: zone({
        zone: 'RED',
        allowsAiExecution: false,
        requiresHumanApproval: true,
        requiresEscalation: true,
        reason: 'production',
      }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('DENY_AND_ESCALATE');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.requiresEscalation).toBe(true);
    expect(result.matchedRuleIds).toContain('escalated-zone-deny');
  });

  it('returns DENY_AND_ESCALATE when approval and escalation signals combine', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({
        level: 'HIGH',
        requiresHumanApproval: true,
        reason: 'core engine',
      }),
      zone: zone({
        zone: 'RED',
        requiresHumanApproval: true,
        requiresEscalation: true,
        reason: 'destructive',
      }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('DENY_AND_ESCALATE');
    expect(result.requiresEscalation).toBe(true);
  });

  it('returns REQUIRE_HUMAN_APPROVAL for MEDIUM restricted case', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({
        level: 'MEDIUM',
        requiresHumanApproval: true,
        reason: 'dependency update',
      }),
      zone: zone({
        zone: 'RESTRICTED',
        allowsAiExecution: false,
        requiresHumanApproval: true,
        requiresEscalation: false,
        reason: 'non-trivial',
      }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.requiresEscalation).toBe(false);
    expect(result.matchedRuleIds).toContain('human-approval-required');
  });

  it('returns REQUIRE_HUMAN_APPROVAL for HIGH restricted case', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({
        level: 'HIGH',
        requiresHumanApproval: true,
        reason: 'core engine',
      }),
      zone: zone({
        zone: 'RESTRICTED',
        requiresHumanApproval: true,
        requiresEscalation: false,
      }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(result.requiresHumanApproval).toBe(true);
  });

  it('returns ALLOW only for LOW + SAFE case', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'LOW', requiresHumanApproval: false, reason: 'test' }),
      zone: zone({
        zone: 'SAFE',
        allowsAiExecution: true,
        requiresHumanApproval: false,
        requiresEscalation: false,
        reason: 'test change',
      }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('ALLOW');
    expect(result.requiresHumanApproval).toBe(false);
    expect(result.requiresEscalation).toBe(false);
    expect(result.matchedRuleIds).toContain('safe-low-allow');
  });

  it('falls back conservatively to REQUIRE_HUMAN_APPROVAL', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'MEDIUM', requiresHumanApproval: false, reason: 'unknown' }),
      zone: zone({
        zone: 'SAFE',
        allowsAiExecution: true,
        requiresHumanApproval: false,
        requiresEscalation: false,
      }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(result.matchedRuleIds).toContain('conservative-default-approval');
  });

  it('returns deterministic matchedRuleIds', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'LOW' }),
      zone: zone({ zone: 'SAFE' }),
    };
    const a = evaluateSecurityPolicy(ctx);
    const b = evaluateSecurityPolicy(ctx);
    expect(a.matchedRuleIds).toEqual(b.matchedRuleIds);
  });

  it('returns deterministic reasons', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'CRITICAL', reason: 'secrets' }),
      zone: zone({ zone: 'RED' }),
    };
    const a = evaluateSecurityPolicy(ctx);
    const b = evaluateSecurityPolicy(ctx);
    expect(a.reasons).toEqual(b.reasons);
  });

  it('does not mutate input objects', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'LOW' }),
      zone: zone({ zone: 'SAFE' }),
    };
    const before = structuredClone(ctx);
    evaluateSecurityPolicy(ctx);
    expect(ctx).toEqual(before);
  });

  it('repeated calls return identical outputs', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'HIGH', requiresHumanApproval: true }),
      zone: zone({ zone: 'RESTRICTED' }),
    };
    const a = evaluateSecurityPolicy(ctx);
    const b = evaluateSecurityPolicy(ctx);
    expect(a).toEqual(b);
  });

  it('result booleans align with effect ALLOW', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'LOW', requiresHumanApproval: false }),
      zone: zone({ zone: 'SAFE', requiresHumanApproval: false, requiresEscalation: false }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('ALLOW');
    expect(result.requiresHumanApproval).toBe(false);
    expect(result.requiresEscalation).toBe(false);
  });

  it('result booleans align with effect REQUIRE_HUMAN_APPROVAL', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'MEDIUM', requiresHumanApproval: true }),
      zone: zone({ zone: 'RESTRICTED', requiresHumanApproval: true, requiresEscalation: false }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('REQUIRE_HUMAN_APPROVAL');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.requiresEscalation).toBe(false);
  });

  it('result booleans align with effect DENY_AND_ESCALATE', () => {
    const ctx: SecurityPolicyContext = {
      risk: risk({ level: 'CRITICAL', requiresHumanApproval: true }),
      zone: zone({ zone: 'SAFE' }),
    };
    const result = evaluateSecurityPolicy(ctx);
    expect(result.effect).toBe('DENY_AND_ESCALATE');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.requiresEscalation).toBe(true);
  });

  it('barrel export works', () => {
    expect(typeof securityPolicy.evaluateSecurityPolicy).toBe('function');
    expect(securityPolicy.evaluateSecurityPolicy).toBe(evaluateSecurityPolicy);
  });
});
