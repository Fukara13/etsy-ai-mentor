/**
 * RE-5: Structured deterministic evaluation from verdict engine.
 */

import type { RepairItemStatus } from '../queue/repair-item-status'
import type { RepairLifecycleState } from './repair-lifecycle-state'
import type { RepairStrategyType } from './repair-strategy-type'
import type { RepairVerdictReasonCode } from './repair-verdict-reason-code'
import type { ConfidenceLevel } from './confidence/confidence-level'

export type RepairEvaluationRiskLevel = 'low' | 'medium' | 'high'

export type RepairEvaluation = {
  readonly itemId: string
  readonly status: RepairItemStatus
  readonly lifecycleState: RepairLifecycleState
  readonly strategyCount: number
  readonly dominantStrategyType: RepairStrategyType | null
  readonly riskLevel: RepairEvaluationRiskLevel
  readonly confidence: number
  readonly confidenceLevel?: ConfidenceLevel
  readonly reasonCodes: readonly RepairVerdictReasonCode[]
  readonly summary: string
}
