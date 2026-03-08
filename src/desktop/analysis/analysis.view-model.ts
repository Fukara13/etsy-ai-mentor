/**
 * DC-7: Read-only view models for analysis surfaces.
 * Reasoning visibility only; no execution authority.
 */

export type GPTAnalysisViewModel = {
  title: string
  failureType: string
  rootCause: string
  confidence: string
  affectedFiles: string[]
  summary?: string
  status: 'ready' | 'empty'
}

export type RepairStrategyViewModel = {
  title: string
  proposedSteps: string[]
  expectedResult: string
  riskLevel?: string
  notes?: string
  status: 'ready' | 'empty'
}
