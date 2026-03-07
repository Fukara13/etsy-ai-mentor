/**
 * Gate-S10: Deterministic tests for Autonomous Repair Loop.
 * No merge path. Only Jules as write actor. Human final authority.
 */

import { describe, it, expect } from 'vitest';
import {
  ciFailToAnalyze,
  analyzerToCoach,
  coachToJulesPending,
  julesFrozen,
  julesFrozenToHuman,
  julesToGuardian,
  guardianToEvaluator,
  evaluatorToNext,
  toHuman,
  createJulesFrozenResult,
  initialRetryState,
  createRetryState,
  incrementRetry,
  isExhausted,
  getExhaustionMessage,
  canRetry,
  runGuardian,
  runEvaluator,
  EXHAUSTION_MESSAGE,
  WRITE_ACTOR,
} from './index';

describe('Gate-S10: CI FAIL enters Analyze state', () => {
  it('ciFailToAnalyze returns ANALYZE phase', () => {
    const state = ciFailToAnalyze();
    expect(state.phase).toBe('ANALYZE');
    expect(state.ciFailed).toBe(true);
  });
});

describe('Gate-S10: Analyzer -> Coach -> Jules happy path', () => {
  it('flows Analyzer -> Coach -> Jules', () => {
    const analyzer = { ok: true, summary: 'Build timeout' };
    const coach = { ok: true, guidance: 'Reduce test scope' };
    const s1 = analyzerToCoach(analyzer);
    expect(s1.phase).toBe('COACH');
    expect(s1.analyzer).toEqual(analyzer);

    const s2 = coachToJulesPending(coach);
    expect(s2.phase).toBe('JULES_PENDING');
    expect(s2.coach).toEqual(coach);

    const s3 = julesToGuardian('patch summary');
    expect(s3.phase).toBe('GUARDIAN_CHECK');
  });
});

