/**
 * Gate-S19: State transition — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { transition } from './state-transition';

describe('Gate-S19: valid state transitions — canonical path', () => {
  it('IDLE + CI_FAILURE_START -> ANALYZE', () => {
    expect(transition('IDLE', 'CI_FAILURE_START')).toBe('ANALYZE');
  });

  it('ANALYZE + ANALYSIS_COMPLETED -> COACH', () => {
    expect(transition('ANALYZE', 'ANALYSIS_COMPLETED')).toBe('COACH');
  });

  it('COACH + COACH_COMPLETED -> JULES_PENDING', () => {
    expect(transition('COACH', 'COACH_COMPLETED')).toBe('JULES_PENDING');
  });

  it('JULES_PENDING + JULES_FROZEN_OUTCOME -> HUMAN', () => {
    expect(transition('JULES_PENDING', 'JULES_FROZEN_OUTCOME')).toBe('HUMAN');
  });

  it('JULES_PENDING + JULES_PATCH_PRODUCED -> GUARDIAN_CHECK', () => {
    expect(transition('JULES_PENDING', 'JULES_PATCH_PRODUCED')).toBe('GUARDIAN_CHECK');
  });

  it('GUARDIAN_CHECK + GUARDIAN_COMPLETED -> EVALUATOR_CHECK', () => {
    expect(transition('GUARDIAN_CHECK', 'GUARDIAN_COMPLETED')).toBe('EVALUATOR_CHECK');
  });

  it('EVALUATOR_CHECK + EVALUATOR_PASSED -> HUMAN', () => {
    expect(transition('EVALUATOR_CHECK', 'EVALUATOR_PASSED')).toBe('HUMAN');
  });

  it('EVALUATOR_CHECK + EVALUATOR_FAILED -> CI_RETRY', () => {
    expect(transition('EVALUATOR_CHECK', 'EVALUATOR_FAILED')).toBe('CI_RETRY');
  });

  it('CI_RETRY + RETRY_LIMIT_REACHED -> EXHAUSTED', () => {
    expect(transition('CI_RETRY', 'RETRY_LIMIT_REACHED')).toBe('EXHAUSTED');
  });

  it('EXHAUSTED is self-terminal', () => {
    expect(transition('EXHAUSTED', 'HUMAN_ESCALATION')).toBe('EXHAUSTED');
    expect(transition('EXHAUSTED', 'CI_FAILURE_START')).toBe('EXHAUSTED');
  });

  it('CI_RETRY + CI_RETRY_COMPLETED -> ANALYZE', () => {
    expect(transition('CI_RETRY', 'CI_RETRY_COMPLETED')).toBe('ANALYZE');
  });
});

describe('Gate-S19: invalid transitions fail safe to HUMAN', () => {
  it('IDLE + unknown event -> HUMAN', () => {
    expect(transition('IDLE', 'ANALYSIS_COMPLETED')).toBe('HUMAN');
  });

  it('ANALYZE + invalid event -> HUMAN', () => {
    expect(transition('ANALYZE', 'CI_FAILURE_START')).toBe('HUMAN');
  });

  it('COACH + invalid event -> HUMAN', () => {
    expect(transition('COACH', 'CI_FAILURE_START')).toBe('HUMAN');
  });
});

describe('Gate-S19: escalation events route to HUMAN', () => {
  it('ANALYZE + HUMAN_ESCALATION -> HUMAN', () => {
    expect(transition('ANALYZE', 'HUMAN_ESCALATION')).toBe('HUMAN');
  });

  it('COACH + PLAN_REQUIRES_HUMAN -> HUMAN', () => {
    expect(transition('COACH', 'PLAN_REQUIRES_HUMAN')).toBe('HUMAN');
  });

  it('EVALUATOR_CHECK + RETRY_LIMIT_REACHED -> EXHAUSTED', () => {
    expect(transition('EVALUATOR_CHECK', 'RETRY_LIMIT_REACHED')).toBe('EXHAUSTED');
  });
});
