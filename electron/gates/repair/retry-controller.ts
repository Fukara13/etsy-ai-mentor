/**
 * Gate-S10: Retry Controller
 * Retry accounting with max=3. At 3/3, automation stops and exhaustion message is emitted.
 */

import type { RetryState } from './types';
import { EXHAUSTION_MESSAGE } from './types';

const MAX_ATTEMPTS = 3 as const;

/** Create initial retry state. */
export function createRetryState(): RetryState {
  return { attempt: 0, maxAttempts: 3, exhausted: false };
}

/** Increment retry count. Returns new state. Does not mutate. */
export function incrementRetry(state: RetryState): RetryState {
  const next = Math.min(state.attempt + 1, MAX_ATTEMPTS);
  const exhausted = next >= MAX_ATTEMPTS;
  return { attempt: next, maxAttempts: 3, exhausted };
}

/** Check if automation must stop (3/3). */
export function isExhausted(state: RetryState): boolean {
  return state.exhausted && state.attempt >= MAX_ATTEMPTS;
}

/** Get the canonical exhaustion message. Emitted exactly when 3/3. */
export function getExhaustionMessage(): string {
  return EXHAUSTION_MESSAGE;
}

/** Whether another retry is allowed. */
export function canRetry(state: RetryState): boolean {
  return state.attempt < MAX_ATTEMPTS;
}
