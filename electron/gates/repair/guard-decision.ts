/**
 * Gate-S20: Guard decision model.
 */

export type GuardOutcome = 'allow' | 'block' | 'require_human';

export type GuardReasonCode =
  | 'safe_to_execute'
  | 'unknown_action'
  | 'state_action_mismatch'
  | 'retry_limit_reached'
  | 'forbidden_privilege'
  | 'governance_conflict'
  | 'terminal_state_protection'
  | 'unknown_risk';

export type GuardDecision = {
  readonly outcome: GuardOutcome;
  readonly reasonCode: GuardReasonCode;
  readonly details: string;
};
