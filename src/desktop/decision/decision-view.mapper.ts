/**
 * DC-9: Map DecisionView to DecisionViewModel.
 * Deterministic, no side effects, safe fallbacks.
 */

import type { DecisionView } from '../../shared/read-models'
import type { DecisionViewModel, RiskLevelViewModel } from './decision.view-model'

function normalizeRisk(risk: string | undefined): RiskLevelViewModel {
  if (!risk || typeof risk !== 'string') return 'UNKNOWN'
  const s = risk.trim().toLowerCase()
  if (s === 'low') return 'LOW'
  if (s === 'medium') return 'MEDIUM'
  if (s === 'high') return 'HIGH'
  if (s === 'critical') return 'HIGH'
  return 'UNKNOWN'
}

const DEFAULT_OPTIONS = [
  { id: 'approve' as const, label: 'Approve Strategy', description: 'Accept the AI-recommended repair strategy.' },
  { id: 'reject' as const, label: 'Reject Strategy', description: 'Reject the strategy and stop this repair flow.' },
  { id: 'escalate' as const, label: 'Escalate to Manual', description: 'Hand off to human for manual intervention.' },
]

export function mapDecisionViewModel(input: DecisionView | null): DecisionViewModel {
  if (!input) {
    return {
      heading: 'Human Decision Console',
      gptAnalysis: { title: 'Root Cause', body: 'No GPT analysis available.' },
      repairStrategy: { title: 'Recommended Strategy', body: 'No repair strategy available.' },
      riskLevel: 'UNKNOWN',
      operatorPrompt: 'Review the AI output and choose the next human action.',
      options: [...DEFAULT_OPTIONS],
    }
  }
  return {
    heading: 'Human Decision Console',
    gptAnalysis: {
      title: input.gptAnalysisTitle ?? 'Root Cause',
      body: input.gptAnalysisBody ?? 'No GPT analysis available.',
    },
    repairStrategy: {
      title: input.repairStrategyTitle ?? 'Recommended Strategy',
      body: input.repairStrategyBody ?? 'No repair strategy available.',
    },
    riskLevel: normalizeRisk(input.riskLevel),
    operatorPrompt: input.operatorPrompt ?? 'Review the AI output and choose the next human action.',
    options: [...DEFAULT_OPTIONS],
  }
}
