import { describe, it, expect } from 'vitest';
import {
  classifyZone,
  ZONE_LEVELS,
  type ZoneClassification,
  type ZoneLevel,
} from './index';
import type { RepairActionContext } from '../risk';

function ctx(overrides: Partial<RepairActionContext> = {}): RepairActionContext {
  return {
    actionType: 'test',
    targetPath: 'src/foo.test.ts',
    isProduction: false,
    touchesCoreEngine: false,
    touchesSecrets: false,
    isDestructive: false,
    requiresNetwork: false,
    description: '',
    ...overrides,
  };
}

describe('classifyZone', () => {
  it('returns SAFE for test', () => {
    const r = classifyZone(ctx({ actionType: 'test' }));
    expect(r.zone).toBe('SAFE');
    expect(r.allowsAiExecution).toBe(true);
    expect(r.requiresHumanApproval).toBe(false);
    expect(r.requiresEscalation).toBe(false);
  });

  it('returns SAFE for documentation', () => {
    const r = classifyZone(ctx({ actionType: 'documentation' }));
    expect(r.zone).toBe('SAFE');
    expect(r.allowsAiExecution).toBe(true);
    expect(r.requiresHumanApproval).toBe(false);
  });

  it('returns SAFE for format', () => {
    const r = classifyZone(ctx({ actionType: 'format' }));
    expect(r.zone).toBe('SAFE');
    expect(r.allowsAiExecution).toBe(true);
  });

  it('returns RESTRICTED for dependency', () => {
    const r = classifyZone(ctx({ actionType: 'dependency' }));
    expect(r.zone).toBe('RESTRICTED');
    expect(r.allowsAiExecution).toBe(false);
    expect(r.requiresHumanApproval).toBe(true);
    expect(r.requiresEscalation).toBe(false);
  });

  it('returns RESTRICTED for refactor', () => {
    const r = classifyZone(ctx({ actionType: 'refactor' }));
    expect(r.zone).toBe('RESTRICTED');
    expect(r.allowsAiExecution).toBe(false);
    expect(r.requiresHumanApproval).toBe(true);
  });

  it('returns RESTRICTED for build', () => {
    const r = classifyZone(ctx({ actionType: 'build' }));
    expect(r.zone).toBe('RESTRICTED');
    expect(r.allowsAiExecution).toBe(false);
    expect(r.requiresHumanApproval).toBe(true);
  });

  it('returns RESTRICTED for touchesCoreEngine', () => {
    const r = classifyZone(ctx({ actionType: 'test', touchesCoreEngine: true }));
    expect(r.zone).toBe('RESTRICTED');
    expect(r.allowsAiExecution).toBe(false);
    expect(r.requiresHumanApproval).toBe(true);
    expect(r.requiresEscalation).toBe(false);
  });

  it('returns RESTRICTED for unknown action type', () => {
    const r = classifyZone(ctx({ actionType: 'unknown-custom' }));
    expect(r.zone).toBe('RESTRICTED');
    expect(r.allowsAiExecution).toBe(false);
    expect(r.requiresHumanApproval).toBe(true);
    expect(r.reason).toContain('Unknown');
  });

  it('returns RED for touchesSecrets', () => {
    const r = classifyZone(ctx({ touchesSecrets: true }));
    expect(r.zone).toBe('RED');
    expect(r.allowsAiExecution).toBe(false);
    expect(r.requiresHumanApproval).toBe(true);
    expect(r.requiresEscalation).toBe(true);
    expect(r.reason).toContain('secrets');
  });

  it('returns RED for isDestructive', () => {
    const r = classifyZone(ctx({ isDestructive: true }));
    expect(r.zone).toBe('RED');
    expect(r.requiresEscalation).toBe(true);
    expect(r.reason).toContain('Destructive');
  });

  it('returns RED for isProduction', () => {
    const r = classifyZone(ctx({ isProduction: true }));
    expect(r.zone).toBe('RED');
    expect(r.requiresEscalation).toBe(true);
    expect(r.reason).toContain('Production');
  });

  it('prioritizes RED over SAFE-looking action', () => {
    const r = classifyZone(
      ctx({ actionType: 'test', touchesSecrets: true })
    );
    expect(r.zone).toBe('RED');
    expect(r.requiresEscalation).toBe(true);
  });

  it('prioritizes RESTRICTED over SAFE-looking action', () => {
    const r = classifyZone(
      ctx({ actionType: 'test', touchesCoreEngine: true })
    );
    expect(r.zone).toBe('RESTRICTED');
    expect(r.allowsAiExecution).toBe(false);
  });

  it('matches actionType case-insensitively', () => {
    expect(classifyZone(ctx({ actionType: 'TEST' })).zone).toBe('SAFE');
    expect(classifyZone(ctx({ actionType: 'Test' })).zone).toBe('SAFE');
    expect(classifyZone(ctx({ actionType: 'REFACTOR' })).zone).toBe('RESTRICTED');
  });

  it('trims whitespace from actionType', () => {
    expect(classifyZone(ctx({ actionType: '  test  ' })).zone).toBe('SAFE');
    expect(classifyZone(ctx({ actionType: '  format  ' })).zone).toBe('SAFE');
  });

  it('does not mutate input', () => {
    const input = ctx({ actionType: 'test' });
    const snapshot = JSON.stringify(input);
    classifyZone(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('produces deterministic output for identical inputs', () => {
    const input = ctx({ actionType: 'refactor', targetPath: 'src/bar.ts' });
    const a = classifyZone(input);
    const b = classifyZone(input);
    expect(a).toEqual(b);
    expect(a.zone).toBe(b.zone);
    expect(a.reason).toBe(b.reason);
  });

  it('exported API smoke check', () => {
    expect(ZONE_LEVELS).toEqual(['SAFE', 'RESTRICTED', 'RED']);
    const r: ZoneClassification = classifyZone(ctx({ actionType: 'test' }));
    const z: ZoneLevel = r.zone;
    expect(z).toBe('SAFE');
  });
});