describe('Gate-S10: Guardian blocks forbidden patch', () => {
  it('blocks forbidden paths', () => {
    const result = runGuardian({ paths: ['.env', 'src/foo.ts'] });
    expect(result.allowed).toBe(false);
    expect(result.violations).toContain('Forbidden path: .env');
  });

  it('blocks workflow file changes', () => {
    const result = runGuardian({
      paths: ['.github/workflows/ci.yml'],
    });
    expect(result.allowed).toBe(false);
    expect(result.violations?.some((v) => v.includes('Workflow'))).toBe(true);
  });

  it('blocks dependency file changes', () => {
    const result = runGuardian({ paths: ['package.json'] });
    expect(result.allowed).toBe(false);
    expect(result.violations?.some((v) => v.includes('Dependency'))).toBe(true);
  });

  it('blocks test-skip edits', () => {
    const result = runGuardian({
      paths: ['src/foo.test.ts'],
      diffText: 'it.skip("foo", () => {});',
    });
    expect(result.allowed).toBe(false);
    expect(result.violations?.some((v) => v.includes('test-skip'))).toBe(true);
  });

  it('allows safe patch', () => {
    const result = runGuardian({
      paths: ['src/bar.ts', 'src/baz.ts'],
      diffText: 'const x = 1;',
    });
    expect(result.allowed).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it('blocks excessive file count when maxFileCount set', () => {
    const result = runGuardian({
      paths: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
      maxFileCount: 3,
    });
    expect(result.allowed).toBe(false);
    expect(result.violations?.some((v) => v.includes('Excessive file count'))).toBe(
      true
    );
  });

  it('blocks oversized diff when maxDiffSize set', () => {
    const result = runGuardian({
      paths: ['a.ts'],
      diffText: 'x'.repeat(500),
      maxDiffSize: 100,
    });
    expect(result.allowed).toBe(false);
    expect(result.violations?.some((v) => v.includes('Oversized diff'))).toBe(true);
  });
});

describe('Gate-S10: Evaluator rejects low-quality / suspicious patch', () => {
  it('rejects when CI did not pass', () => {
    const guardian = { allowed: true, reason: 'ok' };
    const result = runEvaluator({
      ciPassed: false,
      guardian,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('CI');
  });

  it('rejects when Guardian blocked', () => {
    const guardian = { allowed: false, reason: 'blocked', violations: ['x'] };
    const result = runEvaluator({
      ciPassed: true,
      guardian,
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Guardian');
  });

  it('rejects when suspicious edits flag is false', () => {
    const guardian = { allowed: true, reason: 'ok' };
    const result = runEvaluator({
      ciPassed: true,
      guardian,
      noSuspiciousEdits: false,
    });
    expect(result.passed).toBe(false);
  });

  it('passes when CI passed and policy ok', () => {
    const guardian = { allowed: true, reason: 'ok' };
    const result = runEvaluator({ ciPassed: true, guardian });
    expect(result.passed).toBe(true);
  });
});

describe('Gate-S10: Retry count increments correctly', () => {
  it('increments from 0 to 3', () => {
    let s = createRetryState();
    expect(s.attempt).toBe(0);
    s = incrementRetry(s);
    expect(s.attempt).toBe(1);
    s = incrementRetry(s);
    expect(s.attempt).toBe(2);
    s = incrementRetry(s);
    expect(s.attempt).toBe(3);
    expect(s.exhausted).toBe(true);
  });
});

describe('Gate-S10: Retry stops at 3/3', () => {
  it('isExhausted true at 3/3', () => {
    const s = { attempt: 3, maxAttempts: 3 as const, exhausted: true };
    expect(isExhausted(s)).toBe(true);
  });

  it('canRetry false at 3', () => {
    const s = { attempt: 3, maxAttempts: 3 as const, exhausted: true };
    expect(canRetry(s)).toBe(false);
  });
});

describe('Gate-S10: Exhaustion message is emitted exactly', () => {
  it('message matches spec', () => {
    expect(getExhaustionMessage()).toBe(EXHAUSTION_MESSAGE);
    expect(EXHAUSTION_MESSAGE).toBe(
      'Auto-remediation exhausted (3/3). Manual intervention required.'
    );
  });

  it('evaluatorToNext yields EXHAUSTED with exact message at 3/3', () => {
    const evaluator = { passed: false, reason: 'CI failed' };
    const retry = { attempt: 2, maxAttempts: 3 as const, exhausted: false };
    const next = evaluatorToNext(evaluator, retry);
    expect(next.phase).toBe('EXHAUSTED');
    expect(next.phase === 'EXHAUSTED' && next.message).toBe(EXHAUSTION_MESSAGE);
  });
});

describe('Gate-S10: Human remains final authority', () => {
  it('toHuman produces HUMAN phase', () => {
    const retry = initialRetryState();
    const state = toHuman(retry);
    expect(state.phase).toBe('HUMAN');
  });

  it('evaluator pass yields HUMAN (no merge)', () => {
    const evaluator = { passed: true, reason: 'ok' };
    const retry = initialRetryState();
    const state = evaluatorToNext(evaluator, retry);
    expect(state.phase).toBe('HUMAN');
  });
});

describe('Gate-S10: No merge path', () => {
  it('no merge in state machine transitions', () => {
    const phases = [
      ciFailToAnalyze(),
      analyzerToCoach({ ok: true, summary: '' }),
      coachToJulesPending({ ok: true, guidance: '' }),
      julesToGuardian(),
      guardianToEvaluator({ allowed: true, reason: 'ok' }),
    ];
    const phaseNames = phases.map((s) => s.phase);
    expect(phaseNames).not.toContain('MERGE');
    expect(phaseNames).not.toContain('AUTO_MERGE');
  });
});

describe('Gate-S10: Only Jules as write actor', () => {
  it('WRITE_ACTOR is Jules', () => {
    expect(WRITE_ACTOR).toBe('Jules');
  });
});

describe('Gate-S10: Jules freeze mode', () => {
  it('when Jules is frozen: no real patch, patch is null, status skipped_due_to_freeze, flow under Human', () => {
    const julesResult = createJulesFrozenResult('Jules is frozen');
    expect(julesResult.status).toBe('skipped_due_to_freeze');
    expect(julesResult.patch).toBe(null);
    expect(julesResult.reason).toBe('Jules is frozen');

    const retry = initialRetryState();
    const frozenState = julesFrozen(julesResult, retry);
    expect(frozenState.phase).toBe('JULES_FROZEN');
    expect(frozenState.phase === 'JULES_FROZEN' && frozenState.julesResult.patch).toBe(null);
    expect(frozenState.phase === 'JULES_FROZEN' && frozenState.julesResult.status).toBe(
      'skipped_due_to_freeze'
    );

    const humanState = julesFrozenToHuman(retry);
    expect(humanState.phase).toBe('HUMAN');
  });
});
