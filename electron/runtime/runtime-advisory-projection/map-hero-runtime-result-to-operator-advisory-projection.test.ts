/**
 * OC-5: Tests for mapHeroRuntimeResultToOperatorAdvisoryProjection.
 */

import { describe, it, expect } from 'vitest';
import { mapHeroRuntimeResultToOperatorAdvisoryProjection } from './map-hero-runtime-result-to-operator-advisory-projection';
import type { HeroRuntimeResult } from '../heroes-runtime/hero-runtime-result';

describe('mapHeroRuntimeResultToOperatorAdvisoryProjection', () => {
  it('maps success result to stable operator projection', () => {
    const result: HeroRuntimeResult = {
      status: 'completed',
      selectedHeroIds: ['ciFailureHero'],
      advisoryEntries: [
        {
          heroId: 'ciFailureHero',
          category: 'repair',
          summary: 'CI failure requires inspection.',
          rationale: 'Pipeline or test failure detected. Review logs.',
          confidence: 0.85,
          recommendedNextStep: 'Review failing logs',
          signals: ['Review logs', 'Reproduce locally'],
        },
      ],
    };
    const projection = mapHeroRuntimeResultToOperatorAdvisoryProjection(result);
    expect(projection.source).toBe('hero-runtime');
    expect(projection.status).toBe('completed');
    expect(projection.advisorySummaries).toHaveLength(1);
    expect(projection.advisorySummaries[0].summary).toBe('CI failure requires inspection.');
    expect(projection.advisorySummaries[0].rationaleExcerpt).toContain('Pipeline');
    expect(projection.advisorySummaries[0].confidence).toBe(0.85);
    expect(projection.advisorySummaries[0].recommendedNextStep).toBe('Review failing logs');
    expect(projection.advisorySummaries[0].supportingSignalSummaries).toEqual([
      'Review logs',
      'Reproduce locally',
    ]);
    expect(projection.failureSummary).toBeUndefined();
  });

  it('maps skipped result to stable operator projection', () => {
    const result: HeroRuntimeResult = {
      status: 'skipped',
      selectedHeroIds: [],
      advisoryEntries: [],
      skippedReason: 'Unknown event category',
    };
    const projection = mapHeroRuntimeResultToOperatorAdvisoryProjection(result);
    expect(projection.source).toBe('hero-runtime');
    expect(projection.status).toBe('skipped');
    expect(projection.advisorySummaries).toHaveLength(0);
    expect(projection.failureSummary).toBeUndefined();
  });

  it('maps partial result to stable operator projection with failure summary', () => {
    const result: HeroRuntimeResult = {
      status: 'partial',
      selectedHeroIds: ['reviewHero'],
      advisoryEntries: [
        {
          heroId: 'reviewHero',
          category: 'strategy',
          summary: 'PR review suggested.',
          rationale: 'Review the changes.',
          confidence: 0.7,
        },
      ],
      failureDetails: [{ heroId: 'otherHero', error: 'Hero threw' }],
    };
    const projection = mapHeroRuntimeResultToOperatorAdvisoryProjection(result);
    expect(projection.status).toBe('partial');
    expect(projection.advisorySummaries).toHaveLength(1);
    expect(projection.failureSummary).toBe('Hero threw');
  });

  it('maps failed result to stable operator projection with failure summary', () => {
    const result: HeroRuntimeResult = {
      status: 'failed',
      selectedHeroIds: ['ciFailureHero'],
      advisoryEntries: [],
      failureDetails: [{ error: 'Malformed hero advisory result' }],
    };
    const projection = mapHeroRuntimeResultToOperatorAdvisoryProjection(result);
    expect(projection.status).toBe('failed');
    expect(projection.advisorySummaries).toHaveLength(0);
    expect(projection.failureSummary).toBe('Malformed hero advisory result');
  });

  it('normalizes optional fields', () => {
    const result: HeroRuntimeResult = {
      status: 'completed',
      selectedHeroIds: ['reviewHero'],
      advisoryEntries: [
        {
          heroId: 'reviewHero',
          category: 'strategy',
          summary: '',
          rationale: '',
        },
      ],
    };
    const projection = mapHeroRuntimeResultToOperatorAdvisoryProjection(result);
    expect(projection.advisorySummaries[0].summary).toBe('No summary');
    expect(projection.advisorySummaries[0].rationaleExcerpt).toBe('');
    expect(projection.advisorySummaries[0].confidence).toBeUndefined();
    expect(projection.advisorySummaries[0].recommendedNextStep).toBeUndefined();
    expect(projection.advisorySummaries[0].supportingSignalSummaries).toBeUndefined();
  });

  it('does not leak authority: projection has no execution or identity authority fields', () => {
    const result: HeroRuntimeResult = {
      status: 'completed',
      selectedHeroIds: ['ciFailureHero'],
      advisoryEntries: [
        {
          heroId: 'ciFailureHero',
          category: 'repair',
          summary: 'Advice',
          rationale: 'Reason',
          confidence: 0.8,
        },
      ],
    };
    const projection = mapHeroRuntimeResultToOperatorAdvisoryProjection(result);
    const keys = Object.keys(projection) as (keyof typeof projection)[];
    expect(keys).toContain('source');
    expect(keys).toContain('status');
    expect(keys).toContain('advisorySummaries');
    expect(keys).not.toContain('selectedHeroIds');
    expect(keys).not.toContain('execute');
    expect(keys).not.toContain('approve');
    expect(keys).not.toContain('command');
    const item = projection.advisorySummaries[0];
    const itemKeys = Object.keys(item);
    expect(itemKeys).not.toContain('heroId');
    expect(itemKeys).not.toContain('execute');
    expect(itemKeys).not.toContain('authority');
  });

  it('truncates long rationale to excerpt', () => {
    const longRationale = 'a'.repeat(600);
    const result: HeroRuntimeResult = {
      status: 'completed',
      selectedHeroIds: ['x'],
      advisoryEntries: [
        {
          heroId: 'x',
          category: 'repair',
          summary: 'S',
          rationale: longRationale,
        },
      ],
    };
    const projection = mapHeroRuntimeResultToOperatorAdvisoryProjection(result);
    expect(projection.advisorySummaries[0].rationaleExcerpt.length).toBe(500);
  });
});
