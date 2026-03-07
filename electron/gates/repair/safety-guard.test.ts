/**
 * Gate-S20: Safety Guard — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { evaluateSafety } from './safety-guard';

describe('Gate-S20: allows safe retry plan when governance allows and retry below limit', () => {
  it('allow retry_ci when governance=allow and retryCount < maxRetries', () => {
    const plan = { items: [{ action: 'retry_ci' as const }] };
    const input = {
      currentState: 'ANALYZE',
      governanceOutcome: { verdict: 'allow' as const, reason: 'safe_retry' as const },
      retryCount: 1,
      maxRetries: 3,
      plan,
    };
    const r = evaluateSafety(input);
    expect(r.outcome).toBe('allow');
    expect(r.reasonCode).toBe('safe_to_execute');
    expect(input.plan).toBe(plan);
    expect(input.plan.items).toHaveLength(1);
    expect(input.plan.items[0].action).toBe('retry_ci');
  });
});

describe('Gate-S20: requires human when retry limit reached', () => {
  it('require_human when retry_ci and retryCount >= maxRetries', () => {
    const r = evaluateSafety({
      currentState: 'CI_RETRY',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 3,
      maxRetries: 3,
      plan: { items: [{ action: 'retry_ci' }] },
    });
    expect(r.outcome).toBe('require_human');
    expect(r.reasonCode).toBe('retry_limit_reached');
  });
});

describe('Gate-S20: blocks unknown action', () => {
  it('block unknown action', () => {
    const r = evaluateSafety({
      currentState: 'ANALYZE',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 0,
      plan: { items: [{ action: 'unknown_action' as 'retry_ci' }] },
    });
    expect(r.outcome).toBe('block');
    expect(r.reasonCode).toBe('unknown_action');
  });
});

describe('Gate-S20: blocks forbidden privilege action', () => {
  it('block merge_pr', () => {
    const r = evaluateSafety({
      currentState: 'ANALYZE',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 0,
      plan: { items: [{ action: 'merge_pr' as 'retry_ci' }] },
    });
    expect(r.outcome).toBe('block');
    expect(r.reasonCode).toBe('forbidden_privilege');
  });

  it('block apply_patch', () => {
    const r = evaluateSafety({
      currentState: 'ANALYZE',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 0,
      plan: { items: [{ action: 'apply_patch' as 'retry_ci' }] },
    });
    expect(r.outcome).toBe('block');
    expect(r.reasonCode).toBe('forbidden_privilege');
  });
});

describe('Gate-S20: blocks governance conflict', () => {
  it('block when governance is require_human', () => {
    const r = evaluateSafety({
      currentState: 'ANALYZE',
      governanceOutcome: { verdict: 'require_human', reason: 'manual_only' },
      retryCount: 0,
      plan: { items: [{ action: 'retry_ci' }] },
    });
    expect(r.outcome).toBe('block');
    expect(r.reasonCode).toBe('governance_conflict');
  });
});

describe('Gate-S20: blocks retry in HUMAN terminal state', () => {
  it('block retry_ci when currentState is HUMAN', () => {
    const r = evaluateSafety({
      currentState: 'HUMAN',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 0,
      plan: { items: [{ action: 'retry_ci' }] },
    });
    expect(r.outcome).toBe('block');
    expect(r.reasonCode).toBe('terminal_state_protection');
  });
});

describe('Gate-S20: blocks retry in EXHAUSTED terminal state', () => {
  it('block retry_ci when currentState is EXHAUSTED', () => {
    const r = evaluateSafety({
      currentState: 'EXHAUSTED',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 0,
      plan: { items: [{ action: 'retry_ci' }] },
    });
    expect(r.outcome).toBe('block');
    expect(r.reasonCode).toBe('terminal_state_protection');
  });
});

describe('Gate-S20: allows request_human_intervention in safe fallback conditions', () => {
  it('allow when governance allows and plan is request_human_intervention', () => {
    const r = evaluateSafety({
      currentState: 'ANALYZE',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 0,
      plan: { items: [{ action: 'request_human_intervention' }] },
    });
    expect(r.outcome).toBe('allow');
    expect(r.reasonCode).toBe('safe_to_execute');
  });
});

describe('Gate-S20: allows noop in non-risky context', () => {
  it('allow noop when governance allows (governor typically require_human for noop)', () => {
    const r = evaluateSafety({
      currentState: 'IDLE',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 0,
      plan: { items: [{ action: 'noop' }] },
    });
    expect(r.outcome).toBe('allow');
    expect(r.reasonCode).toBe('safe_to_execute');
  });
});

describe('Gate-S20: falls back to require_human on unknown risk', () => {
  it('require_human for empty plan', () => {
    const r = evaluateSafety({
      currentState: 'ANALYZE',
      governanceOutcome: { verdict: 'allow', reason: 'safe_retry' },
      retryCount: 0,
      plan: { items: [] },
    });
    expect(r.outcome).toBe('require_human');
    expect(r.reasonCode).toBe('unknown_risk');
  });
});
