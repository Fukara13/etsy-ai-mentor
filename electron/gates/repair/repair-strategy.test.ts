/**
 * Gate-S30: Repair Strategy Layer — Pure mapping tests.
 */

import { describe, it, expect } from 'vitest';
import { mapRepairStrategy } from './repair-strategy-mapper';

describe('Gate-S30: maps infra_retry to retry_ci', () => {
  it('primaryCategory infra_retry yields retry_ci', () => {
    const r = mapRepairStrategy({
      analysis: { primaryCategory: 'infra_retry', confidence: 'medium' },
    });
    expect(r.strategyType).toBe('retry_ci');
    expect(r.recommendedActions).toContain('re-run CI with same inputs');
    expect(r.requiresHuman).toBe(false);
  });
});

describe('Gate-S30: maps dependency to dependency_fix', () => {
  it('preserves suggestedFiles as targetFiles', () => {
    const r = mapRepairStrategy({
      analysis: {
        primaryCategory: 'dependency',
        suggestedFiles: ['package.json', 'pnpm-lock.yaml'],
      },
    });
    expect(r.strategyType).toBe('dependency_fix');
    expect(r.targetFiles).toEqual(['package.json', 'pnpm-lock.yaml']);
    expect(r.recommendedActions).toContain('inspect package manifest and lockfile');
  });
});

describe('Gate-S30: maps flaky_test to test_flaky', () => {
  it('primaryCategory flaky_test yields test_flaky', () => {
    const r = mapRepairStrategy({
      analysis: { primaryCategory: 'flaky_test' },
    });
    expect(r.strategyType).toBe('test_flaky');
    expect(r.recommendedActions).toContain('inspect flaky test stability');
  });
});

describe('Gate-S30: maps config to configuration_issue', () => {
  it('primaryCategory config yields configuration_issue', () => {
    const r = mapRepairStrategy({
      analysis: { primaryCategory: 'config' },
    });
    expect(r.strategyType).toBe('configuration_issue');
    expect(r.recommendedActions).toContain('inspect configuration files');
  });
});

describe('Gate-S30: maps manual to human_investigation', () => {
  it('requiresHuman=true for human_investigation', () => {
    const r = mapRepairStrategy({
      analysis: { primaryCategory: 'manual' },
    });
    expect(r.strategyType).toBe('human_investigation');
    expect(r.requiresHuman).toBe(true);
    expect(r.recommendedActions).toContain('escalate to operator review');
  });
});

describe('Gate-S30: maps unknown/missing category to unknown', () => {
  it('unknown category yields requiresHuman=true', () => {
    const r = mapRepairStrategy({
      analysis: { primaryCategory: 'invalid_category' },
    });
    expect(r.strategyType).toBe('unknown');
    expect(r.requiresHuman).toBe(true);
  });

  it('missing analysis yields unknown', () => {
    const r = mapRepairStrategy({});
    expect(r.strategyType).toBe('unknown');
    expect(r.requiresHuman).toBe(true);
  });
});

describe('Gate-S30: safeToAutoExecute is always false', () => {
  it('all strategy types have safeToAutoExecute=false', () => {
    const categories = ['infra_retry', 'dependency', 'flaky_test', 'config', 'manual', 'unknown'];
    for (const c of categories) {
      const r = mapRepairStrategy({
        analysis: { primaryCategory: c },
      });
      expect(r.safeToAutoExecute).toBe(false);
    }
  });
});

describe('Gate-S30: fallback/missing analysis returns valid strategy', () => {
  it('empty input yields deterministic valid strategy', () => {
    const r = mapRepairStrategy({});
    expect(r.strategyType).toBe('unknown');
    expect(r.recommendedActions.length).toBeGreaterThan(0);
    expect(r.rationale).toBeDefined();
    expect(typeof r.requiresHuman).toBe('boolean');
  });

  it('fallback=true yields low confidence', () => {
    const r = mapRepairStrategy({
      analysis: { fallback: true, primaryCategory: 'infra_retry' },
    });
    expect(r.confidence).toBe('low');
  });
});

describe('Gate-S30: output is deterministic', () => {
  it('same input yields identical output', () => {
    const input = {
      analysis: {
        primaryCategory: 'dependency',
        confidence: 'high' as const,
        hypothesis: 'Lockfile mismatch',
        suggestedFiles: ['package.json'],
      },
    };
    const a = mapRepairStrategy(input);
    const b = mapRepairStrategy(input);
    expect(a).toEqual(b);
  });
});
