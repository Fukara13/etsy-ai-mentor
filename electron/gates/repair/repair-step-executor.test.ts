/**
 * Gate-S22: Repair step executor — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { getActorForState } from './step-actor-dispatcher';
import { executeRepairStep } from './repair-step-executor';
import { normalizeActorResult } from './actor-result';

describe('Gate-S22: dispatcher routing', () => {
  it('ANALYZE routes to Analyzer', () => {
    expect(getActorForState('ANALYZE')).toBe('Analyzer');
  });

  it('COACH routes to RepairCoach', () => {
    expect(getActorForState('COACH')).toBe('RepairCoach');
  });

  it('JULES_PENDING routes to JulesPlaceholder', () => {
    expect(getActorForState('JULES_PENDING')).toBe('JulesPlaceholder');
  });

  it('GUARDIAN_CHECK routes to Guardian', () => {
    expect(getActorForState('GUARDIAN_CHECK')).toBe('Guardian');
  });

  it('EVALUATOR_CHECK routes to Evaluator', () => {
    expect(getActorForState('EVALUATOR_CHECK')).toBe('Evaluator');
  });

  it('CI_RETRY routes to RetryController', () => {
    expect(getActorForState('CI_RETRY')).toBe('RetryController');
  });

  it('EXHAUSTED routes to HumanEscalation', () => {
    expect(getActorForState('EXHAUSTED')).toBe('HumanEscalation');
  });

  it('HUMAN is terminal-safe', () => {
    expect(getActorForState('HUMAN')).toBe('None');
  });

  it('IDLE routes to None', () => {
    expect(getActorForState('IDLE')).toBe('None');
  });
});

describe('Gate-S22: normalization', () => {
  it('blocked actor outputs remain blocked after normalization', () => {
    const r = normalizeActorResult({ actor: 'Guardian', blocked: true, reason: 'x' });
    expect(r.blocked).toBe(true);
    expect(r.status).toBe('blocked');
  });

  it('requiresHuman outputs remain preserved', () => {
    const r = normalizeActorResult({
      actor: 'JulesPlaceholder',
      requiresHuman: true,
      reason: 'frozen',
    });
    expect(r.requiresHuman).toBe(true);
    expect(r.status).toBe('requires_human');
  });

  it('terminal outputs remain preserved', () => {
    const r = normalizeActorResult({
      actor: 'HumanEscalation',
      terminal: true,
      reason: 'handoff',
    });
    expect(r.terminal).toBe(true);
  });
});

describe('Gate-S22: step executor happy-path transitions', () => {
  it('ANALYZE leads to COACH', () => {
    const r = executeRepairStep({
      currentState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
    });
    expect(r.previousState).toBe('ANALYZE');
    expect(r.nextState).toBe('COACH');
    expect(r.transitionEvent).toBe('ANALYSIS_COMPLETED');
    expect(r.halted).toBe(false);
  });

  it('COACH leads to JULES_PENDING', () => {
    const r = executeRepairStep({
      currentState: 'COACH',
      retryCount: 0,
      maxRetries: 3,
    });
    expect(r.nextState).toBe('JULES_PENDING');
    expect(r.transitionEvent).toBe('COACH_COMPLETED');
  });

  it('GUARDIAN_CHECK leads to EVALUATOR_CHECK when allowed', () => {
    const r = executeRepairStep({
      currentState: 'GUARDIAN_CHECK',
      retryCount: 0,
      maxRetries: 3,
      metadata: { paths: ['src/foo.ts'] },
    });
    expect(r.nextState).toBe('EVALUATOR_CHECK');
    expect(r.transitionEvent).toBe('GUARDIAN_COMPLETED');
  });

  it('CI_RETRY transitions to ANALYZE when retry available', () => {
    const r = executeRepairStep({
      currentState: 'CI_RETRY',
      retryCount: 1,
      maxRetries: 3,
    });
    expect(r.nextState).toBe('ANALYZE');
    expect(r.transitionEvent).toBe('CI_RETRY_COMPLETED');
  });
});

describe('Gate-S22: step executor fail-safe behavior', () => {
  it('JULES_PENDING does not activate real Jules', () => {
    const r = executeRepairStep({
      currentState: 'JULES_PENDING',
      retryCount: 0,
      maxRetries: 3,
    });
    expect(r.actor).toBe('JulesPlaceholder');
    expect(r.requiresHuman).toBe(true);
    expect(r.nextState).toBe('HUMAN');
  });

  it('EXHAUSTED forces human-safe path', () => {
    const r = executeRepairStep({
      currentState: 'EXHAUSTED',
      retryCount: 3,
      maxRetries: 3,
    });
    expect(r.nextState).toBe('HUMAN');
    expect(r.requiresHuman).toBe(true);
    expect(r.terminal).toBe(true);
  });

  it('HUMAN state does not continue execution', () => {
    const r = executeRepairStep({
      currentState: 'HUMAN',
      retryCount: 0,
      maxRetries: 3,
    });
    expect(r.halted).toBe(true);
    expect(r.nextState).toBe('HUMAN');
    expect(r.actor).toBe('None');
  });

  it('IDLE halts safely', () => {
    const r = executeRepairStep({
      currentState: 'IDLE',
      retryCount: 0,
      maxRetries: 3,
    });
    expect(r.halted).toBe(true);
    expect(r.actor).toBe('None');
  });

  it('CI_RETRY at limit transitions to EXHAUSTED then HUMAN', () => {
    const r = executeRepairStep({
      currentState: 'CI_RETRY',
      retryCount: 3,
      maxRetries: 3,
    });
    expect(r.transitionEvent).toBe('RETRY_LIMIT_REACHED');
    expect(r.nextState).toBe('EXHAUSTED');
  });
});

describe('Gate-S22: determinism', () => {
  it('identical input produces identical output', () => {
    const ctx = { currentState: 'ANALYZE' as const, retryCount: 0, maxRetries: 3 };
    const a = executeRepairStep(ctx);
    const b = executeRepairStep(ctx);
    expect(a.nextState).toBe(b.nextState);
    expect(a.transitionEvent).toBe(b.transitionEvent);
    expect(a.halted).toBe(b.halted);
  });

  it('input context is not mutated', () => {
    const ctx = { currentState: 'ANALYZE' as const, retryCount: 0, maxRetries: 3 };
    const before = JSON.stringify(ctx);
    executeRepairStep(ctx);
    expect(JSON.stringify(ctx)).toBe(before);
  });
});

describe('Gate-S22: architecture preservation', () => {
  it('state machine remains source of truth', () => {
    const r = executeRepairStep({
      currentState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
    });
    expect(r.nextState).toBe('COACH');
  });

  it('no illegal transition', () => {
    const r = executeRepairStep({
      currentState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
    });
    expect(['COACH', 'HUMAN']).toContain(r.nextState);
  });
});
