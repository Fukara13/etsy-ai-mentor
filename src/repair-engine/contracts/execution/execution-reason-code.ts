export type ExecutionReasonCode =
  | 'strategy_selected'
  | 'no_strategy_found'
  | 'retry_limit_reached'
  | 'operator_required'
  | 'manual_investigation'
  | 'system_abort'
  | 'unknown';

