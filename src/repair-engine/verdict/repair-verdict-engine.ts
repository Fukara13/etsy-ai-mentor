/**
 * RE-5: Pure verdict engine. Rule-based, deterministic.
 */

import type { RepairItem } from '../queue/repair-item'
import type { RepairStrategyType } from '../contracts/repair-strategy-type'
import type { RepairVerdictReasonCode } from '../contracts/repair-verdict-reason-code'
import type { RepairEvaluationInput } from '../contracts/repair-evaluation-input'
import type {
  RepairEvaluation,
  RepairEvaluationRiskLevel,
} from '../contracts/repair-evaluation'
import type { RepairVerdictResult } from '../contracts/repair-verdict-result'
import type { RepairVerdictDecision } from '../contracts/repair-verdict-decision'

const TERMINAL_STATUSES = ['completed', 'blocked'] as const

function isTerminalStatus(status: RepairItem['status']): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status)
}

function hasManualInvestigation(candidates: RepairItem['strategyCandidates']): boolean {
  return candidates.some((c) => c.strategy.type === 'manual_investigation')
}

export function evaluateRepairItemForVerdict(
  input: RepairEvaluationInput
): RepairVerdictResult {
  const item = input.item

  // Rule 1: Status must be 'processing'
  if (item.status !== 'processing') {
    const reasonCode: RepairVerdictReasonCode = isTerminalStatus(item.status)
      ? 'ITEM_ALREADY_TERMINAL'
      : 'ITEM_NOT_PROCESSING'
    return buildResult('blocked', item, {
      dominantStrategyType: null,
      riskLevel: 'medium',
      confidence: 0,
      reasonCodes: [reasonCode],
      summary: `Item status ${item.status} is not eligible for verdict evaluation.`,
    })
  }

  // Rule 2: No strategy candidates
  if (item.strategyCandidates.length === 0) {
    return buildResult('insufficient_signal', item, {
      dominantStrategyType: null,
      riskLevel: 'medium',
      confidence: 0.5,
      reasonCodes: ['NO_STRATEGY_CANDIDATES', 'INSUFFICIENT_INPUT_SIGNAL'],
      summary: 'No strategy candidates available for verdict.',
    })
  }

  // Rule 3: Any manual_investigation strategy
  if (hasManualInvestigation(item.strategyCandidates)) {
    return buildResult('manual_investigation', item, {
      dominantStrategyType: 'manual_investigation',
      riskLevel: 'high',
      confidence: 0.9,
      reasonCodes: ['MANUAL_STRATEGY_PRESENT'],
      summary: 'Manual investigation strategy present; human review required.',
    })
  }

  // Rule 4: Exactly one non-manual strategy
  if (item.strategyCandidates.length === 1) {
    const strategyType = item.strategyCandidates[0].strategy.type
    return buildResult('strategy_ready', item, {
      dominantStrategyType: strategyType,
      riskLevel: 'low',
      confidence: 0.85,
      reasonCodes: ['READY_FOR_STRATEGY_REVIEW'],
      summary: 'Single strategy candidate ready for human review.',
      recommendedStrategyType: strategyType,
    })
  }

  // Rule 5: Multiple strategy candidates
  return buildResult('manual_investigation', item, {
    dominantStrategyType: null,
    riskLevel: 'medium',
    confidence: 0.7,
    reasonCodes: ['MULTIPLE_STRATEGIES_PRESENT'],
    summary: 'Multiple strategy candidates; human selection required.',
  })
}

function buildResult(
  verdict: RepairVerdictDecision,
  item: RepairItem,
  opts: {
    dominantStrategyType: RepairStrategyType | null
    riskLevel: RepairEvaluationRiskLevel
    confidence: number
    reasonCodes: RepairVerdictReasonCode[]
    summary: string
    recommendedStrategyType?: RepairStrategyType | null
  }
): RepairVerdictResult {
  const evaluation: RepairEvaluation = {
    itemId: item.id,
    status: item.status,
    lifecycleState: item.lifecycleState,
    strategyCount: item.strategyCandidates.length,
    dominantStrategyType: opts.dominantStrategyType,
    riskLevel: opts.riskLevel,
    confidence: opts.confidence,
    reasonCodes: [...opts.reasonCodes],
    summary: opts.summary,
  }
  return {
    verdict,
    evaluation,
    recommendedStrategyType: opts.recommendedStrategyType ?? null,
  }
}
