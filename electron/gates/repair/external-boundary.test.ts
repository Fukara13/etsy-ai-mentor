/**
 * Gate-S26: External boundary — Pure projection tests.
 */

import { describe, it, expect } from 'vitest';
import { mapRepairExternalProjection } from './external-boundary-mapper';
import type { RepairOperatorHandoff } from './operator-handoff.types';
import type { RepairRunOutcome } from './repair-run-outcome';

function handoff(partial: Partial<RepairOperatorHandoff>): RepairOperatorHandoff {
  return {
    status: 'halted',
    reasonCode: 'RUN_HALTED_BLOCKED',
    finalState: 'HUMAN',
    requiresHuman: false,
    safeToRetry: true,
    safeToClose: false,
    handoffIntent: 'stop',
    operatorMessage: 'Repair run halted.',
    summary: 'Repair halted.',
    nextAction: 'blocked_no_action',
    ...partial,
  };
}

function outcome(partial: Partial<RepairRunOutcome>): RepairRunOutcome {
  return {
    sessionId: 'repair_123',
    initialState: 'ANALYZE',
    finalState: 'HUMAN',
    totalSteps: 5,
    visitedPath: ['ANALYZE', 'COACH', 'JULES_PENDING', 'HUMAN'],
    halted: true,
    terminal: true,
    requiresHuman: true,
    exhaustionReached: false,
    terminationReason: 'requires_human',
    lastTransitionEvent: 'HUMAN_ESCALATION',
    lastActor: 'JulesPlaceholder',
    startedAt: '',
    endedAt: '',
    ...partial,
  };
}

describe('Gate-S26: resolved / safe close', () => {
  it('maps RUN_RESOLVED to projection with safeToClose=true', () => {
    const p = mapRepairExternalProjection({
      handoff: handoff({
        status: 'resolved',
        reasonCode: 'RUN_RESOLVED',
        requiresHuman: false,
        safeToClose: true,
        safeToRetry: false,
        nextAction: 'close_safe',
        operatorMessage: 'Repair run resolved successfully.',
        summary: 'Repair resolved.',
      }),
    });
    expect(p.projectionStatus).toBe('resolved');
    expect(p.safeToClose).toBe(true);
    expect(p.requiresHuman).toBe(false);
    expect(p.recommendedAction).toBe('close_safe');
    expect(p.projectionTarget).toBe('operator');
  });
});

describe('Gate-S26: requires human / manual repair', () => {
  it('maps to projectionTarget=human and manual_repair_required', () => {
    const p = mapRepairExternalProjection({
      handoff: handoff({
        status: 'requires_human',
        reasonCode: 'RUN_EXHAUSTED',
        requiresHuman: true,
        nextAction: 'manual_repair_required',
        operatorMessage: 'Repair run exhausted retry limit. Human intervention required.',
      }),
    });
    expect(p.projectionTarget).toBe('human');
    expect(p.requiresHuman).toBe(true);
    expect(p.recommendedAction).toBe('manual_repair_required');
    expect(p.projectionMessage).toContain('exhausted');
  });
});

describe('Gate-S26: blocked / no action', () => {
  it('maps RUN_POLICY_BLOCKED to blocked_no_action', () => {
    const p = mapRepairExternalProjection({
      handoff: handoff({
        status: 'blocked',
        reasonCode: 'RUN_POLICY_BLOCKED',
        requiresHuman: true,
        safeToRetry: false,
        safeToClose: false,
        nextAction: 'blocked_no_action',
        operatorMessage: 'Repair blocked by policy. Human intervention required.',
      }),
    });
    expect(p.projectionStatus).toBe('blocked');
    expect(p.recommendedAction).toBe('blocked_no_action');
    expect(p.safeToRetry).toBe(false);
    expect(p.safeToClose).toBe(false);
  });
});

describe('Gate-S26: retry-safe case', () => {
  it('maps RUN_MAX_STEPS_REACHED to retry_safe semantics', () => {
    const p = mapRepairExternalProjection({
      handoff: handoff({
        status: 'halted',
        reasonCode: 'RUN_MAX_STEPS_REACHED',
        requiresHuman: false,
        safeToRetry: true,
        safeToClose: false,
        nextAction: 'review_required',
        operatorMessage: 'Repair halted due to max step limit.',
      }),
    });
    expect(p.safeToRetry).toBe(true);
    expect(p.safeToClose).toBe(false);
    expect(p.recommendedAction).toBe('review_required');
  });
});

describe('Gate-S26: missing outcome fallback', () => {
  it('produces valid projection without outcome', () => {
    const p = mapRepairExternalProjection({
      handoff: handoff({ finalState: 'EXHAUSTED' }),
    });
    expect(p.finalState).toBe('EXHAUSTED');
    expect(p.metadata).toBeUndefined();
  });

  it('includes metadata when outcome is provided', () => {
    const p = mapRepairExternalProjection({
      handoff: handoff({}),
      outcome: outcome({ sessionId: 'session-xyz', totalSteps: 3 }),
    });
    expect(p.metadata).toEqual({ sessionId: 'session-xyz', totalSteps: 3 });
  });
});

describe('Gate-S26: deterministic mapping', () => {
  it('same input yields identical output', () => {
    const params = {
      handoff: handoff({ reasonCode: 'RUN_RESOLVED' }),
      outcome: outcome({ sessionId: 'abc' }),
    };
    const a = mapRepairExternalProjection(params);
    const b = mapRepairExternalProjection(params);
    expect(a).toEqual(b);
  });
});
