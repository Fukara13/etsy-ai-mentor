/**
 * Gate-S13: Action Plan Model
 * Policy-safe action vocabulary for the execution boundary.
 * Conservative: retry_ci, request_human_intervention, noop only.
 */

/** Allowed action types. No merge, deploy, delete, or privileged actions. */
export type ActionPlanActionType =
  | 'retry_ci'
  | 'request_human_intervention'
  | 'noop';

/** Single action plan item. */
export type ActionPlanItemS13 = {
  readonly action: ActionPlanActionType;
  readonly reason?: string;
  readonly sourceContext?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

/** Action plan — input to the controlled execution boundary. */
export type ActionPlan = {
  readonly items: readonly ActionPlanItemS13[];
};
