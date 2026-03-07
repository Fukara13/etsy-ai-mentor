/**
 * Gate-S25: Operator handoff — Deterministic mapping tests.
 */

import { describe, it, expect } from 'vitest';
import { mapRepairOperatorHandoff } from './operator-handoff-mapper';
import type { RepairRunVerdict } from './repair-run-verdict';
import type { RepairRunOutcome } from './repair-run-outcome';

function verdict(partial: Partial<RepairRunVerdict>): RepairRunVerdict {
  return {
    status: 'halted',
    reasonCode: 'RUN_HALTED_BLOCKED',
    requiresHuman: false,
    safeToRetry: true,
    safeToClose: false,
    operatorMessage: 'Repair run halted.',
    ...partial,
  };
}

function outcome(partial: Partial<RepairRunOutcome>): RepairRunOutcome {
  return {
    sessionId: 'test',
    initialState: 'ANALYZE',
    finalState: 'HUMAN',
    totalSteps: 1,
    visitedPath: ['ANALYZE', 'HUMAN'],
    halted: true,
    terminal: false,
    requiresHuman: false,
    exhaustionReached: false,
    terminationReason: 'halted',
    lastTransitionEvent: null,
    lastActor: 'None',
    startedAt: '',
    endedAt: '',
    ...partial,
  };
}

describe('Gate-S25: RUN_RESOLVED -> inform + close_safe + safeToClose=true', () => {
  it('maps to inform handoffIntent and close_safe nextAction', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({
        status: 'resolved',
        reasonCode: 'RUN_RESOLVED',
        requiresHuman: false,
        safeToClose: true,
        operatorMessage: 'Repair run resolved successfully.',
      }),
      outcome: outcome({ finalState: 'EXHAUSTED' }),
    });
    expect(h.handoffIntent).toBe('inform');
    expect(h.nextAction).toBe('close_safe');
    expect(h.safeToClose).toBe(true);
    expect(h.requiresHuman).toBe(false);
  });
});

describe('Gate-S25: RUN_EXHAUSTED -> intervene + manual_repair_required + requiresHuman=true', () => {
  it('maps to intervene and manual_repair_required', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({
        status: 'requires_human',
        reasonCode: 'RUN_EXHAUSTED',
        requiresHuman: true,
        safeToClose: true,
        operatorMessage: 'Repair run exhausted retry limit. Human intervention required.',
      }),
      outcome: outcome({ finalState: 'EXHAUSTED' }),
    });
    expect(h.handoffIntent).toBe('intervene');
    expect(h.nextAction).toBe('manual_repair_required');
    expect(h.requiresHuman).toBe(true);
    expect(h.safeToClose).toBe(false);
  });
});

describe('Gate-S25: RUN_TERMINAL_HUMAN -> intervene + manual_repair_required', () => {
  it('maps to intervene and manual_repair_required', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({
        status: 'requires_human',
        reasonCode: 'RUN_TERMINAL_HUMAN',
        requiresHuman: true,
        operatorMessage: 'Repair run requires human intervention.',
      }),
      outcome: outcome({ finalState: 'HUMAN' }),
    });
    expect(h.handoffIntent).toBe('intervene');
    expect(h.nextAction).toBe('manual_repair_required');
  });
});

describe('Gate-S25: RUN_POLICY_BLOCKED -> stop + blocked_no_action + safeToRetry=false', () => {
  it('maps to stop and blocked_no_action', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({
        status: 'blocked',
        reasonCode: 'RUN_POLICY_BLOCKED',
        requiresHuman: true,
        safeToRetry: false,
        safeToClose: false,
        operatorMessage: 'Repair blocked by policy. Human intervention required.',
      }),
      outcome: outcome({ finalState: 'HUMAN' }),
    });
    expect(h.handoffIntent).toBe('stop');
    expect(h.nextAction).toBe('blocked_no_action');
    expect(h.safeToRetry).toBe(false);
    expect(h.safeToClose).toBe(false);
  });
});

