/**
 * DC-9: Human Decision Console view models.
 * Read-only; local UI state only. No mutation authority.
 */

export type DecisionOptionViewModel = {
  id: 'approve' | 'reject' | 'escalate'
  label: string
  description: string
}

export type DecisionSummaryViewModel = {
  title: string
  body: string
}

export type RiskLevelViewModel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'

export type DecisionViewModel = {
  heading: string
  gptAnalysis: DecisionSummaryViewModel
  repairStrategy: DecisionSummaryViewModel
  riskLevel: RiskLevelViewModel
  operatorPrompt: string
  options: DecisionOptionViewModel[]
}
