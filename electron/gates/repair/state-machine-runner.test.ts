/**
 * Gate-S19: State machine runner — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { step, runLoop, INITIAL_STATE } from './state-machine-runner';
import type { RepairEvent } from './repair-event';

describe('Gate-S19: CI failure event enters runtime', () => {
  it('initial state is IDLE', () => {
    expect(INITIAL_STATE).toBe('IDLE');
  });

  it('CI_FAILURE_START produces ANALYZE and RUN_ANALYZER', () => {
    const result = step('IDLE', 'CI_FAILURE_START');
    expect(result.nextState).toBe('ANALYZE');
    expect(result.intent.type).toBe('RUN_ANALYZER');
    expect(result.terminal).toBe(false);
  });
});

describe('Gate-S19: runtime advances through canonical flow', () => {
  it('can advance IDLE -> ANALYZE -> COACH -> JULES_PENDING -> HUMAN', () => {
    const r1 = step('IDLE', 'CI_FAILURE_START');
    expect(r1.nextState).toBe('ANALYZE');

    const r2 = step('ANALYZE', 'ANALYSIS_COMPLETED');
    expect(r2.nextState).toBe('COACH');

    const r3 = step('COACH', 'COACH_COMPLETED');
    expect(r3.nextState).toBe('JULES_PENDING');

    const r4 = step('JULES_PENDING', 'JULES_FROZEN_OUTCOME');
    expect(r4.nextState).toBe('HUMAN');
    expect(r4.terminal).toBe(true);
  });
});

describe('Gate-S19: governance/human-required path ends in HUMAN', () => {
  it('ANALYZE + PLAN_REQUIRES_HUMAN -> HUMAN', () => {
    const result = step('ANALYZE', 'PLAN_REQUIRES_HUMAN');
    expect(result.nextState).toBe('HUMAN');
    expect(result.terminal).toBe(true);
  });

  it('runLoop with executor that escalates ends in HUMAN', () => {
    const finalState = runLoop('CI_FAILURE_START', (intent) => {
      if (intent.type === 'RUN_ANALYZER') return 'PLAN_REQUIRES_HUMAN' as RepairEvent;
      return null;
    });
    expect(finalState).toBe('HUMAN');
  });
});

describe('Gate-S19: retry exhaustion ends in EXHAUSTED/HUMAN', () => {
  it('CI_RETRY + RETRY_LIMIT_REACHED -> EXHAUSTED (terminal)', () => {
    const result = step('CI_RETRY', 'RETRY_LIMIT_REACHED');
    expect(result.nextState).toBe('EXHAUSTED');
    expect(result.terminal).toBe(true);
  });

  it('EVALUATOR_CHECK + RETRY_LIMIT_REACHED -> EXHAUSTED', () => {
    const result = step('EVALUATOR_CHECK', 'RETRY_LIMIT_REACHED');
    expect(result.nextState).toBe('EXHAUSTED');
  });

  it('runLoop to retry exhaustion ends in EXHAUSTED', () => {
    const finalState = runLoop('CI_FAILURE_START', (_intent, state) => {
      if (state === 'ANALYZE') return 'ANALYSIS_COMPLETED';
      if (state === 'COACH') return 'COACH_COMPLETED';
      if (state === 'JULES_PENDING') return 'JULES_PATCH_PRODUCED';
      if (state === 'GUARDIAN_CHECK') return 'GUARDIAN_COMPLETED';
      if (state === 'EVALUATOR_CHECK') return 'EVALUATOR_FAILED';
      if (state === 'CI_RETRY') return 'RETRY_LIMIT_REACHED';
      return null;
    });
    expect(finalState).toBe('EXHAUSTED');
  });
});

describe('Gate-S19: no bypass behavior', () => {
  it('invalid event from IDLE escalates to HUMAN', () => {
    const result = step('IDLE', 'ANALYSIS_COMPLETED');
    expect(result.nextState).toBe('HUMAN');
  });

  it('executor returning null escalates to HUMAN', () => {
    const finalState = runLoop('CI_FAILURE_START', () => null);
    expect(finalState).toBe('HUMAN');
  });
});
