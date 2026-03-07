/**
 * Gate-S13: Controlled Execution Boundary — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { toExecutableSteps } from './execution-boundary';
import type { ActionPlanItemS13 } from './action-plan';

describe('Gate-S13: retry_ci maps to executable step', () => {
  it('allowed: retry_ci becomes dispatch_workflow step', () => {
    const result = toExecutableSteps({
      items: [{ action: 'retry_ci' }],
    });
    expect(result.status).toBe('allowed');
    expect(result.executableSteps).toHaveLength(1);
    expect(result.executableSteps?.[0]).toEqual({
      kind: 'dispatch_workflow',
      workflow: 'retry_ci',
      payload: undefined,
    });
  });

  it('retry_ci with metadata passes prNumber and correlationId to payload', () => {
    const result = toExecutableSteps({
      items: [
        {
          action: 'retry_ci',
          metadata: { prNumber: 42, correlationId: 'abc-123' },
        },
      ],
    });
    expect(result.status).toBe('allowed');
    expect(result.executableSteps?.[0].payload).toEqual({
      prNumber: 42,
      correlationId: 'abc-123',
    });
  });
});

describe('Gate-S13: noop handled safely', () => {
  it('noop produces allowed with empty executable steps', () => {
    const result = toExecutableSteps({ items: [{ action: 'noop' }] });
    expect(result.status).toBe('allowed');
    expect(result.executableSteps).toEqual([]);
  });

  it('noop + retry_ci yields one step', () => {
    const result = toExecutableSteps({
      items: [{ action: 'noop' }, { action: 'retry_ci' }],
    });
    expect(result.status).toBe('allowed');
    expect(result.executableSteps).toHaveLength(1);
    expect(result.executableSteps?.[0].workflow).toBe('retry_ci');
  });
});

describe('Gate-S13: forbidden/unknown action rejected', () => {
  it('request_human_intervention is rejected with explicit reason', () => {
    const result = toExecutableSteps({
      items: [{ action: 'request_human_intervention', reason: 'CI exhausted' }],
    });
    expect(result.status).toBe('rejected');
    expect(result.reason).toContain('request_human_intervention');
    expect(result.reason).toContain('human');
    expect(result.executableSteps).toBeUndefined();
  });

  it('unknown action type is rejected', () => {
    const result = toExecutableSteps({
      items: [{ action: 'merge' } as unknown as ActionPlanItemS13],
    });
    expect(result.status).toBe('rejected');
    expect(result.reason).toContain('Unknown');
  });

  it('invalid plan structure is rejected', () => {
    const result = toExecutableSteps(null as unknown as import('./action-plan').ActionPlan);
    expect(result.status).toBe('rejected');
    expect(result.reason).toContain('Invalid');
  });
});

describe('Gate-S13: human intervention does not become executable step', () => {
  it('request_human_intervention never yields executable steps', () => {
    const result = toExecutableSteps({
      items: [{ action: 'request_human_intervention' }],
    });
    expect(result.status).toBe('rejected');
    expect(result.executableSteps).toBeUndefined();
  });

  it('mixed plan with human intervention rejects entire plan', () => {
    const result = toExecutableSteps({
      items: [
        { action: 'retry_ci' },
        { action: 'request_human_intervention' },
      ],
    });
    expect(result.status).toBe('rejected');
  });
});

describe('Gate-S13: result structure is deterministic', () => {
  it('allowed result has status and executableSteps', () => {
    const result = toExecutableSteps({ items: [{ action: 'retry_ci' }] });
    expect(result).toHaveProperty('status', 'allowed');
    expect(result).toHaveProperty('executableSteps');
    expect(Array.isArray(result.executableSteps)).toBe(true);
  });

  it('rejected result has status and reason', () => {
    const result = toExecutableSteps({
      items: [{ action: 'request_human_intervention' }],
    });
    expect(result).toHaveProperty('status', 'rejected');
    expect(result).toHaveProperty('reason');
    expect(typeof result.reason).toBe('string');
  });
});