describe('Gate-S25: RUN_CYCLE_SUSPECTED -> review + review_required', () => {
  it('maps to review and review_required', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({
        status: 'requires_human',
        reasonCode: 'RUN_CYCLE_SUSPECTED',
        requiresHuman: true,
        operatorMessage: 'Repair run halted due to suspected cycle. Human intervention required.',
      }),
      outcome: outcome({ finalState: 'COACH' }),
    });
    expect(h.handoffIntent).toBe('review');
    expect(h.nextAction).toBe('review_required');
  });
});

describe('Gate-S25: RUN_MAX_STEPS_REACHED -> review + review_required', () => {
  it('maps to review and review_required', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({
        status: 'halted',
        reasonCode: 'RUN_MAX_STEPS_REACHED',
        requiresHuman: false,
        safeToRetry: true,
        safeToClose: false,
        operatorMessage: 'Repair halted due to max step limit.',
      }),
      outcome: outcome({ finalState: 'JULES_PENDING' }),
    });
    expect(h.handoffIntent).toBe('review');
    expect(h.nextAction).toBe('review_required');
  });
});

describe('Gate-S25: RUN_HALTED_BLOCKED -> stop + blocked_no_action', () => {
  it('maps to stop and blocked_no_action with requiresHuman=true', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({
        status: 'halted',
        reasonCode: 'RUN_HALTED_BLOCKED',
        requiresHuman: false,
        safeToRetry: true,
        safeToClose: false,
        operatorMessage: 'Repair run halted.',
      }),
      outcome: outcome({ finalState: 'COACH' }),
    });
    expect(h.handoffIntent).toBe('stop');
    expect(h.nextAction).toBe('blocked_no_action');
    expect(h.requiresHuman).toBe(true);
  });
});

describe('Gate-S25: summary vs operatorMessage differ', () => {
  it('summary is short and operatorMessage is more descriptive', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({
        status: 'requires_human',
        reasonCode: 'RUN_EXHAUSTED',
        requiresHuman: true,
        operatorMessage: 'Repair run exhausted retry limit. Human intervention required.',
      }),
      outcome: outcome({ finalState: 'EXHAUSTED' }),
    });
    expect(h.summary).not.toBe(h.operatorMessage);
    expect(h.summary.length).toBeLessThanOrEqual(h.operatorMessage.length);
    expect(h.operatorMessage).toContain('exhausted retry limit');
  });
});

describe('Gate-S25: deterministic mapping', () => {
  it('same input yields identical output', () => {
    const params = {
      verdict: verdict({ reasonCode: 'RUN_RESOLVED', status: 'resolved' }),
      outcome: outcome({ finalState: 'EXHAUSTED' }),
    };
    const a = mapRepairOperatorHandoff(params);
    const b = mapRepairOperatorHandoff(params);
    expect(a).toEqual(b);
  });
});

describe('Gate-S25: canonical shape', () => {
  it('output contains all required handoff fields', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({ reasonCode: 'RUN_RESOLVED' }),
      outcome: outcome({ finalState: 'EXHAUSTED' }),
    });
    expect(h).toHaveProperty('status');
    expect(h).toHaveProperty('reasonCode');
    expect(h).toHaveProperty('finalState');
    expect(h).toHaveProperty('requiresHuman');
    expect(h).toHaveProperty('safeToRetry');
    expect(h).toHaveProperty('safeToClose');
    expect(h).toHaveProperty('handoffIntent');
    expect(h).toHaveProperty('operatorMessage');
    expect(h).toHaveProperty('summary');
    expect(h).toHaveProperty('nextAction');
    expect(h.finalState).toBe('EXHAUSTED');
  });

  it('uses default finalState when outcome is omitted', () => {
    const h = mapRepairOperatorHandoff({
      verdict: verdict({ reasonCode: 'RUN_RESOLVED' }),
    });
    expect(h.finalState).toBe('HUMAN');
  });
});
