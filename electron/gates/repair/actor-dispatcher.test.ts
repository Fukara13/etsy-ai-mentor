/**
 * Gate-S19: Actor dispatcher — Deterministic tests.
 */

import { describe, it, expect } from 'vitest';
import { dispatch } from './actor-dispatcher';

describe('Gate-S19: state maps to expected actor intent', () => {
  it('IDLE -> NONE', () => {
    expect(dispatch('IDLE')).toEqual({ type: 'NONE' });
  });

  it('ANALYZE -> RUN_ANALYZER', () => {
    expect(dispatch('ANALYZE')).toEqual({ type: 'RUN_ANALYZER' });
  });

  it('COACH -> RUN_COACH', () => {
    expect(dispatch('COACH')).toEqual({ type: 'RUN_COACH' });
  });

  it('JULES_PENDING -> RUN_JULES_FROZEN', () => {
    expect(dispatch('JULES_PENDING')).toEqual({ type: 'RUN_JULES_FROZEN' });
  });

  it('GUARDIAN_CHECK -> RUN_GUARDIAN', () => {
    expect(dispatch('GUARDIAN_CHECK')).toEqual({ type: 'RUN_GUARDIAN' });
  });

  it('EVALUATOR_CHECK -> RUN_EVALUATOR', () => {
    expect(dispatch('EVALUATOR_CHECK')).toEqual({ type: 'RUN_EVALUATOR' });
  });

  it('CI_RETRY -> DISPATCH_CI_RETRY', () => {
    expect(dispatch('CI_RETRY')).toEqual({ type: 'DISPATCH_CI_RETRY' });
  });
});

describe('Gate-S19: no unsafe execution intents', () => {
  it('JULES_PENDING returns RUN_JULES_FROZEN not patch execution', () => {
    const intent = dispatch('JULES_PENDING');
    expect(intent.type).toBe('RUN_JULES_FROZEN');
    expect(intent.type).not.toBe('RUN_JULES_PATCH');
  });

  it('no merge or deploy intents exist', () => {
    const states = [
      'IDLE', 'ANALYZE', 'COACH', 'JULES_PENDING',
      'GUARDIAN_CHECK', 'EVALUATOR_CHECK', 'CI_RETRY', 'EXHAUSTED', 'HUMAN',
    ] as const;
    for (const s of states) {
      const i = dispatch(s);
      expect(['RUN_ANALYZER', 'RUN_COACH', 'RUN_JULES_FROZEN', 'RUN_GUARDIAN', 'RUN_EVALUATOR', 'DISPATCH_CI_RETRY', 'NONE']).toContain(i.type);
    }
  });
});

describe('Gate-S19: terminal states do not dispatch actor', () => {
  it('EXHAUSTED -> NONE', () => {
    expect(dispatch('EXHAUSTED')).toEqual({ type: 'NONE' });
  });

  it('HUMAN -> NONE', () => {
    expect(dispatch('HUMAN')).toEqual({ type: 'NONE' });
  });
});
