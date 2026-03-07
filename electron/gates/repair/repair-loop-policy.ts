/**
 * Gate-S23: Loop policy — Bounded stop conditions.
 */

import type { StepExecutionResult } from './repair-step-executor';

export const DEFAULT_MAX_STEPS = 50;
export const CYCLE_SUSPICION_THRESHOLD = 3;

export function shouldStop(
  stepResult: StepExecutionResult,
  stepCount: number,
  maxSteps: number,
  stateVisitCount: ReadonlyMap<string, number>
): { stop: boolean; reason: string } {
  if (stepResult.terminal || stepResult.nextState === 'HUMAN') {
    return {
      stop: true,
      reason: stepResult.requiresHuman ? 'requires_human' : 'terminal_state',
    };
  }

  if (stepResult.halted) {
    return { stop: true, reason: 'halted' };
  }

  if (stepResult.requiresHuman) {
    return { stop: true, reason: 'requires_human' };
  }

  if (stepResult.normalizedResult.blocked) {
    return { stop: true, reason: 'blocked' };
  }

  if (stepCount >= maxSteps) {
    return { stop: true, reason: 'max_steps' };
  }

  const countBefore = stateVisitCount.get(stepResult.nextState) ?? 0;
  if (countBefore + 1 >= CYCLE_SUSPICION_THRESHOLD) {
    return { stop: true, reason: 'cycle_suspicion' };
  }

  if (stepResult.nextState === 'EXHAUSTED') {
    return { stop: false, reason: '' };
  }

  return { stop: false, reason: '' };
}
