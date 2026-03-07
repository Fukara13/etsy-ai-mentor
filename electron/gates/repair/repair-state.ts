/**
 * Gate-S19: Canonical repair runtime states.
 * Aligned with RepairLoopState phases.
 */

export const REPAIR_STATES = [
  'IDLE',
  'ANALYZE',
  'COACH',
  'JULES_PENDING',
  'GUARDIAN_CHECK',
  'EVALUATOR_CHECK',
  'CI_RETRY',
  'EXHAUSTED',
  'HUMAN',
] as const;

export type RepairState = (typeof REPAIR_STATES)[number];

export const TERMINAL_STATES: readonly RepairState[] = ['EXHAUSTED', 'HUMAN'];

export function isTerminalState(state: RepairState): boolean {
  return state === 'EXHAUSTED' || state === 'HUMAN';
}
