/**
 * OC-4: Tests for runHeroesRuntime.
 */

import { describe, it, expect, vi } from 'vitest';
import { runHeroesRuntime } from './run-heroes-runtime';
import { createDefaultHeroAdvisoryRunner } from './default-runtime-hero-adapters';
import type { HeroRuntimeInput } from './hero-runtime-input';
import type { HeroAdvisoryRunner } from './hero-runtime-invocation';

const baseInput: HeroRuntimeInput = {
  eventCategory: 'WORKFLOW_RUN_FAILURE',
  eventKind: 'workflow_run',
  summary: 'Workflow failed',
};

describe('runHeroesRuntime', () => {
  it('returns skipped when no hero is applicable', async () => {
    const result = await runHeroesRuntime(
      { ...baseInput, eventCategory: 'UNKNOWN' },
      vi.fn()
    );
    expect(result.status).toBe('skipped');
    expect(result.selectedHeroIds).toHaveLength(0);
    expect(result.advisoryEntries).toHaveLength(0);
    expect(result.skippedReason).toBeDefined();
  });

  it('normalizes single hero advisory output', async () => {
    const runner: HeroAdvisoryRunner = vi.fn().mockResolvedValue({
      heroName: 'ciFailureHero',
      role: 'repair',
      analysis: 'CI failure requires inspection.',
      recommendations: ['Review logs'],
      confidence: 0.85,
      advice: { summary: 'CI failure detected', suggestedActions: [{ title: 'Review logs' }] },
    });
    const result = await runHeroesRuntime(baseInput, runner);
    expect(result.status).toBe('completed');
    expect(result.selectedHeroIds).toContain('ciFailureHero');
    expect(result.advisoryEntries).toHaveLength(1);
    expect(result.advisoryEntries[0].heroId).toBe('ciFailureHero');
    expect(result.advisoryEntries[0].summary).toBe('CI failure detected');
  });

  it('handles hero failure without hidden crash', async () => {
    const runner: HeroAdvisoryRunner = vi.fn().mockRejectedValue(new Error('Hero threw'));
    const result = await runHeroesRuntime(baseInput, runner);
    expect(result.status).toBe('failed');
    expect(result.advisoryEntries).toHaveLength(0);
    expect(result.failureDetails).toHaveLength(1);
    expect(result.failureDetails![0].error).toContain('Hero threw');
  });

  it('preserves deterministic output shape', async () => {
    const runner: HeroAdvisoryRunner = vi.fn().mockResolvedValue({
      heroName: 'ciFailureHero',
      role: 'repair',
      analysis: 'Analysis',
      recommendations: [],
      confidence: 0.8,
    });
    const a = await runHeroesRuntime(baseInput, runner);
    const b = await runHeroesRuntime(baseInput, runner);
    expect(a.status).toBe(b.status);
    expect(a.selectedHeroIds).toEqual(b.selectedHeroIds);
    expect(a.advisoryEntries.length).toBe(b.advisoryEntries.length);
  });

  it('handles malformed hero result', async () => {
    const runner: HeroAdvisoryRunner = vi.fn().mockResolvedValue({
      heroName: 'ciFailureHero',
      role: 'repair',
      analysis: null,
      recommendations: [],
      confidence: 0.5,
    });
    const result = await runHeroesRuntime(baseInput, runner);
    expect(result.status).toBe('failed');
    expect(result.failureDetails?.some((d) => d.error?.includes('Malformed'))).toBe(true);
  });

  it('integration: runtime calls hero layer successfully with default runner', async () => {
    const runner = createDefaultHeroAdvisoryRunner();
    const result = await runHeroesRuntime(baseInput, runner);
    expect(result.status).toBe('completed');
    expect(result.selectedHeroIds).toContain('ciFailureHero');
    expect(result.advisoryEntries).toHaveLength(1);
    expect(result.advisoryEntries[0].heroId).toBe('ciFailureHero');
    expect(result.advisoryEntries[0].summary).toBeDefined();
    expect(result.advisoryEntries[0].rationale).toBeDefined();
  });
});
