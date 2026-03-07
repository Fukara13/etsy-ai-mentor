/**
 * Gate-S19: Actor dispatcher. Maps state to bounded actor intent.
 * Does not execute. Does not choose next state.
 */

import type { RepairState } from './repair-state';
import { isTerminalState } from './repair-state';

export type ActorIntent =
  | { readonly type: 'RUN_ANALYZER' }
  | { readonly type: 'RUN_COACH' }
  | { readonly type: 'RUN_JULES_FROZEN' }
  | { readonly type: 'RUN_GUARDIAN' }
  | { readonly type: 'RUN_EVALUATOR' }
  | { readonly type: 'DISPATCH_CI_RETRY' }
  | { readonly type: 'NONE' };

/** Dispatch actor intent for state. Terminal states return NONE. */
export function dispatch(state: RepairState): ActorIntent {
  if (isTerminalState(state)) return { type: 'NONE' };

  switch (state) {
    case 'IDLE':
      return { type: 'NONE' };
    case 'ANALYZE':
      return { type: 'RUN_ANALYZER' };
    case 'COACH':
      return { type: 'RUN_COACH' };
    case 'JULES_PENDING':
      return { type: 'RUN_JULES_FROZEN' };
    case 'GUARDIAN_CHECK':
      return { type: 'RUN_GUARDIAN' };
    case 'EVALUATOR_CHECK':
      return { type: 'RUN_EVALUATOR' };
    case 'CI_RETRY':
      return { type: 'DISPATCH_CI_RETRY' };
    case 'EXHAUSTED':
    case 'HUMAN':
      return { type: 'NONE' };
    default: {
      const _: never = state;
      return { type: 'NONE' };
    }
  }
}
