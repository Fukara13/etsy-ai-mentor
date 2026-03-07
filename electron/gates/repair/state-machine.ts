/**
 * Gate-S10: Repair Loop State Machine
 * State-driven pipeline: CI FAIL -> Analyzer -> Coach -> Jules -> Guardian -> Evaluator -> CI retry -> Human.
 * No merge path. Human remains final authority.
 */

import type {
  AnalyzerResult,
  CoachResult,
  JulesStepResult,
  GuardianDecision,
  EvaluatorDecision,
  RepairLoopState,
  RetryState,
} from './types';
import {
  createRetryState,
  incrementRetry,
  isExhausted,
  getExhaustionMessage,
} from './retry-controller';

/** Transition: CI FAIL enters Analyze state. */
export function ciFailToAnalyze(): RepairLoopState {
  return { phase: 'ANALYZE', ciFailed: true };
}

/** Transition: Analyzer result -> Coach phase. */
export function analyzerToCoach(analyzer: AnalyzerResult): RepairLoopState {
  return { phase: 'COACH', analyzer };
}

/** Transition: Coach result -> Jules pending. */
export function coachToJulesPending(coach: CoachResult): RepairLoopState {
  return { phase: 'JULES_PENDING', coach };
}

/**
 * Transition: Jules frozen -> JULES_FROZEN.
 * No real patch created. Patch is null. Flow remains under Human final authority.
 */
export function julesFrozen(julesResult: JulesStepResult, retry: RetryState): RepairLoopState {
  return { phase: 'JULES_FROZEN', julesResult, retry };
}

/** Transition: Jules frozen -> Human. Final authority. No merge. */
export function julesFrozenToHuman(retry: RetryState): RepairLoopState {
  return { phase: 'HUMAN', retry };
}

/** Transition: Jules produced patch -> Guardian check. */
export function julesToGuardian(patchSummary?: string): RepairLoopState {
  return { phase: 'GUARDIAN_CHECK', patchSummary };
}

/** Transition: Guardian result -> Evaluator check. */
export function guardianToEvaluator(guardian: GuardianDecision): RepairLoopState {
  return { phase: 'EVALUATOR_CHECK', guardian };
}

/**
 * Transition: Evaluator result -> CI retry, EXHAUSTED, or Human.
 * If evaluator passed -> Human (success). No retry increment.
 * If evaluator failed -> increment retry. At 3/3 -> EXHAUSTED; else CI_RETRY.
 */
export function evaluatorToNext(
  evaluator: EvaluatorDecision,
  retry: RetryState
): RepairLoopState {
  if (evaluator.passed) {
    return { phase: 'HUMAN', retry };
  }
  const nextRetry = incrementRetry(retry);
  if (isExhausted(nextRetry)) {
    return {
      phase: 'EXHAUSTED',
      retry: nextRetry,
      message: getExhaustionMessage(),
    };
  }
  return { phase: 'CI_RETRY', evaluator, retry: nextRetry };
}

/** Transition: Exhausted or Human handoff. */
export function toHuman(retry: RetryState): RepairLoopState {
  return { phase: 'HUMAN', retry };
}

/** Create initial retry state for pipeline. */
export function initialRetryState(): RetryState {
  return createRetryState();
}
