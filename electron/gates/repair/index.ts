/**
 * Gate-S10: Autonomous Repair Loop — Control Layer
 * Orchestration and contracts only. No Memory Keeper. No merge.
 * Single write actor = Jules. Final authority = Human.
 */

export type {
  AnalyzerResult,
  CoachResult,
  JulesStepResult,
  GuardianDecision,
  EvaluatorDecision,
  RetryState,
  RepairLoopState,
} from './types';

export { createJulesFrozenResult } from './types';

export {
  EXHAUSTION_MESSAGE,
  WRITE_ACTOR,
} from './types';

export {
  createRetryState,
  incrementRetry,
  isExhausted,
  getExhaustionMessage,
  canRetry,
} from './retry-controller';

export {
  ciFailToAnalyze,
  analyzerToCoach,
  coachToJulesPending,
  julesFrozen,
  julesFrozenToHuman,
  julesToGuardian,
  guardianToEvaluator,
  evaluatorToNext,
  toHuman,
  initialRetryState,
} from './state-machine';

export { runGuardian } from './guardian';
export type { GuardianInput } from './guardian';

export { runEvaluator } from './evaluator';
export type { EvaluatorInput } from './evaluator';
