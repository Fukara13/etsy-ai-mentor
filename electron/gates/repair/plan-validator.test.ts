/**
 * Gate-S17: Plan Validation Layer — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { validateActionPlan } from './plan-validator';

describe('Gate-S17: valid single-action plan accepted', () => {
  it('accepts retry_ci', () => {
    const r = validateActionPlan({ items: [{ action: 'retry_ci' }] });
    expect(r.valid).toBe(true);
  });

  it('accepts request_human_intervention', () => {
    const r = validateActionPlan({ items: [{ action: 'request_human_intervention' }] });
    expect(r.valid).toBe(true);
  });

  it('accepts noop', () => {
    const r = validateActionPlan({ items: [{ action: 'noop' }] });
    expect(r.valid).toBe(true);
  });
});

describe('Gate-S17: valid multi-action plan accepted', () => {
  it('accepts retry_ci and noop (no duplicate)', () => {
    const r = validateActionPlan({
      items: [
        { action: 'retry_ci', reason: 'x' },
        { action: 'noop' },
      ],
    });
    expect(r.valid).toBe(true);
  });

  it('accepts request_human_intervention and retry_ci', () => {
    const r = validateActionPlan({
      items: [
        { action: 'request_human_intervention' },
        { action: 'retry_ci' },
      ],
    });
    expect(r.valid).toBe(true);
  });
});

describe('Gate-S17: empty plan rejected', () => {
  it('rejects empty items', () => {
    const r = validateActionPlan({ items: [] });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('empty');
  });

  it('rejects null plan', () => {
    const r = validateActionPlan(null as unknown as import('./action-plan').ActionPlan);
    expect(r.valid).toBe(false);
  });
});

describe('Gate-S17: unknown action rejected', () => {
  it('rejects merge', () => {
    const r = validateActionPlan({
      items: [{ action: 'merge' as 'retry_ci' }],
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('Unknown');
  });

  it('rejects deploy', () => {
    const r = validateActionPlan({
      items: [{ action: 'deploy' as 'retry_ci' }],
    });
    expect(r.valid).toBe(false);
  });
});

describe('Gate-S17: duplicate action rejected', () => {
  it('rejects duplicate retry_ci', () => {
    const r = validateActionPlan({
      items: [
        { action: 'retry_ci' },
        { action: 'retry_ci' },
      ],
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('Duplicate');
  });

  it('rejects duplicate noop', () => {
    const r = validateActionPlan({
      items: [
        { action: 'noop' },
        { action: 'retry_ci' },
        { action: 'noop' },
      ],
    });
    expect(r.valid).toBe(false);
  });
});

describe('Gate-S17: validation fail triggers fail-safe flow', () => {
  it('when invalid, caller can produce request_human_intervention plan', () => {
    const plan = { items: [{ action: 'merge' as 'retry_ci' }] };
    const result = validateActionPlan(plan);
    expect(result.valid).toBe(false);
    const failSafePlan = {
      items: [
        {
          action: 'request_human_intervention' as const,
          reason: result.reason,
        },
      ],
    };
    expect(failSafePlan.items[0].action).toBe('request_human_intervention');
  });
});
