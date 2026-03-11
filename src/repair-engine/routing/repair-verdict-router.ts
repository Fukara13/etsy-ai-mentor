/**
 * RE-6: Pure verdict router. Transforms verdict results into operator decisions.
 */

import type { RepairVerdictResult } from '../contracts/repair-verdict-result'
import type {
  RepairOperatorDecision,
  RepairOperatorAction,
  RepairOperatorActionType,
} from './repair-operator-decision'

function makeAction(
  actionType: RepairOperatorActionType,
  label: string,
  description: string,
  recommended: boolean
): RepairOperatorAction {
  return {
    id: actionType,
    label,
    description,
    actionType,
    recommended,
  }
}

export class RepairVerdictRouter {
  route(verdictResult: RepairVerdictResult): RepairOperatorDecision {
    const { verdict, evaluation, recommendedStrategyType } = verdictResult
    const base = {
      repairItemId: evaluation.itemId,
      verdict,
      summary: evaluation.summary,
      riskLevel: evaluation.riskLevel,
      confidence: evaluation.confidence,
      recommendedStrategyType:
        recommendedStrategyType != null ? String(recommendedStrategyType) : undefined,
      reasonCodes: [...evaluation.reasonCodes],
    }

    switch (verdict) {
      case 'strategy_ready':
        return {
          ...base,
          actions: [
            makeAction(
              'apply_strategy',
              'Apply recommended strategy',
              'Apply the suggested repair strategy after review.',
              true
            ),
            makeAction(
              'investigate_manually',
              'Investigate manually',
              'Conduct manual investigation instead.',
              false
            ),
          ],
        }

      case 'manual_investigation':
        return {
          ...base,
          actions: [
            makeAction(
              'investigate_manually',
              'Investigate manually',
              'Perform manual investigation and decision.',
              true
            ),
          ],
        }

      case 'blocked':
        return {
          ...base,
          actions: [
            makeAction(
              'investigate_manually',
              'Investigate manually',
              'Investigate why the item is blocked.',
              true
            ),
            makeAction(
              'escalate_to_human',
              'Escalate to human',
              'Escalate for human resolution.',
              false
            ),
          ],
        }

      case 'insufficient_signal':
        return {
          ...base,
          actions: [
            makeAction(
              'wait_for_signal',
              'Wait for more signal',
              'Wait for additional input before deciding.',
              true
            ),
            makeAction(
              'investigate_manually',
              'Investigate manually',
              'Proceed with manual investigation.',
              false
            ),
          ],
        }

      case 'escalate':
        return {
          ...base,
          actions: [
            makeAction(
              'escalate_to_human',
              'Escalate to human',
              'Escalate for human decision.',
              true
            ),
          ],
        }

      default: {
        const _: never = verdict
        return { ...base, actions: [] }
      }
    }
  }
}
