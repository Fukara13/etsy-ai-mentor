/**
 * Gate-S21: Repair State Machine Engine.
 * Transition policy and validation. No events, no execution.
 */

export const REPAIR_STATE_SEQUENCE = [
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

export type RepairState = (typeof REPAIR_STATE_SEQUENCE)[number];

const ALLOWED_TRANSITIONS: ReadonlyMap<RepairState, readonly RepairState[]> = new Map([
  ['IDLE', ['ANALYZE']],
  ['ANALYZE', ['COACH']],
  ['COACH', ['JULES_PENDING']],
  ['JULES_PENDING', ['GUARDIAN_CHECK']],
  ['GUARDIAN_CHECK', ['EVALUATOR_CHECK']],
  ['EVALUATOR_CHECK', ['CI_RETRY']],
  ['CI_RETRY', ['ANALYZE', 'EXHAUSTED']],
  ['EXHAUSTED', ['HUMAN']],
  ['HUMAN', []],
]);

/** Returns allowed next states in deterministic order. */
export function getAllowedNextStates(state: RepairState): readonly RepairState[] {
  return ALLOWED_TRANSITIONS.get(state) ?? [];
}

/** Returns true iff transition from -> to is allowed. */
export function canTransition(from: RepairState, to: RepairState): boolean {
  const allowed = ALLOWED_TRANSITIONS.get(from) ?? [];
  return allowed.includes(to);
}

/** Throws if transition is invalid. */
export function assertValidTransition(from: RepairState, to: RepairState): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid repair state transition: ${from} -> ${to}`);
  }
}

/** HUMAN is terminal. EXHAUSTED is not (must move to HUMAN). */
export function isTerminalRepairState(state: RepairState): boolean {
  return state === 'HUMAN';
}
