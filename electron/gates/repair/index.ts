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

export {
  buildJulesPatchRequest,
  integrateJules,
} from './jules-integration';
export type {
  JulesPatchRequest,
  JulesIntegrationResult,
  JulesMode,
} from './jules-integration';

/** Gate-S12: Orchestrator Bridge */
export { runOrchestratorBridge } from './orchestrator-bridge';
export { normalizeEvent } from './event-normalizer';
export { resolveContext } from './context-resolver';
export type {
  CanonicalRepairEvent,
  CanonicalEventType,
  BridgeContext,
  BridgeResult,
  ActionPlanItem,
  BridgeIdempotencyGuard,
  RawCIFailureInput,
} from './bridge-types';
export type { BridgeInput } from './orchestrator-bridge';
export type { RawEventInput, NormalizeResult } from './event-normalizer';
export type { ContextResolverInput, ResolveContextResult } from './context-resolver';

/** Gate-S13: Controlled Execution Boundary */
export { toExecutableSteps } from './execution-boundary';
export type {
  ActionPlanActionType,
  ActionPlanItemS13,
  ActionPlan,
} from './action-plan';
export type {
  ExecutableStepKind,
  KnownWorkflowKey,
  WorkflowPayload,
  ExecutableStep,
} from './executable-step';
export type {
  ExecutionBoundaryStatus,
  ExecutionBoundaryResult,
} from './execution-boundary';

/** Gate-S14: Repair Observability Layer */
export * from './repair-trace';
export * from './trace-context';
export * from './repair-logger';
export * from './repair-telemetry';

/** Gate-S15: Repair Decision Intelligence Layer */
export { classifyFailure } from './failure-classifier';
export { selectRepairStrategy } from './repair-strategy';
export { buildRepairDecision } from './repair-decision';
export type { FailureClass, FailureSignal } from './failure-classifier';
export type { RepairStrategy } from './repair-strategy';
export type { RepairDecision } from './repair-decision';

/** Gate-S16: Decision Integration Layer */
export { decisionToActionPlan } from './decision-plan-adapter';

/** Gate-S17: Plan Validation Layer */
export { validateActionPlan } from './plan-validator';
export type { PlanValidationResult } from './plan-validator';
