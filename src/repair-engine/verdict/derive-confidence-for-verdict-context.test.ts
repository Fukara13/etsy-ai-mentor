/**
 * Confidence integration: tests for deriveConfidenceForVerdictContext.
 */

import { describe, it, expect } from 'vitest';

import {
  deriveConfidenceForVerdictContext,
  type VerdictContext,
} from './derive-confidence-for-verdict-context';

function makeContext(overrides: Partial<VerdictContext>): VerdictContext {
  return {
    verdict: 'manual_investigation',
    strategyCount: 0,
    hasManualInvestigation: false,
    dominantStrategyType: null,
    ...overrides,
  };
}

describe('deriveConfidenceForVerdictContext', () => {
  it('produces HIGH when strategy_ready with single strategy', () => {
    const ctx = makeContext({
      verdict: 'strategy_ready',
      strategyCount: 1,
      hasManualInvestigation: false,
      dominantStrategyType: 'configuration_fix',
    });

    const score = deriveConfidenceForVerdictContext(ctx);

    expect(score.level).toBe('high');
    expect(score.value).toBe(75);
  });

  it('produces HIGH when manual_investigation with single manual strategy', () => {
    const ctx = makeContext({
      verdict: 'manual_investigation',
      strategyCount: 1,
      hasManualInvestigation: true,
      dominantStrategyType: 'manual_investigation',
    });

    const score = deriveConfidenceForVerdictContext(ctx);

    expect(score.level).toBe('high');
    expect(score.value).toBe(75);
  });

  it('produces MEDIUM when multiple strategies', () => {
    const ctx = makeContext({
      verdict: 'manual_investigation',
      strategyCount: 3,
      hasManualInvestigation: false,
      dominantStrategyType: null,
    });

    const score = deriveConfidenceForVerdictContext(ctx);

    expect(score.level).toBe('medium');
    expect(score.value).toBe(50);
  });

  it('produces LOW when insufficient_signal (no candidates)', () => {
    const ctx = makeContext({
      verdict: 'insufficient_signal',
      strategyCount: 0,
      hasManualInvestigation: false,
      dominantStrategyType: null,
    });

    const score = deriveConfidenceForVerdictContext(ctx);

    expect(score.level).toBe('low');
    expect(score.value).toBe(25);
  });

  it('does not mutate input', () => {
    const ctx = makeContext({ verdict: 'strategy_ready', strategyCount: 1 });
    const snapshot = JSON.parse(JSON.stringify(ctx));

    deriveConfidenceForVerdictContext(ctx);

    expect(ctx).toEqual(snapshot);
  });

  it('produces stable output for same input', () => {
    const ctx = makeContext({ verdict: 'blocked', strategyCount: 2 });

    const a = deriveConfidenceForVerdictContext(ctx);
    const b = deriveConfidenceForVerdictContext(ctx);

    expect(a).toEqual(b);
    expect(a.level).toBe(b.level);
    expect(a.value).toBe(b.value);
  });
});
