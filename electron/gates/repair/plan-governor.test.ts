/**
 * Gate-S18: Plan Governance Layer — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { governActionPlan } from './plan-governor';
import { validateActionPlan } from './plan-validator';
import { toExecutableSteps } from './execution-boundary';

describe('Gate-S18: retry_ci-only => allow / safe_retry', () => {
  it('validated retry_ci-only plan returns allow', () => {
    const plan = { items: [{ action: 'retry_ci' as const }] };
    expect(validateActionPlan(plan).valid).toBe(true);
    const r = governActionPlan(plan);
    expect(r.verdict).toBe('allow');
    expect(r.reason).toBe('safe_retry');
  });
});

describe('Gate-S18: request_human_intervention-only => require_human / manual_only', () => {
  it('validated request_human_intervention returns require_human', () => {
    const plan = { items: [{ action: 'request_human_intervention' as const }] };
    expect(validateActionPlan(plan).valid).toBe(true);
    const r = governActionPlan(plan);
    expect(r.verdict).toBe('require_human');
    expect(r.reason).toBe('manual_only');
  });
});

describe('Gate-S18: noop-only => fail-safe', () => {
  it('validated noop-only returns require_human', () => {
    const plan = { items: [{ action: 'noop' as const }] };
    expect(validateActionPlan(plan).valid).toBe(true);
    const r = governActionPlan(plan);
    expect(r.verdict).toBe('require_human');
    expect(r.reason).toBe('unknown_risk');
  });
});

describe('Gate-S18: mixed or ambiguous => fail-safe', () => {
  it('retry_ci + noop returns require_human', () => {
    const plan = {
      items: [
        { action: 'retry_ci' as const },
        { action: 'noop' as const },
      ],
    };
    const r = governActionPlan(plan);
    expect(r.verdict).toBe('require_human');
    expect(r.reason).toBe('unknown_risk');
  });

  it('retry_ci + request_human_intervention returns require_human', () => {
    const plan = {
      items: [
        { action: 'retry_ci' as const },
        { action: 'request_human_intervention' as const },
      ],
    };
    const r = governActionPlan(plan);
    expect(r.verdict).toBe('require_human');
    expect(r.reason).toBe('manual_only');
  });
});

describe('Gate-S18: integration — allowed plan reaches Execution Boundary', () => {
  it('validated + allowed plan proceeds to boundary', () => {
    const plan = { items: [{ action: 'retry_ci' as const }] };
    const validation = validateActionPlan(plan);
    expect(validation.valid).toBe(true);
    const governance = governActionPlan(plan);
    expect(governance.verdict).toBe('allow');

    const boundaryResult = toExecutableSteps(plan);
    expect(boundaryResult.status).toBe('allowed');
    expect(boundaryResult.executableSteps).toHaveLength(1);
    expect(boundaryResult.executableSteps?.[0].workflow).toBe('retry_ci');
  });
});

describe('Gate-S18: integration — require_human does NOT reach Boundary', () => {
  it('validated + require_human plan does not produce executable steps', () => {
    const plan = { items: [{ action: 'request_human_intervention' as const }] };
    const validation = validateActionPlan(plan);
    expect(validation.valid).toBe(true);
    const governance = governActionPlan(plan);
    expect(governance.verdict).toBe('require_human');

    const boundaryResult = toExecutableSteps(plan);
    expect(boundaryResult.status).toBe('rejected');
    expect(boundaryResult.executableSteps).toBeUndefined();
  });
});
