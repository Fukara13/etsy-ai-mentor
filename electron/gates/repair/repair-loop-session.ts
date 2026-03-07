/**
 * Gate-S23: Repair loop session — Bounded run lifecycle.
 */

import type { RepairState } from './repair-state';
import type { StepExecutionResult } from './repair-step-executor';

export type RepairLoopSession = {
  readonly sessionId: string;
  readonly initialState: RepairState;
  currentState: RepairState;
  stepCount: number;
  readonly maxSteps: number;
  visitedStates: RepairState[];
  requiresHuman: boolean;
  halted: boolean;
  terminal: boolean;
  exhaustionReached: boolean;
  readonly startedAt: string;
  endedAt: string | null;
  lastStepResult: StepExecutionResult | null;
  terminationReason: string | null;
};

export function createSession(
  sessionId: string,
  initialState: RepairState,
  maxSteps: number
): RepairLoopSession {
  return {
    sessionId,
    initialState,
    currentState: initialState,
    stepCount: 0,
    maxSteps,
    visitedStates: [initialState],
    requiresHuman: false,
    halted: false,
    terminal: false,
    exhaustionReached: false,
    startedAt: new Date().toISOString(),
    endedAt: null,
    lastStepResult: null,
    terminationReason: null,
  };
}
