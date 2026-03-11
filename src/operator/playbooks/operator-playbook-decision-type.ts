/**
 * RE-8: Operator playbook decision type.
 */

export type OperatorPlaybookDecisionType =
  | 'strategy_ready'
  | 'manual_investigation'
  | 'insufficient_signal'
  | 'escalate'
  | 'blocked'
