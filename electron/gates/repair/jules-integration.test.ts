/**
 * Gate-S11: Deterministic tests for Jules Patch Integration.
 * No merge path. Write actor = Jules. Human final authority.
 */

import { describe, it, expect } from 'vitest';
import { buildJulesPatchRequest, integrateJules } from './jules-integration';

const coach: { ok: boolean; guidance: string; scope?: readonly string[] } = {
  ok: true,
  guidance: 'Fix the flaky test in src/foo.test.ts',
  scope: ['src/foo.test.ts'],
};

describe('Gate-S11: patch request is built from coach output', () => {
  it('buildJulesPatchRequest produces deterministic request from coach', () => {
    const req = buildJulesPatchRequest(coach, 'enabled');
    expect(req.source).toEqual(coach);
    expect(req.summary).toBe('Fix the flaky test in src/foo.test.ts');
    expect(req.instructions).toEqual(['src/foo.test.ts']);
    expect(req.mode).toBe('enabled');
    expect(req.writeActor).toBe('Jules');
  });

  it('instructions fallback to guidance when scope absent', () => {
    const c = { ok: true, guidance: 'Reduce timeout' };
    const req = buildJulesPatchRequest(c, 'enabled');
    expect(req.instructions).toEqual(['Reduce timeout']);
  });
});

describe('Gate-S11: writeActor is always Jules', () => {
  it('buildJulesPatchRequest always sets writeActor Jules', () => {
    const reqFrozen = buildJulesPatchRequest(coach, 'frozen');
    const reqEnabled = buildJulesPatchRequest(coach, 'enabled');
    expect(reqFrozen.writeActor).toBe('Jules');
    expect(reqEnabled.writeActor).toBe('Jules');
  });

  it('integrateJules always returns writeActor Jules', () => {
    const frozen = integrateJules(coach, 'frozen');
    const enabled = integrateJules(coach, 'enabled');
    expect(frozen.writeActor).toBe('Jules');
    expect(enabled.writeActor).toBe('Jules');
  });
});

describe('Gate-S11: frozen mode returns skipped_due_to_freeze', () => {
  it('integrateJules frozen: status, requestedPatch null, no real patch', () => {
    const result = integrateJules(coach, 'frozen');
    expect(result.status).toBe('skipped_due_to_freeze');
    expect(result.requestedPatch).toBe(null);
    expect(result.nextPhase).toBe('JULES_FROZEN');
  });
});

describe('Gate-S11: enabled mode returns ready_for_jules', () => {
  it('integrateJules enabled: status, structured request, no execution', () => {
    const result = integrateJules(coach, 'enabled');
    expect(result.status).toBe('ready_for_jules');
    expect(result.requestedPatch).not.toBe(null);
    expect(result.requestedPatch?.writeActor).toBe('Jules');
    expect(result.nextPhase).toBe('GUARDIAN_CHECK');
  });
});

describe('Gate-S11: no merge path introduced', () => {
  it('integration result phases never MERGE or AUTO_MERGE', () => {
    const frozen = integrateJules(coach, 'frozen');
    const enabled = integrateJules(coach, 'enabled');
    expect(['JULES_FROZEN', 'GUARDIAN_CHECK']).toContain(frozen.nextPhase);
    expect(['JULES_FROZEN', 'GUARDIAN_CHECK']).toContain(enabled.nextPhase);
    expect(frozen.nextPhase).not.toBe('MERGE');
    expect(enabled.nextPhase).not.toBe('AUTO_MERGE');
  });
});

describe('Gate-S11: Human authority preserved', () => {
  it('humanRequired is always true', () => {
    const frozen = integrateJules(coach, 'frozen');
    const enabled = integrateJules(coach, 'enabled');
    expect(frozen.humanRequired).toBe(true);
    expect(enabled.humanRequired).toBe(true);
  });
});
