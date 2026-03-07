/**
 * Gate-S21: Repair State Machine — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import {
  REPAIR_STATE_SEQUENCE,
  getAllowedNextStates,
  canTransition,
  assertValidTransition,
  isTerminalRepairState,
} from './repair-state-machine';

describe('Gate-S21: state canon integrity', () => {
  it('canonical states are defined in expected order', () => {
    const expected = [
      'IDLE',
      'ANALYZE',
      'COACH',
      'JULES_PENDING',
      'GUARDIAN_CHECK',
      'EVALUATOR_CHECK',
      'CI_RETRY',
      'EXHAUSTED',
      'HUMAN',
    ];
    expect([...REPAIR_STATE_SEQUENCE]).toEqual(expected);
  });
});

describe('Gate-S21: allowed transitions', () => {
  const validTransitions: [string, string][] = [
    ['IDLE', 'ANALYZE'],
    ['ANALYZE', 'COACH'],
    ['COACH', 'JULES_PENDING'],
    ['JULES_PENDING', 'GUARDIAN_CHECK'],
    ['GUARDIAN_CHECK', 'EVALUATOR_CHECK'],
    ['EVALUATOR_CHECK', 'CI_RETRY'],
    ['CI_RETRY', 'ANALYZE'],
    ['CI_RETRY', 'EXHAUSTED'],
    ['EXHAUSTED', 'HUMAN'],
  ];

  it.each(validTransitions)('%s -> %s is valid', (from, to) => {
    expect(canTransition(from as 'IDLE', to as 'HUMAN')).toBe(true);
  });
});

describe('Gate-S21: blocked transitions', () => {
  const invalidTransitions: [string, string][] = [
    ['IDLE', 'GUARDIAN_CHECK'],
    ['IDLE', 'HUMAN'],
    ['ANALYZE', 'IDLE'],
    ['COACH', 'HUMAN'],
    ['JULES_PENDING', 'IDLE'],
    ['HUMAN', 'ANALYZE'],
    ['EXHAUSTED', 'ANALYZE'],
  ];

  it.each(invalidTransitions)('%s -> %s returns false', (from, to) => {
    expect(canTransition(from as 'IDLE', to as 'HUMAN')).toBe(false);
  });

  it.each(invalidTransitions)('%s -> %s throws via assertValidTransition', (from, to) => {
    expect(() => assertValidTransition(from as 'IDLE', to as 'HUMAN')).toThrow(
      `Invalid repair state transition: ${from} -> ${to}`
    );
  });
});

describe('Gate-S21: terminal rules', () => {
  it('HUMAN is terminal', () => {
    expect(isTerminalRepairState('HUMAN')).toBe(true);
  });

  it('EXHAUSTED is not terminal', () => {
    expect(isTerminalRepairState('EXHAUSTED')).toBe(false);
  });

  it('IDLE is not terminal', () => {
    expect(isTerminalRepairState('IDLE')).toBe(false);
  });
});

describe('Gate-S21: allowed-next-state lookup', () => {
  it('CI_RETRY returns [ANALYZE, EXHAUSTED]', () => {
    const next = getAllowedNextStates('CI_RETRY');
    expect([...next]).toEqual(['ANALYZE', 'EXHAUSTED']);
  });

  it('EXHAUSTED returns [HUMAN]', () => {
    const next = getAllowedNextStates('EXHAUSTED');
    expect([...next]).toEqual(['HUMAN']);
  });

  it('HUMAN returns []', () => {
    const next = getAllowedNextStates('HUMAN');
    expect(next).toEqual([]);
  });
});

describe('Gate-S21: architecture guard behavior', () => {
  it('EXHAUSTED must only lead to HUMAN', () => {
    const next = getAllowedNextStates('EXHAUSTED');
    expect(next).toHaveLength(1);
    expect(next[0]).toBe('HUMAN');
  });

  it('HUMAN must not transition anywhere', () => {
    const next = getAllowedNextStates('HUMAN');
    expect(next).toHaveLength(0);
  });
});
