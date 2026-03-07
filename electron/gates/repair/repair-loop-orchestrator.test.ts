/**
 * Gate-S23: Bounded repair loop orchestrator — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { runBoundedRepairLoop } from './repair-loop-orchestrator';

describe('Gate-S23: happy-path bounded progression', () => {
  it('run starts from canonical state and executes steps', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 20,
    });
    expect(outcome.initialState).toBe('ANALYZE');
    expect(outcome.totalSteps).toBeGreaterThanOrEqual(1);
    expect(outcome.visitedPath).toContain('ANALYZE');
  });

  it('steps execute in order and outcome is deterministic', () => {
    const a = runBoundedRepairLoop({
      initialState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 20,
    });
    const b = runBoundedRepairLoop({
      initialState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 20,
    });
    expect(a.finalState).toBe(b.finalState);
    expect(a.totalSteps).toBe(b.totalSteps);
    expect(a.visitedPath).toEqual(b.visitedPath);
  });
});

describe('Gate-S23: HUMAN stop behavior', () => {
  it('loop stops when HUMAN is reached', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'JULES_PENDING',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 20,
    });
    expect(outcome.finalState).toBe('HUMAN');
    expect(outcome.terminal).toBe(true);
    expect(outcome.requiresHuman).toBe(true);
  });
});

describe('Gate-S23: EXHAUSTED escalation preserved', () => {
  it('exhausted path remains safe', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'CI_RETRY',
      retryCount: 3,
      maxRetries: 3,
      maxSteps: 20,
    });
    expect(outcome.exhaustionReached || outcome.requiresHuman).toBe(true);
  });
});

describe('Gate-S23: max-step budget enforcement', () => {
  it('run halts when maxSteps is reached', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 2,
    });
    expect(outcome.totalSteps).toBeLessThanOrEqual(2);
    expect(outcome.terminationReason).toBe('max_steps');
  });
});

describe('Gate-S23: cycle suspicion handling', () => {
  it('repeated state pattern halts safely', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 100,
    });
    const counts = new Map<string, number>();
    for (const s of outcome.visitedPath) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const maxVisits = Math.max(...counts.values());
    expect(maxVisits).toBeLessThanOrEqual(3);
  });
});

describe('Gate-S23: canon respected', () => {
  it('loop uses step executor', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'COACH',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 5,
    });
    expect(outcome.visitedPath).toContain('COACH');
    expect(outcome.lastActor).not.toBe('');
  });
});

describe('Gate-S23: final run summary accuracy', () => {
  it('visited path is captured', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 10,
    });
    expect(outcome.visitedPath.length).toBeGreaterThanOrEqual(1);
    expect(outcome.visitedPath[0]).toBe(outcome.initialState);
    expect(outcome.visitedPath[outcome.visitedPath.length - 1]).toBe(outcome.finalState);
  });

  it('total steps match executed steps', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'ANALYZE',
      retryCount: 0,
      maxRetries: 3,
      maxSteps: 10,
    });
    expect(outcome.totalSteps).toBe(outcome.visitedPath.length - 1);
  });

  it('sessionId and timestamps present', () => {
    const outcome = runBoundedRepairLoop({
      initialState: 'IDLE',
      maxSteps: 1,
      sessionId: 'test-session-123',
    });
    expect(outcome.sessionId).toBe('test-session-123');
    expect(outcome.startedAt).toBeTruthy();
    expect(outcome.endedAt).toBeTruthy();
  });
});
