/**
 * Gate-S19: Event-driven repair state machine runtime.
 */

import type { RepairState } from './repair-state';
import type { RepairEvent } from './repair-event';
import type { ActorIntent } from './actor-dispatcher';
import { transition } from './state-transition';
import { dispatch } from './actor-dispatcher';
import { isTerminalState } from './repair-state';

export type StepResult = {
  readonly nextState: RepairState;
  readonly intent: ActorIntent;
  readonly terminal: boolean;
};

const INITIAL_STATE: RepairState = 'IDLE';

/** Process one step: transition then dispatch. */
export function step(state: RepairState, event: RepairEvent): StepResult {
  const nextState = transition(state, event);
  const intent = dispatch(nextState);
  const terminal = isTerminalState(nextState);
  return { nextState, intent, terminal };
}

export type ActorExecutor = (
  intent: ActorIntent,
  state: RepairState
) => RepairEvent | null;

/** Run until terminal. Executor provides next event from actor outcome. */
export function runLoop(
  initialEvent: RepairEvent,
  actorExecutor: ActorExecutor
): RepairState {
  let state: RepairState = INITIAL_STATE;
  let event: RepairEvent | null = initialEvent;

  while (event !== null) {
    const { nextState, intent, terminal } = step(state, event);
    if (terminal) return nextState;

    event = actorExecutor(intent, nextState);
    state = nextState;

    if (event === null) return 'HUMAN';
  }

  return 'HUMAN';
}

export { INITIAL_STATE };
