/**
 * OC-4: Tests for toRuntimeAdvisoryEntry.
 */

import { describe, it, expect } from 'vitest';
import { toRuntimeAdvisoryEntry } from './hero-runtime-advisory';
import type { HeroExecutionOutput } from './hero-runtime-advisory';

describe('toRuntimeAdvisoryEntry', () => {
  it('normalizes single hero advisory output', () => {
    const output: HeroExecutionOutput = {
      heroName: 'ciFailureHero',
      role: 'repair',
      analysis: 'CI failure requires inspection.',
      recommendations: ['Review logs', 'Validate locally'],
      confidence: 0.85,
      advice: {
        summary: 'CI failure detected',
        analysis: 'Pipeline or test failure.',
        suggestedActions: [{ title: 'Review logs' }, { title: 'Reproduce locally' }],
      },
    };
    const entry = toRuntimeAdvisoryEntry(output);
    expect(entry.heroId).toBe('ciFailureHero');
    expect(entry.category).toBe('repair');
    expect(entry.summary).toBe('CI failure detected');
    expect(entry.rationale).toBe('CI failure requires inspection.');
    expect(entry.confidence).toBe(0.85);
    expect(entry.recommendedNextStep).toBe('Review logs');
    expect(entry.signals).toEqual(['Review logs', 'Reproduce locally']);
  });

  it('uses analysis when advice summary missing', () => {
    const output: HeroExecutionOutput = {
      heroName: 'reviewHero',
      role: 'strategy',
      analysis: 'Short analysis text here.',
      recommendations: [],
      confidence: 0.5,
    };
    const entry = toRuntimeAdvisoryEntry(output);
    expect(entry.summary).toBe('Short analysis text here.');
    expect(entry.rationale).toBe('Short analysis text here.');
    expect(entry.recommendedNextStep).toBeUndefined();
    expect(entry.signals).toBeUndefined();
  });
});
