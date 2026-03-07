/**
 * Gate-S12: Orchestrator Bridge — Deterministic tests.
 * Pure function focused. No network, no GitHub API, no workflow execution.
 */

import { describe, it, expect } from 'vitest';
import { normalizeEvent } from './event-normalizer';
import { resolveContext } from './context-resolver';
import { runOrchestratorBridge } from './orchestrator-bridge';
import type { ContextResolverInput } from './context-resolver';

const DETERMINISTIC_TIMESTAMP = '2025-03-07T12:00:00.000Z';

describe('Gate-S12: Event normalizer — valid CI failure', () => {
  it('normalizes valid CI failure raw input to CI_FAILED', () => {
    const result = normalizeEvent(
      {
        event: 'ci_failed',
        source: 'github-actions',
        prNumber: 42,
        workflowName: 'ci.yml',
        correlationId: 'abc-123',
      },
      { timestampOverride: DETERMINISTIC_TIMESTAMP }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.event.type).toBe('CI_FAILED');
      expect(result.event.source).toBe('github-actions');
      expect(result.event.timestamp).toBe(DETERMINISTIC_TIMESTAMP);
      expect(result.event.prNumber).toBe(42);
      expect(result.event.workflowName).toBe('ci.yml');
      expect(result.event.correlationId).toBe('abc-123');
    }
  });

  it('accepts ci-failed and CI_FAILED variants', () => {
    const opts = { timestampOverride: DETERMINISTIC_TIMESTAMP };
    expect(normalizeEvent({ event: 'ci-failed', source: 'x' }, opts).ok).toBe(true);
    expect(normalizeEvent({ event: 'CI_FAILED', source: 'x' }, opts).ok).toBe(true);
  });
});

describe('Gate-S12: Event normalizer — rejects invalid input', () => {
  it('rejects missing source', () => {
    const result = normalizeEvent({ event: 'ci_failed' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('source');
  });

  it('rejects empty source', () => {
    const result = normalizeEvent({ event: 'ci_failed', source: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('source');
  });

  it('rejects null/undefined input', () => {
    const result = normalizeEvent(null as unknown as Parameters<typeof normalizeEvent>[0]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeTruthy();
  });

  it('rejects unsupported event type', () => {
    const result = normalizeEvent({ event: 'unknown_event', source: 'x' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Unsupported');
  });
});

describe('Gate-S12: Context resolver — valid inputs', () => {
  it('resolves context with valid inputs', () => {
    const result = resolveContext({
      prNumber: 10,
      retryCount: 1,
      hasGateReviewLabel: true,
      isExhausted: false,
      julesMode: 'frozen',
      sourceWorkflow: 'ci',
      lastKnownPhase: 'ANALYZE',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.prNumber).toBe(10);
      expect(result.context.retryCount).toBe(1);
      expect(result.context.hasGateReviewLabel).toBe(true);
      expect(result.context.isExhausted).toBe(false);
      expect(result.context.julesMode).toBe('frozen');
      expect(result.context.sourceWorkflow).toBe('ci');
      expect(result.context.lastKnownPhase).toBe('ANALYZE');
    }
  });

  it('uses safe defaults when inputs omitted', () => {
    const result = resolveContext({});
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.retryCount).toBe(0);
      expect(result.context.hasGateReviewLabel).toBe(false);
      expect(result.context.isExhausted).toBe(false);
      expect(result.context.julesMode).toBe('unknown');
    }
  });

  it('accepts boolean values for hasGateReviewLabel', () => {
    const r1 = resolveContext({ hasGateReviewLabel: true });
    expect(r1.ok && r1.context.hasGateReviewLabel).toBe(true);

    const r2 = resolveContext({ hasGateReviewLabel: false });
    expect(r2.ok && r2.context.hasGateReviewLabel).toBe(false);
  });
});

describe('Gate-S12: Context resolver — retry overflow guard', () => {
  it('clamps retryCount to max 3', () => {
    const result = resolveContext({ retryCount: 99 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.retryCount).toBe(3);
  });

  it('clamps negative retryCount to 0', () => {
    const result = resolveContext({ retryCount: -5 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.retryCount).toBe(0);
  });

  it('accepts valid retryCount 0..3', () => {
    for (const n of [0, 1, 2, 3]) {
      const r = resolveContext({ retryCount: n });
      expect(r.ok && r.context.retryCount).toBe(n);
    }
  });
});

describe('Gate-S12: Orchestrator bridge — CI_FAILED dispatch', () => {
  it('bridge dispatch for CI_FAILED returns ANALYZE phase', () => {
    const result = runOrchestratorBridge({
      rawEvent: { event: 'ci_failed', source: 'ci' },
      contextInput: {},
      normalizeOptions: { timestampOverride: DETERMINISTIC_TIMESTAMP },
    });
    expect(result.ok).toBe(true);
    expect(result.nextState.phase).toBe('ANALYZE');
    if (result.nextState.phase === 'ANALYZE') {
      expect(result.nextState.ciFailed).toBe(true);
    }
  });

  it('bridge returns action plan with RUN_ANALYZER for CI_FAILED', () => {
    const result = runOrchestratorBridge({
      rawEvent: { event: 'ci_failed', source: 'ci' },
      contextInput: {},
    });
    expect(result.ok).toBe(true);
    expect(result.actionPlan).toContainEqual({ action: 'RUN_ANALYZER' });
  });

  it('bridge returns normalized event and resolved context', () => {
    const result = runOrchestratorBridge({
      rawEvent: { event: 'ci_failed', source: 'gh', prNumber: 7 },
      contextInput: { retryCount: 1, julesMode: 'frozen' },
      normalizeOptions: { timestampOverride: DETERMINISTIC_TIMESTAMP },
    });
    expect(result.ok).toBe(true);
    expect(result.normalizedEvent.type).toBe('CI_FAILED');
    expect(result.normalizedEvent.source).toBe('gh');
    expect(result.normalizedEvent.prNumber).toBe(7);
    expect(result.resolvedContext.retryCount).toBe(1);
    expect(result.resolvedContext.julesMode).toBe('frozen');
  });
});

describe('Gate-S12: Orchestrator bridge — invalid input', () => {
  it('bridge fails on invalid raw event and returns HANDOFF_TO_HUMAN', () => {
    const result = runOrchestratorBridge({
      rawEvent: { event: 'ci_failed' },
      contextInput: {},
    });
    expect(result.ok).toBe(false);
    expect(result.actionPlan.some((a) => a.action === 'HANDOFF_TO_HUMAN')).toBe(true);
  });

  it('bridge fails on invalid context input', () => {
    const result = runOrchestratorBridge({
      rawEvent: { event: 'ci_failed', source: 'ci' },
      contextInput: null as unknown as ContextResolverInput,
    });
    expect(result.ok).toBe(false);
    expect(result.actionPlan.some((a) => a.action === 'HANDOFF_TO_HUMAN')).toBe(true);
  });
});

describe('Gate-S12: No human authority violations', () => {
  it('success path does not bypass human — returns action plan, no auto-merge', () => {
    const result = runOrchestratorBridge({
      rawEvent: { event: 'ci_failed', source: 'ci' },
      contextInput: {},
    });
    expect(result.actionPlan).not.toContainEqual({ action: 'MERGE' });
    expect(result.actionPlan).not.toContainEqual({ action: 'AUTO_MERGE' });
  });
});
