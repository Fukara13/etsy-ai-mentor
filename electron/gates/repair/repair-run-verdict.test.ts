/**
 * Gate-S24: Repair run verdict — Pure interpretation tests.
 */

import { describe, it, expect } from 'vitest';
import { deriveRepairRunVerdict } from './repair-run-verdict-mapper';
import type { RepairRunOutcome } from './repair-run-outcome';

function outcome(partial: Partial<RepairRunOutcome>): RepairRunOutcome {
  return {
    sessionId: 'test',
    initialState: 'ANALYZE',
    finalState: 'HUMAN',
    totalSteps: 1,
    visitedPath: ['ANALYZE', 'HUMAN'],
    halted: false,
    terminal: false,
    requiresHuman: false,
    exhaustionReached: false,
    terminationReason: 'halted',
    lastTransitionEvent: null,
    lastActor: 'None',
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    ...partial,
  };
}

describe('Gate-S24: resolved path', () => {
  it('terminal without requiresHuman yields resolved', () => {
    const v = deriveRepairRunVerdict(
      outcome({ terminal: true, requiresHuman: false, halted: true })
    );
    expect(v.status).toBe('resolved');
    expect(v.reasonCode).toBe('RUN_RESOLVED');
    expect(v.requiresHuman).toBe(false);
    expect(v.safeToClose).toBe(true);
    expect(v.operatorMessage).toBe('Repair run resolved successfully.');
  });
});

describe('Gate-S24: exhaustion → requires_human', () => {
  it('exhaustionReached yields requires_human with RUN_EXHAUSTED', () => {
    const v = deriveRepairRunVerdict(
      outcome({ exhaustionReached: true, requiresHuman: true, halted: true })
    );
    expect(v.status).toBe('requires_human');
    expect(v.reasonCode).toBe('RUN_EXHAUSTED');
    expect(v.requiresHuman).toBe(true);
    expect(v.operatorMessage).toContain('exhausted retry limit');
  });
});

describe('Gate-S24: requiresHuman → requires_human', () => {
  it('requiresHuman yields requires_human with RUN_TERMINAL_HUMAN', () => {
    const v = deriveRepairRunVerdict(
      outcome({ requiresHuman: true, terminal: true, halted: true })
    );
    expect(v.status).toBe('requires_human');
    expect(v.reasonCode).toBe('RUN_TERMINAL_HUMAN');
    expect(v.requiresHuman).toBe(true);
  });
});

describe('Gate-S24: halted max steps', () => {
  it('halted with max_steps yields RUN_MAX_STEPS_REACHED', () => {
    const v = deriveRepairRunVerdict(
      outcome({
        halted: true,
        requiresHuman: false,
        terminationReason: 'max_steps',
        totalSteps: 5,
      })
    );
    expect(v.status).toBe('halted');
    expect(v.reasonCode).toBe('RUN_MAX_STEPS_REACHED');
    expect(v.safeToRetry).toBe(true);
    expect(v.operatorMessage).toContain('max step limit');
  });
});

describe('Gate-S24: halted blocked', () => {
  it('halted with blocked yields RUN_POLICY_BLOCKED', () => {
    const v = deriveRepairRunVerdict(
      outcome({
        halted: true,
        requiresHuman: true,
        terminationReason: 'blocked',
      })
    );
    expect(v.status).toBe('blocked');
    expect(v.reasonCode).toBe('RUN_POLICY_BLOCKED');
    expect(v.requiresHuman).toBe(true);
  });

  it('halted without specific reason yields RUN_HALTED_BLOCKED', () => {
    const v = deriveRepairRunVerdict(
      outcome({ halted: true, requiresHuman: false, terminationReason: 'halted' })
    );
    expect(v.status).toBe('halted');
    expect(v.reasonCode).toBe('RUN_HALTED_BLOCKED');
  });
});

describe('Gate-S24: cycle suspicion', () => {
  it('cycle_suspicion yields RUN_CYCLE_SUSPECTED', () => {
    const v = deriveRepairRunVerdict(
      outcome({
        requiresHuman: true,
        terminationReason: 'cycle_suspicion',
        halted: true,
      })
    );
    expect(v.status).toBe('requires_human');
    expect(v.reasonCode).toBe('RUN_CYCLE_SUSPECTED');
    expect(v.operatorMessage).toContain('suspected cycle');
  });
});

describe('Gate-S24: deterministic mapping', () => {
  it('same outcome yields identical verdict', () => {
    const o = outcome({ terminal: true, requiresHuman: false });
    const a = deriveRepairRunVerdict(o);
    const b = deriveRepairRunVerdict(o);
    expect(a).toEqual(b);
  });

  it('exhaustion takes precedence over requiresHuman', () => {
    const v = deriveRepairRunVerdict(
      outcome({ exhaustionReached: true, requiresHuman: true })
    );
    expect(v.reasonCode).toBe('RUN_EXHAUSTED');
  });
});
