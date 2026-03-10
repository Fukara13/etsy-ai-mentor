/**
 * RE-1: Repair transition contract.
 * Legal state transitions for the repair state machine.
 */

import type { RepairLifecycleState } from './repair-lifecycle-state'

export type RepairTransition = {
  from: RepairLifecycleState
  to: RepairLifecycleState
}

/**
 * All explicitly legal transitions.
 * No other transitions are legal.
 */
export const REPAIR_LEGAL_TRANSITIONS: readonly RepairTransition[] = [
  { from: 'IDLE', to: 'FAILURE_DETECTED' },
  { from: 'FAILURE_DETECTED', to: 'ANALYZING' },
  { from: 'ANALYZING', to: 'STRATEGY_READY' },
  { from: 'ANALYZING', to: 'ESCALATED' },
  { from: 'STRATEGY_READY', to: 'AWAITING_HUMAN_REVIEW' },
  { from: 'STRATEGY_READY', to: 'ESCALATED' },
  { from: 'AWAITING_HUMAN_REVIEW', to: 'APPROVED' },
  { from: 'AWAITING_HUMAN_REVIEW', to: 'REJECTED' },
  { from: 'AWAITING_HUMAN_REVIEW', to: 'ESCALATED' },
  { from: 'APPROVED', to: 'CLOSED' },
  { from: 'REJECTED', to: 'CLOSED' },
  { from: 'ESCALATED', to: 'CLOSED' },
]
