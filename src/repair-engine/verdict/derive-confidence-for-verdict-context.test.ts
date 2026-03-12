/**
 * Confidence integration: tests for deriveConfidenceForVerdictContext.
 */

import { describe, it, expect } from 'vitest';

import {
  deriveConfidenceForVerdictContext,
  attachErrorTypeToVerdictContext,
  type VerdictContext,
  type VerdictErrorContext,
} from './derive-confidence-for-verdict-context';
import { ErrorType } from '../contracts/error/error-type';

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

describe('attachErrorTypeToVerdictContext', () => {
  function makeErrorContext(overrides: Partial<VerdictContext> = {}): VerdictContext {
    return makeContext({
      verdict: 'manual_investigation',
      strategyCount: 1,
      hasManualInvestigation: true,
      dominantStrategyType: 'manual_investigation',
      ...overrides,
    });
  }

  it('attaches canonical MODULE_NOT_FOUND error type from raw message', () => {
    const ctx = makeErrorContext();

    const result: VerdictErrorContext = attachErrorTypeToVerdictContext(
      ctx,
      'Module not found: some-module'
    );

    expect(result.errorType).toBe(ErrorType.MODULE_NOT_FOUND);
    expect(result.verdict).toBe(ctx.verdict);
  });

  it('attaches UNKNOWN when message does not match any pattern', () => {
    const ctx = makeErrorContext();

    const result = attachErrorTypeToVerdictContext(ctx, 'something entirely unrelated');

    expect(result.errorType).toBe(ErrorType.UNKNOWN);
  });

  it('does not mutate the input context', () => {
    const ctx = makeErrorContext();
    const snapshot = JSON.parse(JSON.stringify(ctx));

    attachErrorTypeToVerdictContext(ctx, 'Module not found: x');

    expect(ctx).toEqual(snapshot);
  });

  it('produces deterministic output for same input', () => {
    const ctx = makeErrorContext();

    const a = attachErrorTypeToVerdictContext(ctx, 'dependency resolution failed');
    const b = attachErrorTypeToVerdictContext(ctx, 'dependency resolution failed');

    expect(a).toEqual(b);
    expect(a.errorType).toBe(b.errorType);
  });
});

