/**
 * RE-5: Verdict engine output.
 */

import type { RepairVerdictDecision } from './repair-verdict-decision'
import type { RepairEvaluation } from './repair-evaluation'
import type { RepairStrategyType } from './repair-strategy-type'

export type RepairVerdictResult = {
  readonly verdict: RepairVerdictDecision
  readonly evaluation: RepairEvaluation
  readonly recommendedStrategyType: RepairStrategyType | null
}
