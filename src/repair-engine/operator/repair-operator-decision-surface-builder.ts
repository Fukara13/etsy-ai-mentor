/**
 * RE-7: Pure builder for operator decision surface. Deterministic transformation.
 */

import type { RepairOperatorDecision } from '../routing/repair-operator-decision'
import type {
  RepairOperatorDecisionSurface,
  RepairOperatorActionType,
} from './repair-operator-decision-surface'

const HEADLINE_BY_VERDICT: Record<string, string> = {
  strategy_ready: 'Repair strategy recommended',
  manual_investigation: 'Manual investigation required',
  blocked: 'Repair item blocked',
  insufficient_signal: 'Waiting for additional signal',
  escalate: 'Escalation to human operator required',
}

const GUIDANCE_BY_ACTION: Record<RepairOperatorActionType, string> = {
  apply_strategy: 'Review the proposed repair strategy before approval.',
  investigate_manually: 'Manual investigation recommended. Inspect logs and test output.',
  wait_for_signal: 'System recommends waiting for additional signals.',
  escalate_to_human: 'Escalation required due to high uncertainty.',
}

const DESTRUCTIVE_ACTIONS: RepairOperatorActionType[] = ['escalate_to_human']

function isDestructive(type: RepairOperatorActionType): boolean {
  return (DESTRUCTIVE_ACTIONS as string[]).includes(type)
}

export function buildRepairOperatorDecisionSurface(
  decision: RepairOperatorDecision
): RepairOperatorDecisionSurface {
  const recommendedAction = decision.actions.find((a) => a.recommended)
  const recommendedActionType = (recommendedAction?.actionType ?? 'investigate_manually') as RepairOperatorActionType

  const headline = HEADLINE_BY_VERDICT[decision.verdict] ?? 'Operator decision required'
  const operatorGuidance: string[] = [GUIDANCE_BY_ACTION[recommendedActionType]]

  const actions = decision.actions.map((a) => ({
    type: a.actionType,
    label: a.label,
    description: a.description,
    recommended: a.recommended,
    destructive: isDestructive(a.actionType),
  }))

  const reasonCodes = decision.reasonCodes ? [...decision.reasonCodes] : []

  return {
    headline,
    summary: decision.summary,
    analysis: decision.summary,
    recommendedActionType,
    actions,
    riskLevel: decision.riskLevel,
    confidence: decision.confidence,
    confidenceLevel: decision.confidenceLevel,
    reasonCodes,
    operatorGuidance,
  }
}
