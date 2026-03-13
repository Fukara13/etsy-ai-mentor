import { describe, it, expect } from 'vitest';
import {
  classifyRisk,
  type RepairActionContext,
} from './classify-risk';

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

describe('classifyRisk', () => {
  it('returns LOW for test updates', () => {
    const result = classifyRisk(ctx({ actionType: 'test' }));
    expect(result.level).toBe('LOW');
    expect(result.requiresHumanApproval).toBe(false);
    expect(result.reason).toContain('Low-risk');
  });

  it('returns LOW for documentation changes', () => {
    const result = classifyRisk(ctx({ actionType: 'documentation' }));
    expect(result.level).toBe('LOW');
    expect(result.requiresHumanApproval).toBe(false);
  });

  it('returns LOW for formatting fixes', () => {
    const result = classifyRisk(ctx({ actionType: 'format' }));
    expect(result.level).toBe('LOW');
    expect(result.requiresHumanApproval).toBe(false);
  });

  it('returns MEDIUM for dependency updates', () => {
    const result = classifyRisk(ctx({ actionType: 'dependency' }));
    expect(result.level).toBe('MEDIUM');
    expect(result.requiresHumanApproval).toBe(true);
  });

  it('returns MEDIUM for non-core refactors', () => {
    const result = classifyRisk(ctx({ actionType: 'refactor' }));
    expect(result.level).toBe('MEDIUM');
    expect(result.requiresHumanApproval).toBe(true);
  });

  it('returns MEDIUM for build configuration changes', () => {
    const result = classifyRisk(ctx({ actionType: 'build' }));
    expect(result.level).toBe('MEDIUM');
    expect(result.requiresHumanApproval).toBe(true);
  });

  it('returns HIGH for changes to core engine', () => {
    const result = classifyRisk(
      ctx({ actionType: 'core', touchesCoreEngine: true })
    );
    expect(result.level).toBe('HIGH');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.reason).toContain('core engine');
  });

  it('returns HIGH when touchesCoreEngine regardless of actionType', () => {
    const result = classifyRisk(
      ctx({ actionType: 'refactor', touchesCoreEngine: true })
    );
    expect(result.level).toBe('HIGH');
  });

  it('returns CRITICAL for destructive actions', () => {
    const result = classifyRisk(ctx({ isDestructive: true }));
    expect(result.level).toBe('CRITICAL');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.reason).toContain('Destructive');
  });

  it('returns CRITICAL for access to secrets', () => {
    const result = classifyRisk(ctx({ touchesSecrets: true }));
    expect(result.level).toBe('CRITICAL');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.reason).toContain('secrets');
  });

  it('returns CRITICAL for production environment', () => {
    const result = classifyRisk(ctx({ isProduction: true }));
    expect(result.level).toBe('CRITICAL');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.reason).toContain('Production');
  });

  it('prioritizes CRITICAL over HIGH and others', () => {
    const result = classifyRisk(
      ctx({
        touchesCoreEngine: true,
        touchesSecrets: true,
      })
    );
    expect(result.level).toBe('CRITICAL');
  });

  it('produces deterministic output for identical inputs', () => {
    const input = ctx({ actionType: 'refactor', targetPath: 'src/bar.ts' });
    const a = classifyRisk(input);
    const b = classifyRisk(input);
    expect(a).toEqual(b);
    expect(a.level).toBe(b.level);
    expect(a.reason).toBe(b.reason);
  });

  it('does not mutate provided inputs', () => {
    const input = ctx({ actionType: 'test' });
    const snapshot = JSON.stringify(input);
    classifyRisk(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('returns MEDIUM for unknown action type', () => {
    const result = classifyRisk(ctx({ actionType: 'unknown-custom' }));
    expect(result.level).toBe('MEDIUM');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.reason).toContain('Unknown');
  });

  it('matches actionType case-insensitively', () => {
    const result = classifyRisk(ctx({ actionType: 'TEST' }));
    expect(result.level).toBe('LOW');
  });
});
