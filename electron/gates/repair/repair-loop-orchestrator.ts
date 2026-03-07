/**
 * Gate-S23: Bounded repair loop orchestrator.
 */

import type { RepairState } from './repair-state';
import type { RepairRunOutcome, TerminationReason } from './repair-run-outcome';
import type { RepairLoopSession } from './repair-loop-session';
import { executeRepairStep } from './repair-step-executor';
import { createSession } from './repair-loop-session';
import { shouldStop, DEFAULT_MAX_STEPS } from './repair-loop-policy';
import { createRepairTraceId } from './repair-trace';

export type LoopRunInput = {
  readonly initialState: RepairState;
  readonly retryCount?: number;
  readonly maxRetries?: number;
  readonly maxSteps?: number;
  readonly sessionId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

function countVisits(states: readonly RepairState[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of states) {
    m.set(s, (m.get(s) ?? 0) + 1);
  }
  return m;
}

function toOutcome(session: RepairLoopSession): RepairRunOutcome {
  const endedAt = session.endedAt ?? new Date().toISOString();
  const last = session.lastStepResult;

  let terminationReason: TerminationReason = 'halted';
  if (session.terminationReason) {
    terminationReason = session.terminationReason as TerminationReason;
  }

  return {
    sessionId: session.sessionId,
    initialState: session.initialState,
    finalState: session.currentState,
    totalSteps: session.stepCount,
    visitedPath: [...session.visitedStates],
    halted: session.halted,
    terminal: session.terminal,
    requiresHuman: session.requiresHuman,
    exhaustionReached: session.exhaustionReached,
    terminationReason,
    lastTransitionEvent: last?.transitionEvent ?? null,
    lastActor: last?.actor ?? 'None',
    startedAt: session.startedAt,
    endedAt,
  };
}

export function runBoundedRepairLoop(input: LoopRunInput): RepairRunOutcome {
  const {
    initialState,
    retryCount = 0,
    maxRetries = 3,
    maxSteps = DEFAULT_MAX_STEPS,
    sessionId = createRepairTraceId(),
    metadata,
  } = input;

  const session = createSession(sessionId, initialState, maxSteps);

  let currentRetryCount = retryCount;

  while (true) {
    const ctx = {
      currentState: session.currentState,
      retryCount: currentRetryCount,
      maxRetries,
      metadata,
    };

    const stepResult = executeRepairStep(ctx);

    session.stepCount += 1;
    session.lastStepResult = stepResult;
    session.currentState = stepResult.nextState;
    session.visitedStates.push(stepResult.nextState);
    session.requiresHuman = stepResult.requiresHuman;
    session.halted = stepResult.halted;
    session.terminal = stepResult.terminal;

    if (stepResult.nextState === 'EXHAUSTED') {
      session.exhaustionReached = true;
    }

    if (stepResult.transitionEvent === 'CI_RETRY_COMPLETED') {
      currentRetryCount = Math.min(currentRetryCount + 1, maxRetries);
    }

    const visitCounts = countVisits(session.visitedStates);
    const { stop, reason } = shouldStop(
      stepResult,
      session.stepCount,
      session.maxSteps,
      visitCounts
    );

    if (stop) {
      session.endedAt = new Date().toISOString();
      session.terminationReason = reason;
      if (reason === 'cycle_suspicion' || reason === 'max_steps') {
        session.requiresHuman = true;
      }
      return toOutcome(session);
    }
  }
}
