/**
 * Gate-S13: Executable Step Model
 * Only actions the execution layer is allowed to run.
 * Narrow and policy-safe.
 */

/** Executable step kinds. */
export type ExecutableStepKind = 'dispatch_workflow';

/** Known internal workflow keys. */
export type KnownWorkflowKey = 'retry_ci';

/** Bounded safe payload for workflow dispatch. */
export type WorkflowPayload = {
  readonly prNumber?: number;
  readonly correlationId?: string;
};

/** Single executable step. */
export type ExecutableStep = {
  readonly kind: ExecutableStepKind;
  readonly workflow: KnownWorkflowKey;
  readonly payload?: WorkflowPayload;
};
