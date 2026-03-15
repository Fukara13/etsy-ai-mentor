/**
 * OC-4: Tests for selectHeroesForRuntime.
 */

import { describe, it, expect } from 'vitest';
import { selectHeroesForRuntime } from './hero-runtime-selection';

describe('selectHeroesForRuntime', () => {
  it('selects ciFailureHero for WORKFLOW_RUN_FAILURE', () => {
    const result = selectHeroesForRuntime({
      eventCategory: 'WORKFLOW_RUN_FAILURE',
      eventKind: 'workflow_run',
    });
    expect(result.eligible).toBe(true);
    if (result.eligible) {
      expect(result.heroIds).toContain('ciFailureHero');
      expect(result.heroIds).toHaveLength(1);
    }
  });

  it('selects reviewHero for PULL_REQUEST_UPDATE with opened', () => {
    const result = selectHeroesForRuntime({
      eventCategory: 'PULL_REQUEST_UPDATE',
      eventKind: 'pull_request',
      action: 'opened',
    });
    expect(result.eligible).toBe(true);
    if (result.eligible) {
      expect(result.heroIds).toContain('reviewHero');
    }
  });

  it('selects reviewHero for PULL_REQUEST_UPDATE with synchronize', () => {
    const result = selectHeroesForRuntime({
      eventCategory: 'PULL_REQUEST_UPDATE',
      eventKind: 'pull_request',
      action: 'synchronize',
    });
    expect(result.eligible).toBe(true);
    if (result.eligible) expect(result.heroIds).toContain('reviewHero');
  });

  it('returns skipped when no hero mapped for UNKNOWN', () => {
    const result = selectHeroesForRuntime({
      eventCategory: 'UNKNOWN',
      eventKind: 'unknown',
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Unknown');
  });

  it('selects reviewHero for PUSH', () => {
    const result = selectHeroesForRuntime({
      eventCategory: 'PUSH',
      eventKind: 'push',
    });
    expect(result.eligible).toBe(true);
    if (result.eligible) expect(result.heroIds).toContain('reviewHero');
  });

  it('preserves deterministic output shape', () => {
    const a = selectHeroesForRuntime({
      eventCategory: 'WORKFLOW_RUN_FAILURE',
      eventKind: 'workflow_run',
    });
    const b = selectHeroesForRuntime({
      eventCategory: 'WORKFLOW_RUN_FAILURE',
      eventKind: 'workflow_run',
    });
    expect(a).toEqual(b);
  });
});
