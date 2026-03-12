/**
 * RE-6: Operator-facing decision model.
 */

import type { ConfidenceLevel } from '../contracts/confidence/confidence-level'

export const REPAIR_OPERATOR_ACTION_TYPES = [
  'apply_strategy',
  'investigate_manually',
  'wait_for_signal',
  'escalate_to_human',
] as const

export type RepairOperatorActionType = (typeof REPAIR_OPERATOR_ACTION_TYPES)[number]

export type RepairOperatorAction = {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly actionType: RepairOperatorActionType
  readonly recommended: boolean
}

export type RepairOperatorDecision = {
  readonly repairItemId: string
  readonly verdict: string
  readonly summary: string
  readonly riskLevel: 'low' | 'medium' | 'high'
  readonly confidence: number
  readonly confidenceLevel?: ConfidenceLevel
  readonly recommendedStrategyType?: string
  readonly reasonCodes?: readonly string[]
  readonly actions: readonly RepairOperatorAction[]
}
