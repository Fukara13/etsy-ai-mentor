import { describe, expect, it } from 'vitest';
import type { ZoneClassification } from '../zones';
import { AUTHORITY_DECISIONS } from './authority-decision';
import { deriveAuthorityDecision } from './derive-authority-decision';

function createZoneClassification(
  overrides: Partial<ZoneClassification> = {}
): ZoneClassification {
  return {
    zone: 'SAFE',
    allowsAiExecution: true,
    requiresHumanApproval: false,
    requiresEscalation: false,
    reason: 'safe test fixture',
    ...overrides,
  };
}

describe('deriveAuthorityDecision', () => {
  it('returns ALLOW_AI_FLOW for SAFE zone', () => {
    const input = createZoneClassification({
      zone: 'SAFE',
      allowsAiExecution: true,
      requiresHumanApproval: false,
      requiresEscalation: false,
      reason: 'safe path',
    });

    const result = deriveAuthorityDecision(input);

    expect(result).toEqual({
      decision: AUTHORITY_DECISIONS.ALLOW_AI_FLOW,
      allowsAiExecution: true,
      requiresHumanApproval: false,
      requiresEscalation: false,
      reason: 'SAFE zone allows controlled AI flow. safe path',
    });
  });

  it('returns REQUIRE_HUMAN_APPROVAL for RESTRICTED zone', () => {
    const input = createZoneClassification({
      zone: 'RESTRICTED',
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: false,
      reason: 'core engine touched',
    });

    const result = deriveAuthorityDecision(input);

    expect(result).toEqual({
      decision: AUTHORITY_DECISIONS.REQUIRE_HUMAN_APPROVAL,
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: false,
      reason:
        'RESTRICTED zone requires explicit human approval. core engine touched',
    });
  });

  it('returns BLOCK_AND_ESCALATE for RED zone', () => {
    const input = createZoneClassification({
      zone: 'RED',
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: true,
      reason: 'production or destructive action',
    });

    const result = deriveAuthorityDecision(input);

    expect(result).toEqual({
      decision: AUTHORITY_DECISIONS.BLOCK_AND_ESCALATE,
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: true,
      reason:
        'RED zone blocks AI flow and requires escalation. production or destructive action',
    });
  });

  it('is deterministic for identical SAFE input', () => {
    const input = createZoneClassification({
      zone: 'SAFE',
      reason: 'deterministic safe case',
    });

    const resultA = deriveAuthorityDecision(input);
    const resultB = deriveAuthorityDecision(input);

    expect(resultA).toEqual(resultB);
  });

  it('is deterministic for identical RESTRICTED input', () => {
    const input = createZoneClassification({
      zone: 'RESTRICTED',
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: false,
      reason: 'deterministic restricted case',
    });

    const resultA = deriveAuthorityDecision(input);
    const resultB = deriveAuthorityDecision(input);

    expect(resultA).toEqual(resultB);
  });

  it('is deterministic for identical RED input', () => {
    const input = createZoneClassification({
      zone: 'RED',
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: true,
      reason: 'deterministic red case',
    });

    const resultA = deriveAuthorityDecision(input);
    const resultB = deriveAuthorityDecision(input);

    expect(resultA).toEqual(resultB);
  });

  it('does not mutate SAFE input', () => {
    const input = createZoneClassification({
      zone: 'SAFE',
      reason: 'no mutation safe',
    });
    const before = structuredClone(input);

    deriveAuthorityDecision(input);

    expect(input).toEqual(before);
  });

  it('does not mutate RESTRICTED input', () => {
    const input = createZoneClassification({
      zone: 'RESTRICTED',
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: false,
      reason: 'no mutation restricted',
    });
    const before = structuredClone(input);

    deriveAuthorityDecision(input);

    expect(input).toEqual(before);
  });

  it('does not mutate RED input', () => {
    const input = createZoneClassification({
      zone: 'RED',
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: true,
      reason: 'no mutation red',
    });
    const before = structuredClone(input);

    deriveAuthorityDecision(input);

    expect(input).toEqual(before);
  });

  it('preserves SAFE authority semantics explicitly', () => {
    const input = createZoneClassification({
      zone: 'SAFE',
      allowsAiExecution: true,
      requiresHumanApproval: false,
      requiresEscalation: false,
      reason: 'safe semantics',
    });

    const result = deriveAuthorityDecision(input);

    expect(result.allowsAiExecution).toBe(true);
    expect(result.requiresHumanApproval).toBe(false);
    expect(result.requiresEscalation).toBe(false);
  });

  it('preserves RESTRICTED authority semantics explicitly', () => {
    const input = createZoneClassification({
      zone: 'RESTRICTED',
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: false,
      reason: 'restricted semantics',
    });

    const result = deriveAuthorityDecision(input);

    expect(result.allowsAiExecution).toBe(false);
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.requiresEscalation).toBe(false);
  });

  it('preserves RED authority semantics explicitly', () => {
    const input = createZoneClassification({
      zone: 'RED',
      allowsAiExecution: false,
      requiresHumanApproval: true,
      requiresEscalation: true,
      reason: 'red semantics',
    });

    const result = deriveAuthorityDecision(input);

    expect(result.allowsAiExecution).toBe(false);
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.requiresEscalation).toBe(true);
  });
});
